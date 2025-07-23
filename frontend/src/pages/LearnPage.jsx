import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Spinner from '../components/Spinner';
import Button from '../components/Button';

const LearnPage = () => {
  const [meaning, setMeaning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNextWord = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/learn/next');
      setMeaning(response.data);
    } catch (err) {
      setError(err.response?.data?.error || '无法获取下一个词汇。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNextWord();
  }, [fetchNextWord]);

  const handleReview = async (userChoice) => {
    if (!meaning || !meaning.meaningId) return;
    setIsSubmitting(true);
    try {
      await api.post('/learn/review', {
        meaningId: meaning.meaningId,
        userChoice,
      });
      // Add a small delay for user to see feedback, then fetch next word
      setTimeout(() => {
        fetchNextWord();
        setIsSubmitting(false);
      }, 300);
    } catch (err) {
      setError(err.response?.data?.error || '提交复习记录失败。');
      setIsSubmitting(false);
    }
  };
  
  const highlightLemma = (sentence, lemma) => {
    if (!sentence || !lemma) return sentence;
    const regex = new RegExp(`\\b(${lemma})\\b`, 'gi');
    return sentence.replace(regex, `<strong class="text-teal-400 font-bold">$1</strong>`);
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
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl text-center transition-all duration-500 ease-in-out transform hover:-translate-y-1">
        <div className="mb-8">
          <p 
            className="text-2xl sm:text-3xl text-gray-100 leading-relaxed font-serif"
            dangerouslySetInnerHTML={{ __html: highlightLemma(meaning.exampleSentence, meaning.lemma) }}
          />
        </div>
        <div className="mb-10">
          <p className="text-lg text-gray-400">{meaning.definition}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Button onClick={() => handleReview('不认识')} disabled={isSubmitting} variant="danger">
            不认识
          </Button>
          <Button onClick={() => handleReview('模糊')} disabled={isSubmitting} variant="warning">
            模糊
          </Button>
          <Button onClick={() => handleReview('认识')} disabled={isSubmitting} variant="success">
            认识
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LearnPage; 