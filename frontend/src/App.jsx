import { Outlet, useLocation } from 'react-router-dom';
import Header from './components/Header';
import './App.css';

function App() {
  const location = useLocation();
  const noHeaderPaths = ['/login', '/register'];

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100">
      {!noHeaderPaths.includes(location.pathname) && <Header />}
      <main className="flex-grow flex items-center justify-center">
        <div className="w-full max-w-4xl mx-auto p-4">
        <Outlet />
        </div>
      </main>
    </div>
  );
}

export default App;
