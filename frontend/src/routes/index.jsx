import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import LearnPage from '../pages/LearnPage';
import ProtectedRoute from '../components/ProtectedRoute';
import SelectWordsPage from '../pages/SelectWordsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'learn',
        element: (
          <ProtectedRoute>
            <LearnPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'select-words',
        element: (
          <ProtectedRoute>
            <SelectWordsPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

export default router; 