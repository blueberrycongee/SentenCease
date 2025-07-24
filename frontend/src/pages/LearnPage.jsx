import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Spinner from '../components/Spinner';
import Button from '../components/Button';

const LearnPage = () => {
  const [wordCard, setWordCard] = useState(null);
  const [prevWordCard, setPrevWordCard] = useState(null);
  const [nextWordCard, setNextWordCard] = useState(null);
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
      const response = await api.get('/learn/next-word');
      
      // 更新历史记录和卡片状态
      if (wordCard) {
        setPrevWordCard(wordCard);
        if (history.length > 30) {
          setHistory(prev => [...prev.slice(1), wordCard]);
        } else {
          setHistory(prev => [...prev, wordCard]);
        }
      }
      
      setWordCard(response.data);
      
      // Preload the next word
      try {
        const nextResponse = await api.get('/learn/peek-next-word');
        setNextWordCard(nextResponse.data);
      } catch (err) {
        setNextWordCard(null);
      }
      
      await fetchProgress();
    } catch (err) {
      setError(err.response?.data?.error || '无法获取下一个词汇。');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  }, [wordCard, history]);

  // 返回上一个单词
  const goToPreviousWord = useCallback(() => {
    if (history.length === 0 || isAnimating) return;
    
    setDirection('prev');
    setIsAnimating(true);
    
    const previousWord = history[history.length - 1];
    setNextWordCard(wordCard);
    setWordCard(previousWord);
    
    if (history.length > 1) {
      setPrevWordCard(history[history.length - 2]);
    } else {
      setPrevWordCard(null);
    }
    
    setHistory(prev => prev.slice(0, -1));
    
    setIsRevealed(true);
    setIsInteractable(true);
    
    setTimeout(() => {
      setIsAnimating(false);
      setDirection('');
    }, 500);
  }, [history, wordCard, isAnimating]);

  // 获取学习进度
  const fetchProgress = async () => {
    try {
      const { data } = await api.get('/learn/progress');
      setProgress(data);
    } catch (err) {
      console.error('获取学习进度失败:', err);
    }
  };

  useEffect(() => {
    fetchNextWord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isRevealed) {
      const timer = setTimeout(() => {
        setIsInteractable(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isRevealed]);

  // Submit review result
  const handleReview = useCallback(async (userChoice) => {
    if (!wordCard || !wordCard.contextualMeaningId || isSubmitting) return;
    
    setDirection('next');
    setIsAnimating(true);
    
    setIsSubmitting(true);
    try {
      await api.post('/learn/review', {
        meaningId: wordCard.contextualMeaningId,
        userChoice,
      });
      
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
  }, [wordCard, isSubmitting, fetchNextWord]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.repeat) return;
      const tagName = document.activeElement?.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (!isRevealed) setIsRevealed(true);
        return;
      }
      
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        goToPreviousWord();
        return;
      }

      if (!isRevealed || !isInteractable || isSubmitting) return;

      switch (e.key) {
        case '1': handleReview('认识'); break;
        case '2': handleReview('模糊'); break;
        case '3': handleReview('不认识'); break;
        default: break;
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
        <span key={index} className="font-semibold text-[#0052cc]">{part}</span>
      ) : (
        part
      )
    );
  };

  // 进度条组件
  const ProgressBar = ({ completed, total }) => {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    let statusText = "开始学习";
    if (completed > 0) {
      if (completed === total) statusText = "学习完成";
      else if (completed / total >= 0.8) statusText = "即将完成";
      else if (completed / total >= 0.5) statusText = "努力中";
      else statusText = "继续加油";
    }
    const barColor = completed === total ? "bg-green-600" : "bg-blue-600";
    
    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-1">
          <div className="text-sm font-semibold text-gray-700">今日学习进度</div>
          <div className="text-sm text-gray-600">{statusText}</div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div className={`${barColor} h-4 rounded-full transition-all duration-300 ease-in-out`} style={{ width: `${percentage}%` }}></div>
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
    if (loading && !wordCard) {
      return <div className="flex items-center justify-center h-full"><Spinner /></div>;
    }

    if (error) {
      return (
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
          <h3 className="text-xl font-bold mb-4 text-gray-800">发生错误</h3>
          <p className="text-gray-600">{error}</p>
          <Button onClick={fetchNextWord} variant="primary" className="mt-6">再试一次</Button>
        </div>
      );
    }

    if (wordCard && wordCard.message) {
      return (
        <div className="text-center bg-white p-10 rounded-2xl shadow-lg">
          <h2 className="text-3xl font-bold text-blue-600">今日学习完成！</h2>
          <p className="mt-4 text-lg text-gray-600">{wordCard.message}</p>
          <div className="mt-6 flex justify-center space-x-4">
            <Button onClick={() => navigate('/select-words')} variant="primary" className="px-6 py-3 text-lg">添加更多单词</Button>
          </div>
        </div>
      );
    }

    if (!wordCard) {
      return (
        <div className="text-center bg-white p-10 rounded-2xl shadow-lg">
          <h2 className="text-3xl font-bold text-blue-600">今日学习完成！</h2>
          <p className="mt-4 text-lg text-gray-600">您已经学完了今天计划的所有单词，太棒了！</p>
          <div className="mt-6 flex justify-center space-x-4">
            <Button onClick={() => navigate('/select-words')} variant="primary" className="px-6 py-3 text-lg">添加更多单词</Button>
          </div>
        </div>
      );
    }

    const getCardAnimationClass = () => {
      if (!isAnimating) return "";
      if (direction === 'next') return "animate-slide-out-left";
      if (direction === 'prev') return "animate-slide-in-right";
      return "";
    };

    const getPrevCardAnimationClass = () => {
      if (!isAnimating) return "";
      if (direction === 'prev') return "animate-slide-to-center-from-left";
      return "";
    };

    const getNextCardAnimationClass = () => {
      if (!isAnimating) return "";
      if (direction === 'next') return "animate-slide-to-center";
      return "";
    };

    return (
      <div className="w-full">
        <div className="relative min-h-[36rem] flex items-center justify-center overflow-visible pb-4">
          {prevWordCard && (
            <div 
              className={`absolute hidden sm:block bg-white/90 rounded-xl shadow-md p-6 w-72 transform -rotate-8 -left-48 cursor-pointer transition-all duration-300 ease-in-out hover:scale-105 hover:-translate-y-2 hover:shadow-lg animate-float ${getPrevCardAnimationClass()}`}
              onClick={goToPreviousWord}
              style={{zIndex: 1}}
            >
              <div className="card-word text-center text-2xl font-bold text-gray-600">{prevWordCard.lemma}</div>
              <div className="text-sm text-center text-gray-500 mt-2">{prevWordCard.allMeanings[0]?.definition}</div>
              <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-blue-600">点击回到上一个</div>
            </div>
          )}
          
          {prevWordCard && (
            <button className="sm:hidden absolute left-1 top-1/2 transform -translate-y-1/2 bg-white/90 rounded-full w-12 h-12 flex items-center justify-center shadow-md z-20" onClick={goToPreviousWord}>
              <div className="text-blue-600 text-2xl">&larr;</div>
            </button>
          )}
          
          <div 
            className={`bg-white rounded-2xl shadow-xl p-10 min-h-[36rem] w-full max-w-xl mx-6 cursor-pointer transform z-10 transition-all duration-500 ease-in-out hover:shadow-2xl ${getCardAnimationClass()}`}
            onClick={() => !isRevealed && setIsRevealed(true)}
          >
            <div className="mb-8 text-center">
              <p className="text-3xl text-gray-800 leading-relaxed">
                {renderHighlightedSentence(wordCard.exampleSentence, wordCard.wordInSentence)}
              </p>
              <div className="min-h-[3rem] flex items-center justify-center mt-4 transition-opacity duration-300 ease-in-out" style={{ opacity: isRevealed ? 1 : 0 }}>
                {wordCard.exampleSentenceTranslation && (
                  <p className="text-lg text-gray-500">{wordCard.exampleSentenceTranslation}</p>
                )}
              </div>
            </div>

            <hr className="my-8 border-gray-200" />

            <div className="transition-opacity duration-300 ease-in-out" style={{ opacity: isRevealed ? 1 : 0 }} onClick={(e) => e.stopPropagation()}>
              <div className="text-center mb-8">
                <p className="text-3xl font-bold text-gray-800">{wordCard.lemma}</p>
                <div className="mt-4 space-y-2 text-left">
                  {wordCard.allMeanings.map(m => (
                    <div key={m.meaningId} className="p-2 rounded">
                      <span className="font-semibold text-gray-600">{m.partOfSpeech}:</span>
                      <span className="ml-2 text-gray-800">{m.definition}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center items-center gap-4">
                <Button onClick={() => handleReview('不认识')} disabled={isSubmitting || !isInteractable} variant="danger" className="w-32 h-14 text-lg">不认识</Button>
                <Button onClick={() => handleReview('模糊')} disabled={isSubmitting || !isInteractable} variant="warning" className="w-32 h-14 text-lg">模糊</Button>
                <Button onClick={() => handleReview('认识')} disabled={isSubmitting || !isInteractable} variant="success" className="w-32 h-14 text-lg">认识</Button>
              </div>
            </div>
          </div>
          
          {nextWordCard && (
            <div 
              className={`absolute hidden sm:block bg-white/90 rounded-xl shadow-md p-6 w-72 transform rotate-8 -right-48 transition-all duration-300 ease-in-out hover:scale-105 hover:-translate-y-2 hover:shadow-lg animate-float ${getNextCardAnimationClass()}`}
              style={{zIndex: 1}}
            >
              <div className="card-word text-center text-2xl font-bold text-gray-600">{nextWordCard.lemma}</div>
              <div className="text-sm text-center text-gray-500 mt-2 opacity-70">即将学习...</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#F5F5F7] w-full min-h-screen flex items-center justify-center p-8 font-sans">
      <div className="w-full mx-auto">
        <div className="bg-white p-4 rounded-xl shadow-md mb-6 max-w-5xl mx-auto">
          <ProgressBar completed={progress.completed} total={progress.total} />
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default LearnPage; 