// 滑动手势处理自定义Hook
import { useState, useEffect } from 'react';

const useSwipeGesture = (elementRef, options = {}) => {
  const {
    onSwipeLeft = () => {},
    onSwipeRight = () => {},
    onSwipeUp = () => {},
    onSwipeDown = () => {},
    threshold = 50, // 滑动距离阈值（像素）
    preventDefaultTouchMove = true // 默认阻止滚动行为，改为 true
  } = options;

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isActive, setIsActive] = useState(false);

  // 处理触摸开始事件
  const handleTouchStart = (e) => {
    // 阻止事件冒泡，避免触发父元素的滚动
    e.stopPropagation();
    
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      time: Date.now()
    });
    setIsActive(true);
  };

  // 处理触摸移动事件
  const handleTouchMove = (e) => {
    // 始终阻止默认行为，防止页面滚动
    if (preventDefaultTouchMove) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  // 处理触摸结束事件
  const handleTouchEnd = (e) => {
    // 阻止事件冒泡
    e.stopPropagation();
    
    setIsActive(false);
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const duration = Date.now() - touchStart.time;

    // 判断是水平滑动还是垂直滑动（取决于哪个方向的距离更大）
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);
    const isQuickSwipe = duration < 300; // 快速滑动阈值（毫秒）
    
    if (isHorizontalSwipe) {
      if (Math.abs(distanceX) > threshold) {
        if (distanceX > 0) {
          onSwipeLeft({
            distance: distanceX,
            duration,
            isQuick: isQuickSwipe
          });
        } else {
          onSwipeRight({
            distance: Math.abs(distanceX),
            duration,
            isQuick: isQuickSwipe
          });
        }
      }
    } else {
      if (Math.abs(distanceY) > threshold) {
        if (distanceY > 0) {
          onSwipeUp({
            distance: distanceY,
            duration,
            isQuick: isQuickSwipe
          });
        } else {
          onSwipeDown({
            distance: Math.abs(distanceY),
            duration,
            isQuick: isQuickSwipe
          });
        }
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // 计算当前滑动指示器
  const getSwipeIndicator = () => {
    if (!touchStart || !touchEnd || !isActive) return null;
    
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);
    
    if (isHorizontalSwipe) {
      if (Math.abs(distanceX) > threshold) {
        if (distanceX > 0) {
          return 'left';
        } else {
          return 'right';
        }
      }
    } else {
      if (Math.abs(distanceY) > threshold) {
        if (distanceY > 0) {
          return 'up';
        } else {
          return 'down';
        }
      }
    }
    
    return null;
  };

  // 获取滑动进度百分比
  const getSwipeProgress = () => {
    if (!touchStart || !touchEnd || !isActive) return 0;
    
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);
    
    if (isHorizontalSwipe) {
      return Math.min(Math.abs(distanceX) / (threshold * 2), 1);
    } else {
      return Math.min(Math.abs(distanceY) / (threshold * 2), 1);
    }
  };

  // 添加和移除事件监听器
  useEffect(() => {
    const element = elementRef?.current;
    if (!element) return;

    // 修改事件监听器，使用 { passive: false } 以允许阻止默认行为
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, touchStart, touchEnd, preventDefaultTouchMove]);

  return {
    swipeDirection: getSwipeIndicator(),
    swipeProgress: getSwipeProgress(),
    isSwiping: isActive && touchEnd !== null
  };
};

export default useSwipeGesture; 