# 句读 (SentenCease)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

句读是一个现代化的单词学习应用，通过优雅的界面和科学的间隔重复记忆算法，帮助用户高效地记忆单词。

![应用预览](https://raw.githubusercontent.com/username/sentencease/main/docs/images/preview.png)

## 特性

- ✨ **沉浸式学习体验**：通过精心设计的UI/UX，提供专注且愉悦的单词学习环境
- 🔄 **智能间隔重复**：基于科学的SRS（间隔重复系统）算法，优化记忆效率
- 📱 **响应式设计**：完美支持各种设备，从手机到桌面
- 🌈 **直观的学习进度**：清晰展示每日学习目标和完成情况
- 📊 **数据驱动学习**：跟踪学习数据，智能调整学习计划
- 🎮 **交互式卡片**：精美的卡片设计和流畅的过渡动画

## 技术栈

### 前端
- React.js
- Tailwind CSS
- Vite

### 后端
- Go
- PostgreSQL
- RESTful API

## 安装

### 前提条件
- Node.js (v16+)
- Go (v1.18+)
- PostgreSQL (v13+)

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/your-username/sentencease.git
cd sentencease
```

2. 安装前端依赖
```bash
cd frontend
npm install
```

3. 安装后端依赖
```bash
cd ../backend
go mod download
```

4. 设置数据库
```bash
cd cmd/migration
go run main.go
```

5. 启动后端服务
```bash
cd ../server
go run main.go
```

6. 启动前端服务
```bash
cd ../../frontend
npm run dev
```

7. 访问应用
```
http://localhost:5173
```

## 使用指南

### 选择词库
1. 登录后进入选词页面
2. 选择词库来源
3. 设定每日学习目标
4. 选择需要学习的单词

### 学习模式
1. 查看例句，尝试理解单词含义
2. 点击卡片揭示单词释义
3. 根据记忆程度选择"认识"、"模糊"或"不认识"
4. 系统会根据你的选择自动安排复习计划

### 复习功能
- 点击左侧卡片可以回到上一个单词
- 右侧卡片预览下一个即将学习的单词
- 顶部进度条显示当前学习进度

## 项目结构

```
sentencease/
├── frontend/         # 前端React应用
│   ├── src/          # 源代码
│   │   ├── components/  # React组件
│   │   ├── pages/       # 页面组件
│   │   ├── services/    # API服务
│   │   └── styles/      # CSS样式
│   └── public/       # 静态资源
├── backend/          # Go后端服务
│   ├── cmd/          # 命令行工具
│   │   ├── migration/   # 数据库迁移
│   │   └── server/      # 服务器启动
│   ├── internal/     # 内部包
│   │   ├── api/         # API处理
│   │   ├── auth/        # 认证
│   │   ├── database/    # 数据库操作
│   │   └── srs/         # 间隔重复系统
│   └── data/         # 词库数据
└── docs/             # 文档
```

## 贡献指南

欢迎提交问题和拉取请求。对于重大更改，请先打开一个issue讨论您想要更改的内容。

贡献步骤：

1. Fork该项目
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开Pull Request

## 许可证

此项目根据MIT许可证授权 - 查看[LICENSE](LICENSE)文件了解详情。

## 致谢

- 感谢所有为本项目做出贡献的开发者
- 特别感谢[OpenAI](https://openai.com/)提供的技术支持
- 词库数据部分来源于公开语料库

## 联系方式

项目维护者 - your-email@example.com

项目链接：[https://github.com/your-username/sentencease](https://github.com/your-username/sentencease)
