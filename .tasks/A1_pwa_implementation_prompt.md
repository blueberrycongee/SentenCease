# 句读项目PWA实现方案 - AI开发提示

## 项目背景

句读（SentenCease）是一个基于React的英语词汇学习应用，具有以下特点：
- 基于科学的间隔重复（SRS）算法，实现智能单词记忆
- 使用Go后端（Gin框架）和PostgreSQL数据库
- 前端使用React、Vite和TailwindCSS
- 目前为web应用，需转化为PWA以支持移动端使用

## 当前项目结构

项目使用前后端分离架构：
- 前端：`/frontend` 目录，基于React+Vite
- 后端：`/backend` 目录，基于Go+Gin
- 数据库：PostgreSQL，通过Docker Compose管理

前端主要页面包括：
- 登录/注册页面
- 首页仪表板
- 学习页面（LearnPage.jsx）
- 单词选择页面（SelectWordsPage.jsx）

## 当前相关代码

Vite配置 (`frontend/vite.config.js`):
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, 
    proxy: {
      '/api': {
        target: 'http://backend:8080',
        changeOrigin: true,
      },
    },
  },
})
```

## 目标

将现有的React Web应用改造为功能完善的PWA，使其：
1. 支持离线使用（缓存核心资源和用户数据）
2. 可添加至移动设备主屏幕
3. 提供近似原生应用的体验
4. 适应不同设备尺寸
5. 支持推送通知（可选）

## 实施任务

### 1. 安装必要依赖

需要添加的NPM包：
- vite-plugin-pwa
- workbox-window

### 2. 配置Vite PWA插件

需创建/修改以下文件：
- 更新 `vite.config.js` 添加PWA插件配置
- 创建或更新manifest配置
- 配置Service Worker策略

### 3. 创建PWA资源

需要创建的图标资源：
- 网站图标（不同尺寸，特别是192x192和512x512）
- 启动画面配置

### 4. 实现离线支持

需要实现的功能：
- 关键路由的离线缓存
- 用户学习数据的本地存储
- 网络恢复后的数据同步机制

### 5. 优化移动端体验

需要改进的UI元素：
- 触摸手势支持（特别是学习卡片的滑动交互）
- 自适应布局优化
- 添加"添加到主屏幕"引导

## 技术要求

- PWA实现需符合现代标准
- 兼容主流移动浏览器（Safari、Chrome）
- 代码要符合项目现有风格和最佳实践
- 考虑内存和电池消耗优化

## 交付物

1. 更新后的 `vite.config.js`
2. 完整的manifest配置
3. 配置好的Service Worker
4. PWA资源文件（图标等）
5. 任何需要修改的React组件文件
6. 详细实施步骤文档

## 实施建议

建议采用渐进式实施策略：
1. 首先添加基础PWA配置和资源
2. 然后实现核心缓存策略
3. 接着添加离线数据处理
4. 最后优化移动端特定功能

请提供详细的实施计划，包括具体的代码修改和配置示例。 