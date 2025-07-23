import React from 'react';

const Button = ({ children, onClick, type = 'button', disabled = false, variant = 'primary', className = '' }) => {
  const baseClasses = 'w-full px-6 py-3 font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100';

  const variants = {
    primary: 'bg-teal-500 text-white hover:bg-teal-600 focus:ring-teal-400',
    success: 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-400',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-400',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-400',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button; 