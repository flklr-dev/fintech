import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveSecurely, getSecurely, deleteSecurely } from '../utils/secureStorage';

// Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  // Add other user profile fields as needed
}

// Constants
const AUTH_TOKEN_KEY = 'auth_token';

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: 'http://192.168.1.118:5000/api/v1', // Update to match server's route pattern
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (error.response.status === 401) {
        console.error('Authentication error:', error.response.data);
      } else {
        console.error('API error:', error.response.data);
      }
    } else if (error.request) {
      // The request was made but no response received
      console.error('Network error: No response received');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
    return Promise.reject(error);
  }
);

// Auth service methods
export const authService = {
  // Token management
  setToken: async (token: string): Promise<void> => {
    try {
      // Use secureStorage.saveSecurely instead of AsyncStorage for secure token storage
      await saveSecurely('auth_token', { token });
    } catch (error) {
      console.error('Error saving token:', error);
    }
  },

  getToken: async (): Promise<string | null> => {
    try {
      // Use secure storage to retrieve token
      const data = await getSecurely('auth_token');
      return data?.token || null;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  clearToken: async (): Promise<void> => {
    try {
      // Use secure storage to clear token
      await deleteSecurely('auth_token');
    } catch (error) {
      console.error('Error clearing token:', error);
    }
  },

  // Auth methods
  login: async (credentials: LoginRequest): Promise<string> => {
    try {
      const response: AxiosResponse = await axiosInstance.post('/auth/login', credentials);
      const { token } = response.data;
      await authService.setToken(token);
      return token;
    } catch (error) {
      const axiosError = error as AxiosError<{message?: string}>;
      throw new Error(
        axiosError.response?.data?.message || 'Failed to login. Please try again.'
      );
    }
  },

  register: async (userData: RegisterRequest): Promise<string> => {
    try {
      // Update endpoint from /auth/register to /auth/signup to match the server
      const response: AxiosResponse = await axiosInstance.post('/auth/signup', userData);
      const { token } = response.data;
      await authService.setToken(token);
      return token;
    } catch (error) {
      const axiosError = error as AxiosError<{message?: string}>;
      throw new Error(
        axiosError.response?.data?.message || 'Failed to register. Please try again.'
      );
    }
  },

  logout: async (): Promise<void> => {
    try {
      await authService.clearToken();
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Failed to logout. Please try again.');
    }
  },

  loginWithGoogle: async (googleToken: string): Promise<string> => {
    try {
      const response: AxiosResponse = await axiosInstance.post('/auth/google', { token: googleToken });
      const { token } = response.data;
      await authService.setToken(token);
      return token;
    } catch (error) {
      const axiosError = error as AxiosError<{message?: string}>;
      throw new Error(
        axiosError.response?.data?.message || 'Failed to login with Google. Please try again.'
      );
    }
  }
};

// API service methods
export const apiService = {
  // User profile methods
  getUserProfile: async (): Promise<UserProfile> => {
    try {
      const response: AxiosResponse = await axiosInstance.get('/user/profile');
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{message?: string}>;
      throw new Error(
        axiosError.response?.data?.message || 'Failed to fetch user profile. Please try again.'
      );
    }
  },

  updateUserProfile: async (profileData: Partial<UserProfile>): Promise<UserProfile> => {
    try {
      const response: AxiosResponse = await axiosInstance.put('/user/profile', profileData);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{message?: string}>;
      throw new Error(
        axiosError.response?.data?.message || 'Failed to update profile. Please try again.'
      );
    }
  }
};

export default { authService, apiService }; 