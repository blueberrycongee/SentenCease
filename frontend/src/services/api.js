import axios from 'axios';
import useAuthStore from '../store/authStore';
import offlineStorage from './offlineStorage';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
});

// Online status tracking
let isOnline = navigator.onLine;
window.addEventListener('online', () => { isOnline = true; });
window.addEventListener('offline', () => { isOnline = false; });

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
    
    // If network error or server unavailable, and the request was a GET
    if (
      (error.response && [502, 503, 504].includes(error.response.status) ||
      error.message === 'Network Error') &&
      error.config.method === 'get'
    ) {
      return handleOfflineGet(error.config);
    }
    
    // If network error and the request was a review submission, store for later
    if (
      (error.message === 'Network Error' || !isOnline) &&
      error.config.url.includes('/learn/review') &&
      error.config.method === 'post'
    ) {
      const reviewData = JSON.parse(error.config.data);
      offlineStorage.storePendingReview(reviewData);
      // Return a fake successful response to allow the app to continue
      return Promise.resolve({
        data: { success: true, offlineMode: true },
        status: 200,
        statusText: 'OK (Offline Mode)',
      });
    }
    
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误数据:', error.response.data);
    }
    return Promise.reject(error);
  }
);

// Handle GET requests in offline mode
async function handleOfflineGet(config) {
  const endpoint = config.url;
  
  // Handle specific endpoints that support offline mode
  if (endpoint.includes('/learn/next-word')) {
    // Get cached words
    const cachedWords = await offlineStorage.getCachedWords();
    if (cachedWords && cachedWords.length > 0) {
      // Simulate server response with cached data
      // In a real implementation, you'd want to implement proper card selection logic here
      const randomIndex = Math.floor(Math.random() * cachedWords.length);
      return {
        data: cachedWords[randomIndex],
        status: 200,
        statusText: 'OK (Offline Cache)',
      };
    }
  }
  
  if (endpoint.includes('/learn/progress')) {
    // Get cached progress
    const cachedProgress = await offlineStorage.getProgress();
    if (cachedProgress) {
      return {
        data: cachedProgress,
        status: 200,
        statusText: 'OK (Offline Cache)',
      };
    }
  }
  
  // Default failure for unsupported endpoints
  return Promise.reject(new Error('此功能在离线模式下不可用'));
}

// Sync pending reviews when back online
api.syncPendingReviews = async () => {
  if (!isOnline) return { synced: 0, failed: 0 };
  
  const pendingReviews = await offlineStorage.getPendingReviews();
  if (!pendingReviews || pendingReviews.length === 0) return { synced: 0, failed: 0 };
  
  let synced = 0;
  let failed = 0;
  const syncedIds = [];
  
  for (const review of pendingReviews) {
    try {
      await api.post('/learn/review', {
        meaningId: review.meaningId,
        userChoice: review.userChoice,
      });
      syncedIds.push(review.id);
      synced++;
    } catch (error) {
      console.error('Failed to sync review:', error);
      failed++;
    }
  }
  
  if (syncedIds.length > 0) {
    await offlineStorage.markReviewsAsSynced(syncedIds);
  }
  
  return { synced, failed };
};

// Cache words for offline learning
api.cacheWords = async (count = 50) => {
  try {
    // Get random words for caching
    const response = await api.get(`/words/selection?count=${count}&order=random`);
    if (response.data && Array.isArray(response.data)) {
      await offlineStorage.cacheWords(response.data);
      return { success: true, count: response.data.length };
    }
    return { success: false, error: 'Invalid response data' };
  } catch (error) {
    console.error('Failed to cache words:', error);
    return { success: false, error: error.message };
  }
};

// 添加学习进度API方法
api.getLearningProgress = async () => {
  try {
    // Try to get from server
    if (isOnline) {
      const response = await api.get('/learn/progress');
      // Cache the progress data
      await offlineStorage.storeProgress(response.data);
      return response.data;
    } else {
      // Get from cache in offline mode
      return await offlineStorage.getProgress();
    }
  } catch (error) {
    console.error('获取学习进度失败:', error);
    // Try to get from cache as fallback
    try {
      return await offlineStorage.getProgress();
    } catch (cacheError) {
      console.error('获取缓存学习进度失败:', cacheError);
      throw error;
    }
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