import { useState, useEffect } from 'react';

const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showStatus) return null;

  return (
    <div className={`fixed bottom-4 left-0 right-0 mx-auto w-80 rounded-lg p-3 shadow-lg transition-all duration-300 z-50 ${
      isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      <div className="flex items-center">
        <div className={`h-3 w-3 rounded-full mr-2 ${
          isOnline ? 'bg-green-500' : 'bg-red-500'
        }`}></div>
        <p className="text-sm font-medium">
          {isOnline
            ? '连接已恢复 - 您的学习数据将会自动同步'
            : '离线模式 - 您仍然可以继续学习，稍后将自动同步'}
        </p>
        {showStatus && isOnline && (
          <button
            className="ml-auto text-green-600 hover:text-green-800"
            onClick={() => setShowStatus(false)}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default NetworkStatus; 