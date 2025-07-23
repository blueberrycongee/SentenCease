import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { FiUser } from 'react-icons/fi'; // Using a simple user icon

const Header = () => {
  const { token, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleAuthAction = () => {
    if (token) {
      logout();
      navigate('/login');
    } else {
      navigate('/login');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-10">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-gray-800">
          句读
        </Link>
        <div className="flex items-center">
          <button
            onClick={handleAuthAction}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition-colors duration-200"
            aria-label={token ? 'Logout' : 'Login'}
          >
            <FiUser className="text-gray-600" size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header; 