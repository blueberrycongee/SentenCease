import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import router from './routes'
import './index.css'

// 设置动态视口高度，解决移动端100vh问题
const setViewportHeight = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

// 初始设置
setViewportHeight();

// 监听窗口大小和方向变化
window.addEventListener('resize', setViewportHeight);
window.addEventListener('orientationchange', setViewportHeight);

// 确保禁用严格模式，避免在开发环境下重复注册service worker
ReactDOM.createRoot(document.getElementById('root')).render(
  <RouterProvider router={router} />
)
