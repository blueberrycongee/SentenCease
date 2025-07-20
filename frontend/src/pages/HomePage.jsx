import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-morandi-bg text-morandi-text-primary">
      <div className="text-center">
        <h1 className="text-5xl font-bold">Welcome to SentenCease</h1>
        <p className="mt-4 text-xl text-morandi-text-secondary">Your contextual vocabulary learning app.</p>
        <div className="mt-8 space-x-4">
          <Link
            to="/login"
            className="px-6 py-3 font-semibold text-white rounded-md bg-morandi-text-primary hover:bg-morandi-highlight"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-6 py-3 font-semibold rounded-md bg-morandi-card text-morandi-text-primary hover:bg-morandi-highlight hover:text-white"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 