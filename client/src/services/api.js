import axios from 'axios';

// Lấy base URL từ biến môi trường (nếu có), hoặc mặc định là cổng 5000
// Lưu ý: Nếu backend của bạn đang chạy ở cổng 5174, hãy sửa lại đường dẫn này
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
      // Nếu lỗi 401 Unauthorized, tự động xoá token và chuyển về trang đăng nhập
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userData');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
