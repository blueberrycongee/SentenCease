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

  const fetchNextWord = useCallback(async () => {
    setIsRevealed(false);
    setIsInteractable(false);
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/learn/next');
      setMeaning(response.data);
    } catch (err) {
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
      await api.post('/learn/review', {
        meaningId: meaning.meaningId,
        userChoice,
      });
      fetchNextWord();
    } catch (err) {
      setError(err.response?.data?.error || '提交复习记录失败。');
      setIsSubmitting(false);
    }
  };
  
  const renderHighlightedSentence = (sentence, word) => {
    if (!sentence || !word) return word;
    const parts = sentence.split(new RegExp(`(\\b${word}\\b)`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === word.toLowerCase() ? (
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

  return (
    <div 
      className="flex items-center justify-center w-full min-h-[calc(100vh-120px)] p-4"
      onClick={() => !isRevealed && setIsRevealed(true)}
    >
      <div 
        className="w-full max-w-2xl mx-auto bg-gray-800 rounded-2xl shadow-xl flex flex-col justify-around min-h-[24rem] p-8"
      >
        <div className="flex items-center justify-center">
          <p className="text-2xl sm:text-3xl text-gray-100 leading-relaxed text-center">
            {renderHighlightedSentence(meaning.exampleSentence, meaning.word)}
          </p>
        </div>
        
        <div 
          className={`transition-all duration-500 ease-in-out mt-4 ${isRevealed ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-10 min-h-[3rem] flex items-center justify-center">
            <p className="text-lg text-gray-400">{meaning.definition}</p>
          </div>

          <div className="flex justify-center gap-4">
            <Button onClick={(e) => { e.stopPropagation(); handleReview('不认识'); }} disabled={isSubmitting || !isInteractable} variant="danger">
              不认识
            </Button>
            <Button onClick={(e) => { e.stopPropagation(); handleReview('模糊'); }} disabled={isSubmitting || !isInteractable} variant="warning">
              模糊
            </Button>
            <Button onClick={(e) => { e.stopPropagation(); handleReview('认识'); }} disabled={isSubmitting || !isInteractable} variant="success">
              认识
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearnPage; 