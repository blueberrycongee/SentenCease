# Task: 将 Web 应用打包为安卓 App

## 1. 项目背景与目标

**项目名称**: Sentencease

**核心技术栈**:
- **后端**: Go (Gin)
- **前端**: React (Vite) + Tailwind CSS
- **数据库**: PostgreSQL
- **架构**: 前后端分离的 Web 应用

**当前状态**:
项目目前是一个功能完善的 Web 应用，用户可以通过浏览器访问并使用全部功能，包括用户注册/登录、多词库选择、以及基于 SRS（间隔重复系统）的核心单词学习流程。前端界面经过多轮迭代，交互逻辑清晰，视觉风格现代。

**核心目标**:
将现有的 React Web 应用封装成一个独立的安卓 `.apk` 文件，使其能够在安卓设备上原生安装和运行。此举旨在提升用户在移动设备上的访问便利性和体验，并为未来在各大应用商店上架打下基础。

**最终交付物**:
一个可以正常安装和运行在现代安卓设备（Android 10+）上的已签名或未签名的 `.apk` 安装包。

---

## 2. 核心挑战与技术选型

将 Web 应用打包成原生移动应用，主要的技术挑战在于选择一个合适的打包工具/框架。这个框架需要在Web技术（HTML, CSS, JavaScript）和原生平台（Android）之间架起一座桥梁。

目前主流的方案有以下几种：

- **Tauri**: 一个现代化的应用构建框架，使用 Rust 作为后端，并利用操作系统的原生 WebView 来渲染前端界面。它以其轻量、安全和高性能而著称。对于我们的项目，前端可以直接复用，但需要引入 Rust 工具链来处理打包和原生API调用。
- **Capacitor**: 由 Ionic 团队开发，是 Cordova 的现代继任者。它允许将任何现代 Web 应用（React, Vue, Angular等）转换为原生 iOS 和 Android 项目。它对现有 Web 项目的侵入性较低，并且拥有一个丰富的插件生态系统来访问原生功能。
- **React Native for Web**: 允许在 React Native 和 Web 之间共享代码。这个方案更适用于从零开始就计划跨多端的项目，对于我们已经成型的 Web 应用来说，迁移成本较高。
- **Cordova**: 一个历史悠久的框架，但目前社区活跃度有所下降，Capacitor 在很多方面被认为是其更好的替代品。

**技术选型决策**:

**推荐方案: Tauri**

**理由**:
1.  **性能与体积**: Tauri 应用的最终打包体积非常小，且运行时性能接近原生，因为它直接利用了系统提供的 WebView2 (Windows)、WKWebView (macOS/iOS) 和 WebView (Android/Linux)，而没有捆绑一个完整的浏览器引擎（如 Electron）。
2.  **安全性**: Tauri 的核心设计理念之一是安全。所有对原生系统的访问都必须在 Rust 核心中明确配置和授权，这提供了一个更安全的沙箱环境。
3.  **开发体验**: 它与前端框架（如 React）的集成非常顺畅。前端开发流程基本保持不变，同时可以通过 Rust 来暴露强大的原生功能。虽然需要引入 Rust，但对于打包任务而言，大部分复杂的配置都由 Tauri CLI 自动处理。
4.  **现代化与未来**: Tauri 是一个非常活跃和现代化的项目，社区支持良好，符合我们项目追求现代技术栈的理念。

---

## 3. 任务执行规划 (Prompt)

您好，AI 助手。请根据以下规划，帮助我将现有的 React Web 应用打包成一个安卓 App。

**[MODE: PLAN]**

**1. 环境准备与项目初始化**
   - **1.1**: 检查并指导我安装所有必要的系统依赖，包括 `Microsoft Visual Studio C++ build tools`、`WebView2` (如果在Windows上)、`Node.js` 以及 `Rust` (通过 `rustup`)。
   - **1.2**: 在现有的 `words` 项目根目录下，使用 `npm create tauri-app@latest` 命令来初始化 Tauri。
   - **1.3**: 在初始化过程中，请为我选择最合适的配置：
     - **App name**: `Sentencease`
     - **Window title**: `Sentencease`
     - **UI recipe**: 选择 `dist` 目录，并将其路径配置为 `../frontend/dist` (相对于 `src-tauri` 目录)。
     - **Dev server URL**: `http://localhost:5173` (我们 Vite 前端的开发服务器地址)。
   - **1.4**: 指导我安装安卓开发环境，包括 `Android Studio`、`Android SDK`、`NDK` 和配置必要的环境变量 (`JAVA_HOME`, `ANDROID_HOME`)。
   - **1.5**: 使用 `rustup` 添加安卓编译目标，例如: `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`。

**2. Tauri 配置**
   - **2.1**: 打开 `src-tauri/tauri.conf.json` 文件。
   - **2.2**: 修改 `build.distDir` 为 `../frontend/dist`，确保 Tauri 能找到我们 React 应用的构建产物。
   - **2.3**: 修改 `build.devPath` 为 `http://localhost:5173`，确保在开发模式下 Tauri 能正确加载前端内容。
   - **2.4**: 在 `tauri.bundle` 配置中，设置 `identifier` 为一个唯一的应用标识符，例如 `com.sentencease.app`。
   - **2.5**: (可选，但推荐) 为应用配置图标。请指导我生成不同尺寸的图标文件，并更新 `tauri.bundle.icon` 配置。

**3. 开发与构建**
   - **3.1**: 运行 `npm run tauri android init` 来初始化 Tauri 的安卓项目。
   - **3.2**: 运行 `npm run tauri android dev` 来启动开发模式。此模式下，应该能在一个安卓模拟器或连接的物理设备上看到我们的应用。前端代码的任何改动都应该能够热更新。
   - **3.3**: 解决在开发过程中可能出现的任何跨域（CORS）问题或原生API调用问题。
   - **3.4**: 一旦开发和测试完成，运行 `npm run tauri android build` 来生成最终的 `.apk` 安装包。

**4. 最终验证**
   - **4.1**: 指导我找到生成的 `.apk` 文件（通常位于 `src-tauri/target/release/android/` 目录下）。
   - **4.2**: 确认该 `.apk` 文件可以被成功安装到一个安卓模拟器或物理设备上，并且应用可以正常启动和使用。

**[MODE: EXECUTE]**
请从 **步骤 1.1** 开始，逐步引导我完成整个流程。 