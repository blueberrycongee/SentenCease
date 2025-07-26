import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Header from './components/Header';
import NetworkStatus from './components/NetworkStatus';
import InstallPrompt from './components/InstallPrompt';
import pwaService from './services/pwaService';
import './App.css';

function App() {
  const location = useLocation();
  const noHeaderPaths = ['/login', '/register'];
  const showHeader = !noHeaderPaths.includes(location.pathname);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // 注册 Service Worker
    if ('serviceWorker' in navigator) {
      pwaService.register();

      // 设置更新可用的回调
      pwaService.setUpdateAvailableHandler(isAvailable => {
        setUpdateAvailable(isAvailable);
      });
    }
  }, []);

  const handleUpdate = () => {
    pwaService.update().catch(err => {
      console.error('更新 Service Worker 失败:', err);
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F5F7] text-gray-800 font-sans">
      {showHeader && <Header />}
      <main className={`flex-grow flex items-center justify-center ${showHeader ? 'pt-20' : ''}`}>
        <div className="w-full max-w-4xl mx-auto p-4">
          <Outlet />
        </div>
      </main>
      
      {/* PWA 更新提示 */}
      {updateAvailable && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50">
          <div className="flex items-center">
            <span className="mr-4">有新版本可用！</span>
            <button 
              onClick={handleUpdate}
              className="px-4 py-1 bg-white text-blue-600 rounded hover:bg-blue-100"
            >
              更新
            </button>
          </div>
        </div>
      )}
      
      {/* 网络状态指示器 */}
      <NetworkStatus />
      
      {/* 安装提示 */}
      <InstallPrompt />
    </div>
  );
}

export default App;
