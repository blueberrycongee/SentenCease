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
    <header className="bg-morandi-card shadow-md">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-morandi-text-primary">
          句读 SentenCease
        </Link>
        <div>
          {token ? (
            <button
              onClick={handleLogout}
              className="px-4 py-2 font-semibold rounded-md bg-morandi-text-primary text-white hover:bg-morandi-highlight"
            >
              Logout
            </button>
          ) : (
            <div className="space-x-4">
              <Link to="/login" className="text-morandi-text-primary hover:text-morandi-highlight">Login</Link>
              <Link to="/register" className="px-4 py-2 font-semibold rounded-md bg-morandi-text-primary text-white hover:bg-morandi-highlight">Register</Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header; 