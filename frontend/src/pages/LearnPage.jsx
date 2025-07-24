import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Spinner from '../components/Spinner';
import Button from '../components/Button';

const LearnPage = () => {
  const [meaning, setMeaning] = useState(null);
  const [prevMeaning, setPrevMeaning] = useState(null);
  const [nextMeaning, setNextMeaning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isInteractable, setIsInteractable] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [history, setHistory] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState('');
  const navigate = useNavigate();

  // 获取下一个单词
  const fetchNextWord = useCallback(async () => {
    setIsRevealed(false);
    setIsInteractable(false);
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/learn/next');
      
      // 更新历史记录和卡片状态
      if (meaning) {
        setPrevMeaning(meaning);
        if (history.length > 30) {
          // 保留最近30个单词的历史
          setHistory(prev => [...prev.slice(1), meaning]);
        } else {
          setHistory(prev => [...prev, meaning]);
        }
      }
      
      setMeaning(response.data);
      
      // 如果有下一个单词信息可以预加载，这里需要API支持
      try {
        const nextResponse = await api.get('/learn/peek');
        setNextMeaning(nextResponse.data);
      } catch (err) {
        // 如果没有下一个单词可以预加载，忽略错误
        setNextMeaning(null);
      }
      
      // 获取学习进度
      await fetchProgress();
    } catch (err) {
      setError(err.response?.data?.error || '无法获取下一个词汇。');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  }, [meaning, history]);

  // 返回上一个单词
  const goToPreviousWord = useCallback(() => {
    if (history.length === 0 || isAnimating) return;
    
    setDirection('prev');
    setIsAnimating(true);
    
    // 从历史记录中获取上一个单词
    const previousWord = history[history.length - 1];
    setNextMeaning(meaning);
    setMeaning(previousWord);
    
    // 更新历史记录
    if (history.length > 1) {
      setPrevMeaning(history[history.length - 2]);
    } else {
      setPrevMeaning(null);
    }
    
    setHistory(prev => prev.slice(0, -1));
    
    // 重置状态
    setIsRevealed(true);
    setIsInteractable(true);
    
    // 动画结束后重置状态
    setTimeout(() => {
      setIsAnimating(false);
      setDirection('');
    }, 500);
  }, [history, meaning, isAnimating]);

  // 获取学习进度
  const fetchProgress = async () => {
    try {
      const progressData = await api.getLearningProgress();
      setProgress(progressData);
    } catch (err) {
      console.error('获取学习进度失败:', err);
    }
  };

  useEffect(() => {
    fetchNextWord();
  }, []);

  useEffect(() => {
    if (isRevealed) {
      const timer = setTimeout(() => {
        setIsInteractable(true);
      }, 300); // Shorter delay for quicker interaction
      return () => clearTimeout(timer);
    }
  }, [isRevealed]);

  // Submit review result; memoized to keep reference stable
  const handleReview = useCallback(async (userChoice) => {
    if (!meaning || !meaning.meaningId || isSubmitting) return;
    
    setDirection('next');
    setIsAnimating(true);
    
    setIsSubmitting(true);
    try {
      await api.post('/learn/review', {
        meaningId: meaning.meaningId,
        userChoice,
      });
      
      // 延迟加载下一个单词，等待动画完成
      setTimeout(() => {
        fetchNextWord();
        setIsAnimating(false);
        setDirection('');
      }, 500);
    } catch (err) {
      setError(err.response?.data?.error || '提交复习记录失败。');
      setIsSubmitting(false);
      setIsAnimating(false);
      setDirection('');
    }
  }, [meaning, isSubmitting, fetchNextWord]);

  // Keyboard shortcuts: Space reveals; 1=认识, 2=模糊, 3=不认识; Left arrow for previous word
  useEffect(() => {
    const onKeyDown = (e) => {
      // Ignore repeated key press
      if (e.repeat) return;

      // Ignore if focused on input/textarea to avoid conflict with typing
      const tagName = document.activeElement?.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scroll
        if (!isRevealed) {
          setIsRevealed(true);
        }
        return;
      }
      
      // 左方向键返回上一个单词
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        goToPreviousWord();
        return;
      }

      // Only handle scoring keys after reveal and when buttons are interactable
      if (!isRevealed || !isInteractable || isSubmitting) return;

      switch (e.key) {
        case '1':
          handleReview('认识');
          break;
        case '2':
          handleReview('模糊');
          break;
        case '3':
          handleReview('不认识');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRevealed, isInteractable, isSubmitting, handleReview, goToPreviousWord]);

  const renderHighlightedSentence = (sentence, word) => {
    if (!sentence || !word) return word;
    const regex = new RegExp(`(\\b${word}\\b)`, 'gi');
    const parts = sentence.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="font-semibold text-[#0052cc]">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const formatPartOfSpeechAndDefinition = (wordMeaning) => {
    if (!wordMeaning) return '';
    const { partOfSpeech, definition } = wordMeaning;
    if (partOfSpeech && definition) {
      return `${partOfSpeech}: ${definition}`;
    }
    return partOfSpeech || definition;
  };
  
  // 进度条组件
  const ProgressBar = ({ completed, total }) => {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    let statusText = "开始学习";
    let barColor = "bg-blue-600";
    
    if (completed > 0) {
      if (completed === total) {
        statusText = "学习完成";
        barColor = "bg-green-600";
      } else if (completed / total >= 0.8) {
        statusText = "即将完成";
        barColor = "bg-green-500";
      } else if (completed / total >= 0.5) {
        statusText = "努力中";
        barColor = "bg-blue-500";
      } else {
        statusText = "继续加油";
        barColor = "bg-blue-600";
      }
    }
    
    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-1">
          <div className="text-sm font-semibold text-gray-700">今日学习进度</div>
          <div className="text-sm text-gray-600">{statusText}</div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div 
            className={`${barColor} h-4 rounded-full transition-all duration-300 ease-in-out`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>已完成: {completed} 单词</span>
          <span>{percentage}%</span>
          <span>总计: {total} 单词</span>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading && !meaning) {
      return (
        <div className="flex items-center justify-center h-full">
          <Spinner />
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
          <h3 className="text-xl font-bold mb-4 text-gray-800">发生错误</h3>
          <p className="text-gray-600">{error}</p>
          <Button onClick={fetchNextWord} variant="primary" className="mt-6">
            再试一次
          </Button>
        </div>
      );
    }

    if (meaning && meaning.message) {
      return (
        <div className="text-center bg-white p-10 rounded-2xl shadow-lg">
          <h2 className="text-3xl font-bold text-blue-600">今日学习完成！</h2>
          <p className="mt-4 text-lg text-gray-600">
            恭喜您已经完成了今天的单词学习计划！
          </p>
          <div className="mt-6 flex justify-center space-x-4">
            <Button 
              onClick={() => navigate('/select-words')} 
              variant="primary" 
              className="px-6 py-3 text-lg"
            >
              添加更多单词
            </Button>
          </div>
        </div>
      );
    }

    if (!meaning) {
      return (
        <div className="text-center bg-white p-10 rounded-2xl shadow-lg">
          <h2 className="text-3xl font-bold text-blue-600">今日学习完成！</h2>
          <p className="mt-4 text-lg text-gray-600">
            您已经学完了今天计划的所有单词，太棒了！
          </p>
          <div className="mt-6 flex justify-center space-x-4">
            <Button 
              onClick={() => navigate('/select-words')} 
              variant="primary" 
              className="px-6 py-3 text-lg"
            >
              添加更多单词
            </Button>
          </div>
        </div>
      );
    }

    // 确定卡片动画类
    const getCardAnimationClass = () => {
      if (!isAnimating) return "";
      if (direction === 'next') return "animate-slide-out-left";
      if (direction === 'prev') return "animate-slide-in-right";
      return "";
    };

    // 确定前一个卡片的动画类
    const getPrevCardAnimationClass = () => {
      if (!isAnimating) return "";
      if (direction === 'prev') return "animate-slide-to-center-from-left";
      return "";
    };

    // 确定下一个卡片的动画类
    const getNextCardAnimationClass = () => {
      if (!isAnimating) return "";
      if (direction === 'next') return "animate-slide-to-center";
      return "";
    };

    return (
      <div className="w-full">
        {/* 学习卡片布局区域 */}
        <div className="relative min-h-[36rem] flex items-center justify-center overflow-visible pb-4">
          {/* 上一张单词卡片 - 在小屏幕上隐藏 */}
          {prevMeaning && (
            <div 
              className={`absolute hidden sm:block bg-white/90 rounded-xl shadow-md p-4 sm:p-6 w-48 sm:w-56 md:w-64 lg:w-72 transform -rotate-8 -left-2 sm:-left-6 md:-left-16 lg:-left-32 xl:-left-48 cursor-pointer transition-all duration-300 ease-in-out hover:scale-105 hover:-translate-y-2 hover:shadow-lg animate-float ${getPrevCardAnimationClass()}`}
              onClick={goToPreviousWord}
              style={{zIndex: 1}}
            >
              <div className="card-word text-center text-xl sm:text-2xl font-bold text-gray-600">
                {prevMeaning.word}
              </div>
              <div className="text-xs sm:text-sm text-center text-gray-500 mt-2">
                {formatPartOfSpeechAndDefinition(prevMeaning)}
              </div>
              <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-blue-600">
                点击回到上一个
              </div>
            </div>
          )}
          
          {/* 小屏幕上显示的上一张单词按钮 */}
          {prevMeaning && (
            <button 
              className="sm:hidden absolute left-1 top-1/2 transform -translate-y-1/2 bg-white/90 rounded-full w-12 h-12 flex items-center justify-center shadow-md z-20"
              onClick={goToPreviousWord}
            >
              <div className="text-blue-600 text-2xl">&larr;</div>
            </button>
          )}
          
          {/* 主学习卡片 */}
          <div 
            className={`bg-white rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 lg:p-16 min-h-[36rem] w-full max-w-xl mx-6 cursor-pointer transform z-10 transition-all duration-500 ease-in-out hover:shadow-2xl ${getCardAnimationClass()}`}
            onClick={() => !isRevealed && setIsRevealed(true)}
          >
            {/* Top Section: Sentence & Translation */}
            <div className="mb-6 md:mb-10 text-center">
              <p className="text-xl md:text-2xl lg:text-3xl text-gray-800 font-normal leading-relaxed">
                {renderHighlightedSentence(meaning.exampleSentence, meaning.word)}
              </p>
              <div className="min-h-[3rem] flex items-center justify-center mt-4 transition-opacity duration-300 ease-in-out" style={{ opacity: isRevealed ? 1 : 0 }}>
                {meaning.exampleSentenceTranslation && (
                  <p className="text-base md:text-lg text-gray-500">
                    {meaning.exampleSentenceTranslation}
                  </p>
                )}
              </div>
            </div>

            <hr className="my-6 md:my-8 border-gray-200" />

            {/* Bottom Section: Word Info & Buttons */}
            <div 
              className="transition-opacity duration-300 ease-in-out"
              style={{ opacity: isRevealed ? 1 : 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6 md:mb-8">
                <p className="text-2xl md:text-3xl font-bold text-gray-800">{meaning.word}</p>
                <p className="text-base md:text-lg text-gray-500 mt-2">{formatPartOfSpeechAndDefinition(meaning)}</p>
              </div>

              <div className="flex justify-center items-center gap-2 md:gap-4">
                <Button onClick={() => handleReview('不认识')} disabled={isSubmitting || !isInteractable} variant="danger" className="w-24 md:w-32 h-12 md:h-14 text-sm md:text-lg">
                  不认识
                </Button>
                <Button onClick={() => handleReview('模糊')} disabled={isSubmitting || !isInteractable} variant="warning" className="w-24 md:w-32 h-12 md:h-14 text-sm md:text-lg">
                  模糊
                </Button>
                <Button onClick={() => handleReview('认识')} disabled={isSubmitting || !isInteractable} variant="success" className="w-24 md:w-32 h-12 md:h-14 text-sm md:text-lg">
                  认识
                </Button>
              </div>
            </div>
          </div>
          
          {/* 下一张单词卡片 - 在小屏幕上隐藏 */}
          {nextMeaning && (
            <div 
              className={`absolute hidden sm:block bg-white/90 rounded-xl shadow-md p-4 sm:p-6 w-48 sm:w-56 md:w-64 lg:w-72 transform rotate-8 -right-2 sm:-right-6 md:-right-16 lg:-right-32 xl:-right-48 transition-all duration-300 ease-in-out hover:scale-105 hover:-translate-y-2 hover:shadow-lg animate-float ${getNextCardAnimationClass()}`}
              style={{zIndex: 1}}
            >
              <div className="card-word text-center text-xl sm:text-2xl font-bold text-gray-600">
                {nextMeaning.word}
              </div>
              <div className="text-xs sm:text-sm text-center text-gray-500 mt-2 opacity-70">
                即将学习...
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#F5F5F7] w-full min-h-screen flex items-center justify-center p-4 md:p-6 lg:p-8 font-sans">
      <div className="w-full mx-auto">
        {/* 进度条 */}
        <div className="bg-white p-4 rounded-xl shadow-md mb-6 max-w-5xl mx-auto">
          <ProgressBar completed={progress.completed} total={progress.total} />
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
};

export default LearnPage; 