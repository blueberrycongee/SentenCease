import React from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import Button from '../components/Button';

const HomePage = () => {
  const { token } = useAuthStore();

  return (
    <div className="text-center">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold text-gray-900">
          用母语的方式学英语
        </h1>
        <p className="mt-6 text-lg md:text-xl text-gray-600">
          告别死记硬背。在真实语境中学习单词，每一句都为你精心挑选，让记忆变得自然而持久。
        </p>
      </div>
      <div className="mt-12 flex flex-col sm:flex-row justify-center items-center gap-4">
        <Link to="/select-words">
          <Button variant="primary" className="w-full sm:w-auto px-8 py-4 text-lg">
            选择今日词书
          </Button>
        </Link>
        <Link to="/learn">
          <Button variant="success" className="w-full sm:w-auto px-8 py-4 text-lg bg-transparent text-blue-600 hover:bg-blue-100">
            开始学习
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default HomePage; 