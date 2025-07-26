/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'morandi-bg': '#e1dedd',
        'morandi-card': '#c3beba',
        'morandi-text-primary': '#685c53',
        'morandi-text-secondary': '#867d75',
        'morandi-highlight': '#a49d98',
      },
      fontFamily: {
        sans: ['"Noto Sans"', '"Noto Sans SC"', 'sans-serif'],
      },
      keyframes: {
        'slide-out-left': {
          '0%': { transform: 'translateX(0) scale(1)', opacity: '1', zIndex: '10' },
          '100%': { transform: 'translateX(-150%) scale(0.8)', opacity: '0', zIndex: '1' }
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(150%) scale(0.8)', opacity: '0', zIndex: '1' },
          '100%': { transform: 'translateX(0) scale(1)', opacity: '1', zIndex: '10' }
        },
        'slide-to-center': {
          '0%': { transform: 'translateX(0) rotate(8deg) scale(1)', opacity: '0.9', zIndex: '1' },
          '100%': { transform: 'translateX(-50%) rotate(0) scale(1.05)', opacity: '1', zIndex: '10' }
        },
        'slide-to-center-from-left': {
          '0%': { transform: 'translateX(0) rotate(-8deg) scale(1)', opacity: '0.9', zIndex: '1' },
          '100%': { transform: 'translateX(50%) rotate(0) scale(1.05)', opacity: '1', zIndex: '10' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        slideOutLeft: {
          '0%': { transform: 'translateX(0) rotate(0)', opacity: '1' },
          '100%': { transform: 'translateX(-200%) rotate(-20deg)', opacity: '0' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(200%) rotate(20deg)', opacity: '0' },
          '100%': { transform: 'translateX(0) rotate(0)', opacity: '1' },
        },
        slideToCenter: {
          '0%': { transform: 'translateX(100px) rotate(8deg)', opacity: '0.9' },
          '100%': { transform: 'translateX(0) rotate(0)', opacity: '1' },
        },
        slideToCenterFromLeft: {
          '0%': { transform: 'translateX(-100px) rotate(-8deg)', opacity: '0.9' },
          '100%': { transform: 'translateX(0) rotate(0)', opacity: '1' },
        },
        swipeLeft: {
          '0%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(-20px)' },
          '100%': { transform: 'translateX(0)' },
        },
        swipeRight: {
          '0%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(20px)' },
          '100%': { transform: 'translateX(0)' },
        },
        swipeUp: {
          '0%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
          '100%': { transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        }
      },
      animation: {
        'slide-out-left': 'slide-out-left 0.5s ease-in-out forwards',
        'slide-in-right': 'slide-in-right 0.5s ease-in-out forwards',
        'slide-to-center': 'slide-to-center 0.5s ease-in-out forwards',
        'slide-to-center-from-left': 'slide-to-center-from-left 0.5s ease-in-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'swipe-left': 'swipeLeft 1.5s ease-in-out infinite',
        'swipe-right': 'swipeRight 1.5s ease-in-out infinite',
        'swipe-up': 'swipeUp 1.5s ease-in-out infinite',
        'pulse': 'pulse 1.5s ease-in-out infinite',
      }
    },
  },
  plugins: [],
} 