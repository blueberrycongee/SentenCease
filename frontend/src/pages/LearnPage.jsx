import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Spinner from '../components/Spinner';
import Button from '../components/Button';

const LearnPage = () => {
  const [meaning, setMeaning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isInteractable, setIsInteractable] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const navigate = useNavigate();

  const fetchNextWord = useCallback(async () => {
    setIsRevealed(false);
    setIsInteractable(false);
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/learn/next');
      setMeaning(response.data);
      // 获取学习进度
      await fetchProgress();
    } catch (err) {
      setError(err.response?.data?.error || '无法获取下一个词汇。');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  }, []);

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
  }, [fetchNextWord]);

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
    setIsSubmitting(true);
    try {
      await api.post('/learn/review', {
        meaningId: meaning.meaningId,
        userChoice,
      });
      fetchNextWord();
      // 这里不需要额外调用fetchProgress，因为fetchNextWord中已经包含了
    } catch (err) {
      setError(err.response?.data?.error || '提交复习记录失败。');
      setIsSubmitting(false);
    }
  }, [meaning, isSubmitting, fetchNextWord]);

  // Keyboard shortcuts: Space reveals; 1=认识, 2=模糊, 3=不认识
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
  }, [isRevealed, isInteractable, isSubmitting, handleReview]);

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

  const formatPartOfSpeechAndDefinition = () => {
    if (!meaning) return '';
    const { partOfSpeech, definition } = meaning;
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

    return (
      <div className="w-full max-w-xl mx-auto">
        {/* 进度条 */}
        <div className="bg-white p-4 rounded-xl shadow-md mb-4">
          <ProgressBar completed={progress.completed} total={progress.total} />
        </div>
        
        <div 
          className="w-full bg-white rounded-2xl shadow-xl flex flex-col justify-between p-10 md:p-16 min-h-[36rem] cursor-pointer transform -translate-y-5"
          onClick={() => !isRevealed && setIsRevealed(true)}
        >
          {/* Top Section: Sentence & Translation */}
          <div className="flex-grow flex flex-col justify-center text-center">
            <p className="text-2xl md:text-3xl text-gray-800 font-normal leading-relaxed">
              {renderHighlightedSentence(meaning.exampleSentence, meaning.word)}
            </p>
            <div className="min-h-[3rem] flex items-center justify-center mt-4 transition-opacity duration-300 ease-in-out" style={{ opacity: isRevealed ? 1 : 0 }}>
              {meaning.exampleSentenceTranslation && (
                <p className="text-lg text-gray-500">
                  {meaning.exampleSentenceTranslation}
                </p>
              )}
            </div>
          </div>

          {/* Bottom Section: Word Info & Buttons */}
          <div 
            className="transition-opacity duration-300 ease-in-out"
            style={{ opacity: isRevealed ? 1 : 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-8">
              <p className="text-2xl font-semibold text-gray-800">{meaning.word}</p>
              <p className="text-base text-gray-500 mt-1">{formatPartOfSpeechAndDefinition()}</p>
            </div>

            <div className="flex justify-center items-center gap-4">
              <Button onClick={() => handleReview('不认识')} disabled={isSubmitting || !isInteractable} variant="danger" className="w-32 h-14 text-lg">
                不认识
              </Button>
              <Button onClick={() => handleReview('模糊')} disabled={isSubmitting || !isInteractable} variant="warning" className="w-32 h-14 text-lg">
                模糊
              </Button>
              <Button onClick={() => handleReview('认识')} disabled={isSubmitting || !isInteractable} variant="success" className="w-32 h-14 text-lg">
                认识
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#F5F5F7] w-full min-h-screen flex items-center justify-center p-4 font-sans">
      {renderContent()}
    </div>
  );
};

export default LearnPage; 