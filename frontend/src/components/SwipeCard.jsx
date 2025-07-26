import { useRef, useState, useEffect } from 'react';
import useSwipeGesture from '../hooks/useSwipeGesture';

const SwipeCard = ({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeUp,
  disabled = false,
  className = '',
  onClick
}) => {
  const cardRef = useRef(null);
  const [transform, setTransform] = useState({
    rotate: 0,
    translateX: 0,
    translateY: 0,
    opacity: 1
  });
  const [isDragging, setIsDragging] = useState(false);
  
  // 使用自定义手势Hook
  const { swipeDirection, swipeProgress, isSwiping } = useSwipeGesture(cardRef, {
    onSwipeLeft: (details) => {
      if (disabled) return;
      // 向左滑（不认识）
      animateExit('left', () => {
        if (onSwipeLeft) onSwipeLeft(details);
      });
    },
    onSwipeRight: (details) => {
      if (disabled) return;
      // 向右滑（认识）
      animateExit('right', () => {
        if (onSwipeRight) onSwipeRight(details);
      });
    },
    onSwipeUp: (details) => {
      if (disabled) return;
      // 向上滑（模糊）
      animateExit('up', () => {
        if (onSwipeUp) onSwipeUp(details);
      });
    },
    threshold: 80,
    preventDefaultTouchMove: true // 确保阻止默认滚动行为
  });
  
  // 当手势变化时更新卡片样式 - 优化动画性能
  useEffect(() => {
    if (disabled) return;
    
    if (isSwiping && swipeDirection) {
      setIsDragging(true);
      
      const progress = swipeProgress * 1.2; // 减小倍率，提高流畅度
      
      if (swipeDirection === 'left') {
        setTransform({
          rotate: -15 * progress,
          translateX: -100 * progress,
          translateY: 20 * progress,
          opacity: 1 - (progress * 0.5)
        });
      } else if (swipeDirection === 'right') {
        setTransform({
          rotate: 15 * progress,
          translateX: 100 * progress,
          translateY: 20 * progress,
          opacity: 1 - (progress * 0.5)
        });
      } else if (swipeDirection === 'up') {
        setTransform({
          rotate: 0,
          translateX: 0,
          translateY: -100 * progress,
          opacity: 1 - (progress * 0.5)
        });
      }
    } else if (!isSwiping) {
      // 重置状态
      setIsDragging(false);
      setTransform({
        rotate: 0,
        translateX: 0,
        translateY: 0,
        opacity: 1
      });
    }
  }, [isSwiping, swipeDirection, swipeProgress, disabled]);
  
  // 动画退出
  const animateExit = (direction, onComplete) => {
    if (disabled) return;
    
    let targetX = 0;
    let targetY = 0;
    let targetRotate = 0;
    
    switch (direction) {
      case 'left':
        targetX = -1000; // 减小移动距离提高性能
        targetRotate = -30;
        break;
      case 'right':
        targetX = 1000; // 减小移动距离提高性能
        targetRotate = 30;
        break;
      case 'up':
        targetY = -1000; // 减小移动距离提高性能
        break;
      default:
        break;
    }
    
    setTransform({
      rotate: targetRotate,
      translateX: targetX,
      translateY: targetY,
      opacity: 0
    });
    
    // 动画结束后执行回调
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 250); // 缩短动画时间
  };
  
  // 处理点击事件
  const handleClick = (e) => {
    // 阻止事件冒泡
    e.stopPropagation();
    
    // 如果提供了点击回调，则执行
    if (onClick && !isDragging) {
      onClick(e);
    }
  };
  
  // 获取卡片状态指示器样式
  const getIndicatorStyle = () => {
    if (!isSwiping || !swipeDirection) return null;
    
    switch (swipeDirection) {
      case 'left':
        return {
          label: '认识',
          className: 'bg-green-500',
        };
      case 'right':
        return {
          label: '不认识',
          className: 'bg-red-500',
        };
      case 'up':
        return {
          label: '模糊',
          className: 'bg-yellow-500',
        };
      default:
        return null;
    }
  };
  
  const indicator = getIndicatorStyle();
  
  return (
    <div 
      ref={cardRef}
      className={`relative select-none touch-manipulation swipe-card-container ${isDragging ? 'z-10' : 'z-0'} ${className}`}
      style={{
        transform: `translate3d(${transform.translateX}px, ${transform.translateY}px, 0) rotate(${transform.rotate}deg)`,
        opacity: transform.opacity,
        transition: isDragging ? 'none' : 'all 0.25s cubic-bezier(0.2, 0, 0.2, 1)',
        willChange: 'transform, opacity',
        WebkitBackfaceVisibility: 'hidden',
        WebkitTransformStyle: 'preserve-3d'
      }}
      onClick={handleClick}
    >
      {children}
      
      {/* 滑动方向指示器 */}
      {indicator && (
        <div className={`absolute top-3 right-3 ${indicator.className} text-white font-bold py-1.5 px-3 text-sm rounded-lg transform transition-opacity duration-150 ${swipeProgress > 0.3 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
          {indicator.label}
        </div>
      )}
    </div>
  );
};

export default SwipeCard; 