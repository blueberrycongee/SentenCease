import React from 'react';
import { Link } from 'react-router-dom';

const AuthLayout = ({ children, title, linkTo, linkText, questionText }) => {
  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-6">
        <h2 className="text-3xl font-bold text-center text-white">{title}</h2>
        {children}
        <p className="text-center text-sm text-gray-400">
          {questionText}{' '}
          <Link to={linkTo} className="font-medium text-teal-400 hover:text-teal-300">
            {linkText}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AuthLayout; 