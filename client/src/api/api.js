import axios from 'axios';
// import { API_URL } from '@env';
import { getSecurely } from '../utils/secureStorage';

// Create a base axios instance with baseURL
const api = axios.create({
  baseURL: 'http://192.168.1.118:5000/api/v1', // Update to match server's route pattern
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include auth token
api.interceptors.request.use(
  async (config) => {
    // Get the token from secure storage
    const authData = await getSecurely('auth_token');
    
    // If token exists, add to headers
    if (authData && authData.token) {
      config.headers.Authorization = `Bearer ${authData.token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle specific error cases
    if (error.response) {
      // Server responded with an error status
      console.error('API error:', error.response.data);
      
      // Handle 401 unauthorized (e.g., token expired)
      if (error.response.status === 401) {
        // Implement logout or token refresh logic here
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received:', error.request);
    } else {
      // Something else caused the error
      console.error('Error setting up request:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api; 