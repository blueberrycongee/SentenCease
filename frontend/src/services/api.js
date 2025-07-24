import axios from 'axios';
import useAuthStore from '../store/authStore';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API请求错误:', error);
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误数据:', error.response.data);
    }
    return Promise.reject(error);
  }
);

// 添加学习进度API方法
api.getLearningProgress = async () => {
  try {
    const response = await api.get('/learn/progress');
    return response.data;
  } catch (error) {
    console.error('获取学习进度失败:', error);
    throw error;
  }
};

// 获取用户统计信息API方法
api.getUserStats = async () => {
  try {
    const response = await api.get('/user/stats');
    return response.data;
  } catch (error) {
    console.error('获取用户统计信息失败:', error);
    throw error;
  }
};

export default api; 