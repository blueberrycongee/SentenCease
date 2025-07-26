import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import router from './routes'
import './index.css'

// 确保禁用严格模式，避免在开发环境下重复注册service worker
ReactDOM.createRoot(document.getElementById('root')).render(
  <RouterProvider router={router} />
)
