import axios from 'axios';

// Base URL: Sử dụng biến môi trường nếu có, mặc định fallback an toàn về 'http://localhost:5000/api'
const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').trim();
// Chuẩn hóa loại bỏ dấu '/' cuối cùng nếu có để tránh trùng lặp '//' khi kết hợp với các route
const API_URL = rawApiUrl.replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor để tự động gắn JWT Token vào Header của mọi request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor để xử lý lỗi trả về (ví dụ token hết hạn)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      // Không can thiệp nếu đang thực hiện đăng nhập hoặc đang ở màn hình login
      if (!isLoginRequest && window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userData');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

