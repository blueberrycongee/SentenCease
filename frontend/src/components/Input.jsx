import React from 'react';

const Input = React.forwardRef(({ type = 'text', placeholder, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all duration-300"
      {...props}
    />
  );
});

export default Input; 