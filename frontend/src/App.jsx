import { Outlet, useLocation } from 'react-router-dom';
import Header from './components/Header';
import './App.css';

function App() {
  const location = useLocation();
  const noHeaderPaths = ['/login', '/register'];

  return (
    <div className="min-h-screen bg-morandi-bg">
      {!noHeaderPaths.includes(location.pathname) && <Header />}
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default App;
