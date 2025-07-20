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
      setError(err.response?.data?.error || 'Failed to fetch the next word.');
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
      fetchNextWord(); // Fetch the next word after a successful review
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit your review.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const highlightLemma = (sentence, lemma) => {
    if (!sentence || !lemma) return sentence;
    const regex = new RegExp(`\\b(${lemma})\\b`, 'gi');
    return sentence.replace(regex, `<strong class="text-morandi-highlight font-bold">$1</strong>`);
  };

  if (loading && !meaning) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 py-10">{error}</div>;
  }
  
  if (meaning && meaning.message) {
    return (
        <div className="container mx-auto max-w-2xl text-center py-20 px-6">
            <h2 className="text-3xl font-bold text-morandi-text-primary">{meaning.message}</h2>
            <p className="mt-4 text-lg text-morandi-text-secondary">Keep up the great work!</p>
        </div>
    );
  }

  if (!meaning) {
    return <div className="text-center py-10">No word to learn right now.</div>;
  }

  return (
    <div className="container mx-auto max-w-2xl text-center py-20 px-6">
      <div className="bg-morandi-card p-8 rounded-lg shadow-lg">
        <p 
          className="text-2xl text-morandi-text-primary leading-loose"
          dangerouslySetInnerHTML={{ __html: highlightLemma(meaning.exampleSentence, meaning.lemma) }}
        />
        <p className="text-lg text-morandi-text-secondary mt-4">{meaning.definition}</p>
      </div>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button onClick={() => handleReview('不认识')} disabled={isSubmitting}>
          I don't know
        </Button>
        <Button onClick={() => handleReview('模糊')} disabled={isSubmitting}>
          It's fuzzy
        </Button>
        <Button onClick={() => handleReview('认识')} disabled={isSubmitting}>
          I know it
        </Button>
      </div>
    </div>
  );
};

export default LearnPage; 