import React from 'react';

const Spinner = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-morandi-highlight border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
};

export default Spinner; 