# APK 连接后端服务指南（Sentencease / 2024-07-25）

> 本文总结了在 Tauri-Android 打包完成后，让移动端前端正确访问 Go 后端 API 的全部要点。

---
## 1. 确保后端可被手机访问

| 场景 | 后端地址示例 | 说明 |
|------|--------------|------|
| Android 模拟器 (AVD) | `http://10.0.2.2:8080` | 模拟器把宿主机 `localhost` 映射为 `10.0.2.2` |
| 真机 + 同一 Wi-Fi | `http://192.168.1.5:8080` | 用电脑局域网 IP；放行防火墙 |
| 生产 / 公网 | `https://api.sentencease.com` | 推荐 HTTPS；不限网络 |

> 如使用 Docker Compose，在服务器上运行 `backend + postgres` 服务即可。

---
## 2. 告诉前端正确的 API 根

前端 `frontend/src/services/api.js`：
```js
baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'
```

### 步骤
1. 在 **构建前** 设置环境变量，例如：
   ```bash
   set VITE_API_URL=https://api.sentencease.com/api/v1
   ```
   或在 `frontend/.env.prod` 写入同名变量。
2. 重新打包前端
   ```bash
   cd frontend
   npm run build --mode prod
   ```
3. 回到 `Sentencease` 目录，重新生成 APK
   ```bash
   npm run tauri android build
   ```
生成的 APK 将内嵌固定 API 地址。

---
## 3. Android 对 HTTP 与 HTTPS 的差异
* Android 9+ 默认禁用明文 HTTP。
* Tauri 模板已在 `network_security_config.xml` 开启全域明文流量；如仍报 `CLEARTEXT_NOT_PERMITTED`，在 `AndroidManifest.xml` 的 `<application>` 标签加：
  ```xml
  android:usesCleartextTraffic="true"
  ```
* 生产环境建议使用 HTTPS 以避免安全警告。

---
## 4. 后端需启用 CORS
Go-Gin 示例：
```go
router.Use(cors.New(cors.Config{
    AllowOrigins: []string{"https://app.sentencease.com", "http://192.168.1.5:5173"},
    AllowMethods: []string{"GET", "POST", "PUT", "DELETE"},
    AllowHeaders: []string{"Origin", "Content-Type", "Authorization"},
}))
```
确保移动端请求不会被浏览器 WebView 拒绝。

---
## 5. 流程回顾
1. 后端部署并确认可达。
2. `VITE_API_URL` 指向后端；重新 `vite build`。
3. `npm run tauri android build` 生成 APK。
4. 安装测试：
   ```bash
   adb install -r src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk
   ```
5. 如仍连不上，检查
   * 设备网络
   * CORS 日志
   * 后端是否监听正确地址 / 端口 