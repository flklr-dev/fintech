import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, LoginRequest, RegisterRequest } from '../services/apiService';

// Define types
type AuthContextType = {
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  userId: string | null;
  userName: string | null;
  email: string | null;
  
  // Form validation states
  emailError: string | null;
  passwordError: string | null;
  confirmPasswordError: string | null;
  nameError: string | null;
  
  // Password strength
  passwordStrength: 'weak' | 'medium' | 'strong' | 'very-strong' | null;
  
  // Methods
  login: (data: LoginRequest) => Promise<boolean>;
  register: (data: RegisterRequest, confirmPassword: string) => Promise<boolean>;
  signInWithGoogle: (token: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
  resetErrors: () => void;
  validateEmail: (email: string) => boolean;
  validatePassword: (password: string) => boolean;
  validateConfirmPassword: (password: string, confirmPassword: string) => boolean;
  validateName: (name: string) => boolean;
};

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isLoading: false,
  error: null,
  userId: null,
  userName: null,
  email: null,
  
  emailError: null,
  passwordError: null,
  confirmPasswordError: null,
  nameError: null,
  
  passwordStrength: null,
  
  login: async () => false,
  register: async () => false,
  signInWithGoogle: async () => false,
  logout: async () => false,
  resetErrors: () => {},
  validateEmail: () => false,
  validatePassword: () => false,
  validateConfirmPassword: () => false,
  validateName: () => false,
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // User data
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  
  // Form validation states
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  
  // Password strength
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | 'very-strong' | null>(null);

  // Check initial auth state on load
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const token = await authService.getToken();
        setIsLoggedIn(!!token);
      } catch (error) {
        console.error('Failed to check auth state:', error);
        setIsLoggedIn(false);
      }
    };
    
    checkAuthState();
  }, []);

  // Reset all form errors
  const resetErrors = () => {
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);
    setNameError(null);
  };

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    setEmailError(isValid ? null : 'Invalid email address');
    return isValid;
  };

  // Validate password strength
  const validatePassword = (password: string): boolean => {
    // Minimum 8 characters
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      setPasswordStrength('weak');
      return false;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    // Calculate strength
    let strength = 0;
    if (hasUppercase) strength++;
    if (hasLowercase) strength++;
    if (hasNumber) strength++;
    if (hasSpecial) strength++;
    
    // Set strength level
    if (strength === 1) setPasswordStrength('weak');
    else if (strength === 2) setPasswordStrength('medium');
    else if (strength === 3) setPasswordStrength('strong');
    else if (strength === 4) setPasswordStrength('very-strong');
    
    // All requirements met?
    const isValid = hasUppercase && hasLowercase && hasNumber && hasSpecial;
    setPasswordError(isValid 
      ? null 
      : 'Password must contain uppercase, lowercase, number, and special character');
    
    return isValid;
  };

  // Validate password confirmation
  const validateConfirmPassword = (password: string, confirmPassword: string): boolean => {
    const isValid = password === confirmPassword;
    setConfirmPasswordError(isValid ? null : 'Passwords do not match');
    return isValid;
  };

  // Validate name
  const validateName = (name: string): boolean => {
    const isValid = name.trim().length > 0;
    setNameError(isValid ? null : 'Name is required');
    return isValid;
  };

  // Login flow
  const login = async (data: LoginRequest): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Validate input
      const isEmailValid = validateEmail(data.email);
      const isPasswordValid = data.password.length > 0;
      
      if (!isEmailValid || !isPasswordValid) {
        if (!isPasswordValid) setPasswordError('This field is required');
        throw new Error('Please correct the form errors');
      }
      
      // Attempt login
      const token = await authService.login(data);
      
      // Extract user data from token or fetch user profile
      // For demonstration, setting dummy values
      setIsLoggedIn(true);
      setUserId('user-id'); // Replace with actual user ID extraction logic
      setUserName('User'); // Replace with actual user name extraction logic
      setEmail(data.email);
      
      return true;
    } catch (error: any) {
      // Handle specific API errors
      if (error.message.includes('Invalid email or password')) {
        setError('Invalid email or password');
      } else if (error.message.includes('does not exist')) {
        setError('Account does not exist');
      } else {
        setError(error.message || 'Login failed. Please try again.');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Register flow
  const register = async (data: RegisterRequest, confirmPassword: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Validate all inputs
      const isNameValid = validateName(data.name);
      const isEmailValid = validateEmail(data.email);
      const isPasswordValid = validatePassword(data.password);
      const isConfirmPasswordValid = validateConfirmPassword(data.password, confirmPassword);
      
      if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
        throw new Error('Please correct the form errors');
      }
      
      // Attempt registration
      await authService.register(data);
      
      return true;
    } catch (error: any) {
      // Handle specific API errors
      if (error.message.includes('email already exists')) {
        setError('Email already exists');
      } else {
        setError(error.message || 'Registration failed. Please try again.');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign-in
  const signInWithGoogle = async (token: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const authToken = await authService.loginWithGoogle(token);
      
      // Extract user data from token or fetch user profile
      // For demonstration, setting dummy values
      setIsLoggedIn(true);
      setUserId('google-user-id'); // Replace with actual user ID extraction logic
      setUserName('Google User'); // Replace with actual user name extraction logic
      setEmail('google@example.com'); // Replace with actual email extraction logic
      
      return true;
    } catch (error: any) {
      setError(error.message || 'Google sign-in failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout flow
  const logout = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      await authService.clearToken();
      
      setIsLoggedIn(false);
      setUserId(null);
      setUserName(null);
      setEmail(null);
      
      return true;
    } catch (error) {
      setError('Logout failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    isLoggedIn,
    isLoading,
    error,
    userId,
    userName,
    email,
    
    emailError,
    passwordError,
    confirmPasswordError,
    nameError,
    
    passwordStrength,
    
    login,
    register,
    signInWithGoogle,
    logout,
    resetErrors,
    validateEmail,
    validatePassword,
    validateConfirmPassword,
    validateName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 