import React from 'react';

const Button = ({ children, onClick, type = 'button', disabled = false, variant = 'primary', className = '' }) => {
  const baseClasses = 'px-6 py-3 font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-slate-300 text-slate-800 hover:bg-slate-400/80 focus:ring-slate-400',
    success: 'bg-emerald-200 text-emerald-900 hover:bg-emerald-300/80 focus:ring-emerald-400',
    warning: 'bg-amber-200 text-amber-900 hover:bg-amber-300/80 focus:ring-amber-400',
    danger: 'bg-rose-200 text-rose-900 hover:bg-rose-300/80 focus:ring-rose-400',
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