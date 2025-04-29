import axios from 'axios';
// import { API_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create a base axios instance with baseURL
const api = axios.create({
  baseURL: 'http://192.168.1.118:5000/api/v1', // Update to match server's route pattern
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // 5 seconds timeout
});

// Add a request interceptor to include auth token
api.interceptors.request.use(
  async (config) => {
    // Try to get token from AsyncStorage
    const token = await AsyncStorage.getItem('auth_token');
    
    // If token exists, add it to the request headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    
    return config;
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
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 response and not already retrying, attempt to refresh token or log out
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Clear token as it's invalid
      await AsyncStorage.removeItem('auth_token');
      
      // You could implement token refresh logic here if your API supports it
      
      // Return to login screen (handled by the auth state in AuthContext)
    }
    
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

// Helper methods for token management
const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

const clearAuthToken = () => {
  delete api.defaults.headers.common['Authorization'];
};

// Attach token management methods to the api object
api.setAuthToken = setAuthToken;
api.clearAuthToken = clearAuthToken;

export default api; 