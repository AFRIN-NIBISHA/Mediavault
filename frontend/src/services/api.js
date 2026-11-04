import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000 // 60s for heavy file operations
});

// Request interceptor: attach JWT token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('mediavault_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor: handle 401 unauth
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // Don't auto-redirect on public share routes
      if (!window.location.pathname.startsWith('/share/')) {
        localStorage.removeItem('mediavault_token');
        localStorage.removeItem('mediavault_user');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

