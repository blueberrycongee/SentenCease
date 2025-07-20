import React from 'react';

const Button = ({ children, onClick, type = 'button', disabled = false }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full px-4 py-2 font-bold text-white rounded-md bg-morandi-text-primary hover:bg-morandi-highlight focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-morandi-highlight disabled:opacity-50"
    >
      {children}
    </button>
  );
};

export default Button; 