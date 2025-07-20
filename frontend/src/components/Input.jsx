import React from 'react';

const Input = React.forwardRef(({ type = 'text', placeholder, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      placeholder={placeholder}
      className="w-full px-4 py-2 border rounded-md bg-morandi-bg border-morandi-text-secondary text-morandi-text-primary placeholder-morandi-text-secondary focus:outline-none focus:ring-2 focus:ring-morandi-highlight"
      {...props}
    />
  );
});

export default Input; 