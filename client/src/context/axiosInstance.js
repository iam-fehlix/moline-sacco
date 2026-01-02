import axios from 'axios';
import Cookies from 'js-cookie';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000/api',
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // Don't force Content-Type header for FormData (let browser set it automatically)
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
