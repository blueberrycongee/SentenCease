import { useState, useEffect } from 'react';
import pwaService from '../services/pwaService';

const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    setIsInstalled(pwaService.isInstalled());

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (event) => {
      // Prevent Chrome 76+ from automatically showing the prompt
      event.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(event);
      // Show the prompt UI after some delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000); // 5 second delay
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      // Clear the deferred prompt variable
      setDeferredPrompt(null);
    });
    
    setShowPrompt(false);
  };

  // Don't show prompt if already installed or if not eligible for installation
  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg border-t border-gray-200 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <img
            src="/pwa-assets/icons/icon-192x192.png"
            alt="SentenCease"
            className="w-12 h-12 mr-3"
          />
          <div>
            <h3 className="font-bold text-gray-900">安装SentenCease</h3>
            <p className="text-sm text-gray-600">添加到主屏幕以便快速访问</p>
          </div>
        </div>
        <div className="flex items-center">
          <button
            onClick={() => setShowPrompt(false)}
            className="text-gray-500 mr-3"
            aria-label="关闭"
          >
            以后再说
          </button>
          <button
            onClick={handleInstallClick}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            安装
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt; 