import { useState, useEffect } from 'react';

const SwipeTutorial = ({ onDismiss }) => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    {
      title: '滑动学习',
      description: '使用滑动手势可以更快地学习单词',
      image: (
        <div className="w-32 h-32 mx-auto relative">
          <div className="w-20 h-20 bg-gray-200 rounded-lg absolute top-6 left-6"></div>
          <div className="absolute top-16 left-0 text-2xl animate-pulse">←</div>
          <div className="absolute top-16 right-0 text-2xl animate-pulse">→</div>
        </div>
      )
    },
    {
      title: '向右滑动',
      description: '向右滑表示"认识"',
      image: (
        <div className="w-32 h-32 mx-auto relative">
          <div className="w-20 h-20 bg-green-100 rounded-lg absolute top-6 left-6 animate-swipe-right"></div>
          <div className="absolute top-16 right-0 text-2xl text-green-500">→</div>
        </div>
      )
    },
    {
      title: '向左滑动',
      description: '向左滑表示"不认识"',
      image: (
        <div className="w-32 h-32 mx-auto relative">
          <div className="w-20 h-20 bg-red-100 rounded-lg absolute top-6 left-6 animate-swipe-left"></div>
          <div className="absolute top-16 left-0 text-2xl text-red-500">←</div>
        </div>
      )
    },
    {
      title: '向上滑动',
      description: '向上滑表示"模糊"',
      image: (
        <div className="w-32 h-32 mx-auto relative">
          <div className="w-20 h-20 bg-yellow-100 rounded-lg absolute top-6 left-6 animate-swipe-up"></div>
          <div className="absolute top-0 left-16 text-2xl text-yellow-500">↑</div>
        </div>
      )
    }
  ];
  
  useEffect(() => {
    // 检查本地存储是否已经显示过教程
    const tutorialShown = localStorage.getItem('swipeTutorialShown');
    
    if (!tutorialShown) {
      // 延迟显示教程，让用户先看到界面
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  const handleDismiss = () => {
    // 记录教程已显示
    localStorage.setItem('swipeTutorialShown', 'true');
    setShowTutorial(false);
    
    if (onDismiss) {
      onDismiss();
    }
  };
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDismiss();
    }
  };
  
  if (!showTutorial) return null;
  
  const currentStepData = steps[currentStep];
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl overflow-hidden">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
            {currentStepData.title}
          </h3>
          
          <div className="my-8">
            {currentStepData.image}
          </div>
          
          <p className="text-gray-600 text-center mb-6">
            {currentStepData.description}
          </p>
          
          <div className="flex justify-between items-center">
            <button
              className="text-gray-500 px-4 py-2 rounded"
              onClick={handleDismiss}
            >
              跳过
            </button>
            
            <div className="flex space-x-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentStep ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={handleNext}
            >
              {currentStep < steps.length - 1 ? '下一步' : '完成'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwipeTutorial; 