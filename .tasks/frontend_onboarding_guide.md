# 句读(SentenCease)前端开发指南

## 1. 项目概述

句读(SentenCease)是一个使用间隔重复记忆(SRS)方法帮助用户学习英语词汇的应用。前端采用现代化技术栈构建，专注于提供流畅的用户体验，包括响应式设计和渐进式Web应用(PWA)支持，使其能够在各种设备上高效运行并支持离线使用。

### 核心功能

- 用户认证与注册系统
- 词汇浏览与选择界面
- 基于卡片的单词学习界面
- 间隔重复算法实现
- 学习进度追踪
- 离线学习支持

## 2. 技术栈

### 核心框架与库
- **React 18** - UI框架
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **React Router v6** - 客户端路由

### 其他重要依赖
- **Axios** - API请求
- **Vite PWA Plugin** - PWA功能支持
- **React Context** - 状态管理

## 3. 项目结构

```
frontend/
├── public/                # 静态资源
│   ├── manifest.webmanifest  # PWA配置文件
│   └── pwa-assets/       # PWA图标和资源
├── src/
│   ├── components/        # 可重用组件
│   │   ├── Button.jsx        # 按钮组件
│   │   ├── Input.jsx         # 输入框组件
│   │   ├── Header.jsx        # 应用头部
│   │   ├── SwipeCard.jsx     # 单词卡片组件
│   │   └── ...
│   ├── hooks/             # 自定义React hooks
│   │   ├── useBodyScrollLock.js
│   │   ├── useDeviceDetect.js
│   │   └── useSwipeGesture.js   # 滑动手势处理
│   ├── pages/             # 页面组件
│   │   ├── HomePage.jsx
│   │   ├── LearnPage.jsx      # 学习界面
│   │   ├── LoginPage.jsx
│   │   └── ...
│   ├── routes/            # 路由配置
│   │   └── index.jsx
│   ├── services/          # API服务和工具
│   │   ├── api.js            # API请求封装
│   │   ├── offlineStorage.js  # 离线数据存储
│   │   └── pwaService.js     # PWA相关功能
│   ├── store/             # 状态管理
│   │   └── authStore.js      # 认证状态
│   ├── App.jsx            # 应用入口组件
│   ├── main.jsx           # 应用入口文件
│   └── index.css          # 全局CSS
├── index.html             # HTML模板
├── vite.config.js         # Vite配置
├── tailwind.config.js     # Tailwind配置
└── package.json           # 项目依赖和脚本
```

## 4. 环境设置

### 开发环境配置

1. **克隆仓库并安装依赖**
   ```bash
   git clone https://github.com/blueberrycongee/SentenCease.git
   cd SentenCease/frontend
   npm install
   ```

2. **启动开发服务器**
   ```bash
   npm run dev
   ```
   应用将在 http://localhost:5173 运行

3. **构建生产版本**
   ```bash
   npm run build
   ```

4. **Docker环境** (可选)
   ```bash
   # 在项目根目录运行
   docker-compose up -d frontend
   ```

### 环境变量

项目使用`.env`文件配置环境变量。开发中使用`.env.development`，生产环境使用`.env.production`。

主要环境变量：
- `VITE_API_BASE_URL` - 后端API地址
- `VITE_APP_VERSION` - 应用版本

## 5. 核心组件详解

### 5.1 SwipeCard组件

这是应用程序最核心的组件之一，用于展示单词卡片并处理学习交互。

```jsx
<SwipeCard
  onSwipeLeft={() => handleReview('认识')}
  onSwipeRight={() => handleReview('不认识')}
  onSwipeUp={() => handleReview('模糊')}
  disabled={!isRevealed}
  onClick={() => setIsRevealed(true)}
>
  {/* 卡片内容 */}
</SwipeCard>
```

关键特性：
- 支持左右上滑动手势（认识/不认识/模糊）
- 自定义动画和转场效果
- 适用于触摸设备和桌面环境
- 使用了硬件加速以提高动画性能

### 5.2 认证组件

用户认证流程通过`AuthLayout`和`ProtectedRoute`组件实现：

```jsx
<Route element={<AuthLayout />}>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
</Route>

<Route element={<ProtectedRoute />}>
  <Route path="/learn" element={<LearnPage />} />
</Route>
```

认证状态通过`authStore`管理，使用React Context实现跨组件共享。

### 5.3 PWA相关组件

`InstallPrompt`和`NetworkStatus`组件管理PWA安装提示和网络状态指示：

```jsx
<NetworkStatus /> {/* 显示在线/离线状态 */}
<InstallPrompt /> {/* PWA安装提示 */}
```

## 6. 页面路由

应用使用React Router v6管理路由：

| 路径 | 组件 | 描述 | 权限 |
|------|------|------|------|
| `/` | `HomePage` | 应用首页 | 公开 |
| `/login` | `LoginPage` | 用户登录 | 公开 |
| `/register` | `RegisterPage` | 用户注册 | 公开 |
| `/learn` | `LearnPage` | 学习界面 | 需登录 |
| `/select-words` | `SelectWordsPage` | 词汇选择 | 需登录 |

路由配置位于`src/routes/index.jsx`。

## 7. 状态管理

项目主要使用React Context API进行状态管理：

```jsx
// 使用示例
const { user, login, logout } = useAuth();
```

主要状态包括：
- **认证状态** (`authStore.js`)
- **学习进度** (通过API和本地存储维护)
- **UI状态** (组件内使用useState管理)

## 8. API集成

### API服务

API请求通过`src/services/api.js`处理，使用axios实现：

```javascript
// API调用示例
const data = await api.get('/learn/next-word');
await api.post('/learn/review', { meaningId, userChoice });
```

### 离线支持

离线功能通过`offlineStorage.js`实现：

```javascript
// 缓存单词数据
await offlineStorage.cacheWord(wordData);

// 存储学习进度
await offlineStorage.storeProgress(progressData);

// 同步离线数据
await api.syncPendingReviews();
```

## 9. 样式指南

### Tailwind使用

项目使用Tailwind CSS实现样式：

```jsx
// 示例组件
<div className="bg-white rounded-2xl shadow-xl p-6 max-w-xl mx-auto">
  <h2 className="text-2xl font-bold text-gray-800">标题</h2>
  <p className="mt-4 text-gray-600">内容...</p>
</div>
```

### 响应式设计

使用Tailwind断点进行响应式设计：

```jsx
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* 在移动设备上占满宽度，在md屏幕占一半，在lg屏幕占三分之一 */}
</div>
```

主要断点:
- `sm`: 640px+
- `md`: 768px+
- `lg`: 1024px+
- `xl`: 1280px+

### 移动端优化

专门为移动设备优化的样式和交互：

```jsx
// 条件渲染示例
{isMobile ? (
  <MobileComponent />
) : (
  <DesktopComponent />
)}

// 类名条件应用
<div className={`${isMobile ? 'p-4 text-sm' : 'p-8 text-base'}`}>
  内容...
</div>
```

## 10. PWA功能

应用支持PWA，关键文件:
- `manifest.webmanifest` - PWA清单
- `vite.config.js`中的PWA配置
- Service Worker由Vite PWA插件自动生成

主要功能：
- 可添加到主屏幕
- 离线支持
- 后台同步
- 推送通知(计划中)

## 11. 测试指南

目前前端测试框架正在建立中。计划使用以下工具:
- Vitest - 单元测试
- React Testing Library - 组件测试
- Cypress - E2E测试

## 12. 开发规范

### 代码风格

- 使用ESLint和Prettier保持代码风格一致
- 遵循函数式组件和React Hooks模式
- 优先使用命名导出而非默认导出

### 命名约定

- 组件使用大驼峰命名(PascalCase): `SwipeCard.jsx`
- 工具和hooks使用小驼峰(camelCase): `useSwipeGesture.js`
- CSS类名使用kebab-case: `card-container`

### Git工作流

- 特性开发使用`feature/`分支前缀
- 修复使用`fix/`分支前缀
- 提交信息遵循约定式提交规范

## 13. 常见问题和解决方案

### 跨域问题

开发环境中可能遇到跨域问题，Vite配置了代理:

```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://backend:8080',
      changeOrigin: true,
    },
  },
},
```

### 移动端动画性能

为保证移动设备的动画流畅度:
- 使用CSS transform代替绝对定位
- 使用`will-change`属性优化渲染
- 使用`useCallback`和`useMemo`优化重渲染

### PWA更新

通知用户应用更新的示例代码:

```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // 通知用户刷新页面获取更新
  });
}
```

## 14. 下一步开发计划

以下功能正在计划开发中:
- 邮件验证功能
- 更丰富的学习统计
- 学习提醒系统
- 数据可视化
- 社交学习功能

## 15. 资源链接

- [项目GitHub仓库](https://github.com/blueberrycongee/SentenCease)
- [React官方文档](https://react.dev/)
- [Vite官方文档](https://vitejs.dev/)
- [Tailwind CSS文档](https://tailwindcss.com/docs)
- [React Router文档](https://reactrouter.com/) 