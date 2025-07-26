import { useEffect } from 'react';

/**
 * 自定义 Hook，用于锁定页面滚动，特别适用于移动设备
 * @param {boolean} lock - 是否锁定滚动，默认为 true
 */
const useBodyScrollLock = (lock = true) => {
  useEffect(() => {
    // 设置视口高度变量
    const setViewportHeight = () => {
      // 获取视口实际高度
      const vh = window.innerHeight * 0.01;
      // 设置 CSS 变量
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // 初始设置视口高度
    setViewportHeight();

    // 滚动锁定函数
    const lockScroll = () => {
      // 保存当前滚动位置
      const scrollY = window.scrollY;
      
      // 应用固定定位并设置顶部位置，防止滚动时内容跳动
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflowY = 'hidden';
      document.body.style.touchAction = 'none';
      document.documentElement.style.overflow = 'hidden';
      
      // 存储滚动位置以便后续恢复
      document.body.dataset.scrollY = scrollY;
    };

    // 解锁滚动函数
    const unlockScroll = () => {
      // 恢复正常滚动
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflowY = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
      
      // 恢复滚动位置
      const scrollY = parseInt(document.body.dataset.scrollY || '0', 10);
      window.scrollTo(0, scrollY);
    };

    // 监听窗口大小变化，重新计算视口高度
    window.addEventListener('resize', setViewportHeight);

    // 根据参数锁定或解锁滚动
    if (lock) {
      lockScroll();
    }

    // 清理函数
    return () => {
      if (lock) {
        unlockScroll();
      }
      window.removeEventListener('resize', setViewportHeight);
    };
  }, [lock]);
};

export default useBodyScrollLock; 