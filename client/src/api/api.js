import axios from 'axios';
// import { API_URL } from '@env';
import { getSecurely } from '../utils/secureStorage';

// Create a base axios instance with baseURL
const api = axios.create({
  baseURL: 'http://192.168.1.118:5000/api/v1', // Update to match server's route pattern
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Add a request interceptor to include auth token
api.interceptors.request.use(
  async (config) => {
    try {
      // Get the token from secure storage
      const authData = await getSecurely('auth_token');
      
      // If token exists, add to headers
      if (authData && authData.token) {
        config.headers.Authorization = `Bearer ${authData.token}`;
        console.log('Adding auth token to request');
      } else {
        console.log('No auth token found for request');
      }
      
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
      
      return config;
    } catch (error) {
      console.error('Error in request interceptor:', error);
      return config;
    }
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log(`API Response [${response.status}]: ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  (error) => {
    // Handle specific error cases
    if (error.response) {
      // Server responded with an error status
      console.error('API error response:', {
        status: error.response.status,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        data: error.response.data
      });
      
      // Handle 401 unauthorized (e.g., token expired)
      if (error.response.status === 401) {
        console.error('Authentication error - user needs to login again');
        // TODO: Implement proper auth logout or token refresh logic here
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network error - no response received:', {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase()
      });
    } else {
      // Something else caused the error
      console.error('Error setting up request:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api; 