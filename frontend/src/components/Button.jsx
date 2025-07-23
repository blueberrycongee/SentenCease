import React from 'react';

const Button = ({ children, onClick, type = 'button', disabled = false, variant = 'primary', className = '' }) => {
  const baseClasses = 'border rounded-lg px-7 py-3 font-medium text-base focus:outline-none transition-all duration-200 transform hover:-translate-y-0.5 shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    success: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',   // 认识
    warning: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',       // 模糊
    danger: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',            // 不认识
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