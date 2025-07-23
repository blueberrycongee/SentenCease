import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import AuthLayout from '../components/AuthLayout';
import Input from '../components/Input';
import Button from '../components/Button';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/register', { email, password });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || '注册失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="创建新账户"
      linkTo="/login"
      questionText="已经有账户了？"
      linkText="直接登录"
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
            {loading ? '注册中...' : '注册'}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage; 