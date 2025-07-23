import { Outlet, useLocation } from 'react-router-dom';
import Header from './components/Header';
import './App.css';

function App() {
  const location = useLocation();
  const noHeaderPaths = ['/login', '/register'];
  const showHeader = !noHeaderPaths.includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F5F7] text-gray-800 font-sans">
      {showHeader && <Header />}
      <main className={`flex-grow flex items-center justify-center ${showHeader ? 'pt-20' : ''}`}>
        <div className="w-full max-w-4xl mx-auto p-4">
        <Outlet />
        </div>
      </main>
    </div>
  );
}

export default App;
