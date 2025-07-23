import React from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import Button from '../components/Button';

const HomePage = () => {
  const { token } = useAuthStore();

  return (
    <div className="text-center">
      <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-tight">
        欢迎来到 <span className="text-teal-400">句读</span>
      </h1>
      <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
        在真实的语境中学习词汇。我们相信，通过句子理解单词，比孤立地记忆词义和释义更有效。
      </p>
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
        {token ? (
          <Link to="/learn" className="w-full sm:w-auto">
            <Button variant="primary" className="sm:px-10">
              开始学习
            </Button>
          </Link>
        ) : (
          <>
            <Link to="/register" className="w-full sm:w-auto">
              <Button variant="primary" className="sm:px-10">
                免费注册
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="success" className="sm:px-10">
                登录
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage; 