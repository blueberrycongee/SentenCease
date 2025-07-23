import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import AuthLayout from '../components/AuthLayout';
import Input from '../components/Input';
import Button from '../components/Button';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setToken } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      setToken(response.data.token);
      navigate('/learn');
    } catch (err) {
      setError(err.response?.data?.error || '登录失败，请检查您的凭据。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="登录您的账户"
      linkTo="/register"
      questionText="还没有账户？"
      linkText="立即注册"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          id="email"
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          id="password"
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        <div>
          <Button type="submit" disabled={loading} variant="primary">
            {loading ? '登录中...' : '登录'}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
};

export default LoginPage; 