import { useState, useEffect } from 'react';

const useDeviceDetect = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  useEffect(() => {
    const checkDevice = () => {
      // 检查是否是触摸设备
      const touchDevice = (('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (navigator.msMaxTouchPoints > 0));
      
      // 检查屏幕宽度
      const width = window.innerWidth;
      const newIsMobile = width < 768; // 小于768px为手机
      const newIsTablet = width >= 768 && width < 1024; // 768-1024为平板
      const newIsDesktop = width >= 1024; // 大于1024为桌面
      
      setIsMobile(newIsMobile);
      setIsTablet(newIsTablet);
      setIsDesktop(newIsDesktop);
      setIsTouchDevice(touchDevice);
    };
    
    // 初始检测
    checkDevice();
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkDevice);
    
    // 清理
    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []);
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice
  };
};

export default useDeviceDetect; 