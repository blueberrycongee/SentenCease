import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const Header = () => {
  const { token, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-gray-800 shadow-lg">
      <nav className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-white hover:text-teal-400 transition-colors duration-300">
          句读
        </Link>
        <div className="flex items-center space-x-4">
          {token ? (
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-500 text-white hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-opacity-75 transition-all duration-300"
            >
              登出
            </button>
          ) : (
            <div className="hidden sm:flex items-center space-x-4">
              <Link to="/login" className="text-gray-300 hover:text-teal-400 transition-colors duration-300">登录</Link>
              <Link to="/register" className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-500 text-white hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-opacity-75 transition-all duration-300">
                注册
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header; 