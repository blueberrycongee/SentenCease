import React from 'react';

const AuthLayout = ({ children, title }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-morandi-bg">
      <div className="w-full max-w-md p-8 space-y-6 rounded-lg shadow-md bg-morandi-card">
        <h2 className="text-2xl font-bold text-center text-morandi-text-primary">{title}</h2>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout; 