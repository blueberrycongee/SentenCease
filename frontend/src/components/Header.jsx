import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { FiUser, FiLogOut, FiLogIn } from 'react-icons/fi';
import api from '../services/api';

const Header = () => {
  const { token, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [userStats, setUserStats] = useState({ email: '', learnedWordsCount: 0 });
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // 如果用户已登录，获取用户统计信息
    if (token) {
      fetchUserStats();
    }
  }, [token]);

  useEffect(() => {
    // 点击外部区域关闭下拉菜单
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const data = await api.getUserStats();
      setUserStats({
        email: data.email || '',
        learnedWordsCount: data.learnedWordsCount || 0
      });
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthAction = () => {
    if (token) {
      logout();
      navigate('/login');
    } else {
      navigate('/login');
    }
  };

  const handleLogin = () => {
    navigate('/login');
    setShowDropdown(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setShowDropdown(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-10">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-gray-800">
          句读
        </Link>
        <div className="flex items-center relative" ref={dropdownRef}>
          <div 
            onMouseEnter={() => setShowDropdown(true)}
            className="relative cursor-pointer"
          >
            <div 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition-colors duration-200"
              aria-label={token ? '用户信息' : '登录'}
            >
              <FiUser className="text-gray-600" size={20} />
            </div>
            
            {/* 用户信息弹出框 */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg overflow-hidden z-20 border border-gray-200">
                <div className="py-2">
                  {token ? (
                    <>
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-700 truncate">{userStats.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {loading ? '加载中...' : `已学习单词: ${userStats.learnedWordsCount} 个`}
                        </p>
                      </div>
                      <div className="px-2 py-2">
                        <button
                          onClick={handleLogout}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          <FiLogOut className="mr-2" size={16} />
                          退出登录
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="px-2 py-2">
                      <button
                        onClick={handleLogin}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <FiLogIn className="mr-2" size={16} />
                        登录
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 