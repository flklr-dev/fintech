import api from './api';
import { saveSecurely, deleteSecurely } from '../utils/secureStorage';

// User registration
export const register = async (userData) => {
  try {
    const response = await api.post('/auth/signup', userData);
    
    if (response.data && response.data.token) {
      // Save token securely
      await saveSecurely('auth_token', {
        token: response.data.token,
        user: response.data.data.user
      });
    }
    
    return response.data;
  } catch (error) {
    // Format MongoDB duplicate key errors into user-friendly messages
    if (error.response && error.response.data) {
      const errorData = error.response.data;
      
      // Handle MongoDB duplicate key error
      if (errorData.message && errorData.message.includes('E11000') && 
          errorData.message.includes('email')) {
        throw new Error('This email address is already registered');
      }
      
      // Throw the original error message if it exists
      throw errorData;
    }
    
    // Handle network errors
    if (error.message && error.message.includes('Network Error')) {
      throw new Error('Network Error: Unable to connect to the server');
    }
    
    // Generic error
    throw new Error('Registration failed. Please try again.');
  }
};

// User login
export const login = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    
    if (response.data && response.data.token) {
      // Save token securely
      await saveSecurely('auth_token', {
        token: response.data.token,
        user: response.data.data.user
      });
    }
    
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Login failed');
  }
};

// User logout
export const logout = async () => {
  try {
    // Delete token from secure storage
    await deleteSecurely('auth_token');
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}; 