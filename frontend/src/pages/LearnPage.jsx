import React, { useState, useEffect, useCallback } from 'react';
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
  const [debugInfo, setDebugInfo] = useState(null);

  const fetchNextWord = useCallback(async () => {
    setIsRevealed(false);
    setIsInteractable(false);
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/learn/next');
      console.log('API 响应:', response.data);
      setMeaning(response.data);
      // 保存调试信息
      setDebugInfo(response.data);
    } catch (err) {
      console.error('获取单词失败:', err);
      setError(err.response?.data?.error || '无法获取下一个词汇。');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  }, []);

  useEffect(() => {
    fetchNextWord();
  }, [fetchNextWord]);

  useEffect(() => {
    if (isRevealed) {
      const timer = setTimeout(() => {
        setIsInteractable(true);
      }, 500); // Match this with the transition duration
      return () => clearTimeout(timer);
    }
  }, [isRevealed]);

  const handleReview = async (userChoice) => {
    if (!meaning || !meaning.meaningId) return;
    setIsSubmitting(true);
    try {
      console.log('提交复习请求:', {
        meaningId: meaning.meaningId,
        userChoice,
      });
      
      await api.post('/learn/review', {
        meaningId: meaning.meaningId,
        userChoice,
      });
      fetchNextWord();
    } catch (err) {
      console.error('提交复习记录失败:', err);
      const errorMessage = err.response?.data?.error || '提交复习记录失败。';
      setError(`${errorMessage} (错误详情: ${err.message})`);
      setIsSubmitting(false);
    }
  };
  
  const renderHighlightedSentence = (sentence, word) => {
    if (!sentence || !word) return word;
    // 使用 'i' 标志进行不区分大小写的匹配
    const regex = new RegExp(`(\\b${word}\\b)`, 'gi');
    const parts = sentence.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <strong key={index} className="font-bold text-teal-400">
          {part}
        </strong>
      ) : (
        part
      )
    );
  };

  if (loading && !meaning) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-400 bg-gray-800 p-8 rounded-lg shadow-xl">
        <h3 className="text-xl font-bold mb-4">发生错误</h3>
        <p>{error}</p>
        <Button onClick={fetchNextWord} variant="primary" className="mt-6 max-w-xs mx-auto">
          再试一次
        </Button>
        {debugInfo && (
          <div className="mt-4 p-4 bg-gray-900 text-left text-xs overflow-auto rounded">
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  }
  
  if (meaning && meaning.message) {
    return (
        <div className="text-center bg-gray-800 p-10 rounded-lg shadow-xl">
            <h2 className="text-3xl font-bold text-teal-400">{meaning.message}</h2>
            <p className="mt-4 text-lg text-gray-300">太棒了！请继续保持！</p>
        </div>
    );
  }

  if (!meaning) {
    return (
      <div className="text-center text-gray-400">
        当前没有需要学习的词汇。
      </div>
    );
  }

  // 显示词性和中文释义的格式化函数
  const formatPartOfSpeechAndDefinition = () => {
    if (!meaning) return '';
    
    // 确保这些属性存在
    const partOfSpeech = meaning.partOfSpeech || '';
    const definition = meaning.definition || '';
    
    // 如果都有，显示"词性: 释义"
    if (partOfSpeech && definition) {
      return `${partOfSpeech}: ${definition}`;
    }
    // 否则只显示有的那个
    return partOfSpeech || definition;
  };

  return (
    <div 
      className="flex items-center justify-center w-full min-h-[calc(100vh-120px)] p-4 cursor-pointer"
      onClick={() => !isRevealed && setIsRevealed(true)}
    >
      <div 
        className="w-full max-w-2xl mx-auto bg-gray-800 rounded-2xl shadow-xl flex flex-col justify-center min-h-[24rem] p-8 text-center"
      >
        <div className="flex-grow flex items-center justify-center">
          <div>
            <p className="text-2xl sm:text-3xl text-gray-100 leading-relaxed">
              {renderHighlightedSentence(meaning.exampleSentence, meaning.word)}
            </p>
            {/* 为翻译预留空间的占位符 */}
            <div className="min-h-[3rem] flex items-center justify-center mt-4">
              {isRevealed && meaning.exampleSentenceTranslation && (
                <p className="text-lg text-gray-400 transition-opacity duration-500 ease-in-out opacity-100">
                  {meaning.exampleSentenceTranslation}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div 
          className={`transition-all duration-500 ease-in-out mt-8 ${isRevealed ? 'opacity-100 visible' : 'opacity-0 invisible h-0'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-10 min-h-[3rem] flex items-center justify-center">
            <p className="text-xl text-gray-300">{formatPartOfSpeechAndDefinition()}</p>
          </div>

          <div className="flex justify-center gap-4">
            <Button onClick={() => handleReview('不认识')} disabled={isSubmitting || !isInteractable} variant="danger">
              不认识
            </Button>
            <Button onClick={() => handleReview('模糊')} disabled={isSubmitting || !isInteractable} variant="warning">
              模糊
            </Button>
            <Button onClick={() => handleReview('认识')} disabled={isSubmitting || !isInteractable} variant="success">
              认识
            </Button>
          </div>
        </div>
        
        {/* 调试信息区域 */}
        {import.meta.env.DEV && meaning && (
          <div className="mt-8 border-t border-gray-700 pt-4 text-xs text-left">
            <details>
              <summary className="cursor-pointer text-gray-500">调试信息</summary>
              <div className="mt-2 p-2 bg-gray-900 rounded overflow-auto">
                <pre className="text-gray-400">{JSON.stringify(meaning, null, 2)}</pre>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default LearnPage; 