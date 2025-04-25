import { makeAutoObservable, runInAction } from 'mobx';
import { authService, LoginRequest, RegisterRequest } from '../services/apiService';
import * as Google from 'expo-auth-session/providers/google';
import AsyncStorage from '@react-native-async-storage/async-storage';

// For Google Auth - replace with your actual values
const GOOGLE_CLIENT_ID = 'your-client-id.apps.googleusercontent.com';
const GOOGLE_EXPO_CLIENT_ID = 'your-expo-client-id.apps.googleusercontent.com';

class AuthViewModel {
  // Auth state
  isLoggedIn = false;
  isLoading = false;
  error: string | null = null;
  
  // User data
  userId: string | null = null;
  userName: string | null = null;
  email: string | null = null;
  
  // Form validation states
  emailError: string | null = null;
  passwordError: string | null = null;
  confirmPasswordError: string | null = null;
  nameError: string | null = null;
  
  // Password strength
  passwordStrength: 'weak' | 'medium' | 'strong' | 'very-strong' | null = null;

  constructor() {
    makeAutoObservable(this);
    this.checkInitialAuthState();
  }

  private async checkInitialAuthState() {
    try {
      this.isLoading = true;
      const token = await authService.getToken();
      
      if (token) {
        // If a token exists, validate it 
        // (In a real app you might want to decode the JWT to check expiration)
        runInAction(() => {
          this.isLoggedIn = true;
          // In a production app, you would:
          // 1. Decode the JWT to get user info 
          // 2. Or make an API call to /me endpoint to get user profile
          // For now, we'll set some placeholder values
          this.userId = 'user-id';
          this.userName = 'User';
        });
      } else {
        runInAction(() => {
          this.isLoggedIn = false;
        });
      }
    } catch (error) {
      console.error('Failed to check auth state:', error);
      runInAction(() => {
        this.isLoggedIn = false;
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Reset all form errors
  resetErrors() {
    runInAction(() => {
      this.error = null;
      this.emailError = null;
      this.passwordError = null;
      this.confirmPasswordError = null;
      this.nameError = null;
    });
  }

  // Validate email format
  validateEmail(email: string): boolean {
    if (!email.trim()) {
      runInAction(() => {
        this.emailError = 'This field is required';
      });
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    runInAction(() => {
      this.emailError = isValid ? null : 'Invalid email address';
    });
    return isValid;
  }

  // Validate password strength
  validatePassword(password: string): boolean {
    // First check if password is empty
    if (!password) {
      runInAction(() => {
        this.passwordError = 'This field is required';
        this.passwordStrength = 'weak';
      });
      return false;
    }
    
    // Minimum 8 characters
    if (password.length < 8) {
      runInAction(() => {
        this.passwordError = 'Password must be at least 8 characters';
        this.passwordStrength = 'weak';
      });
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
    
    // Set strength level and validation result
    const isValid = hasUppercase && hasLowercase && hasNumber && hasSpecial;
    
    runInAction(() => {
      if (strength === 1) this.passwordStrength = 'weak';
      else if (strength === 2) this.passwordStrength = 'medium';
      else if (strength === 3) this.passwordStrength = 'strong';
      else if (strength === 4) this.passwordStrength = 'very-strong';
      
      this.passwordError = isValid 
        ? null 
        : 'Password must contain uppercase, lowercase, number, and special character';
    });
    
    return isValid;
  }

  // Validate password confirmation
  validateConfirmPassword(password: string, confirmPassword: string): boolean {
    if (!confirmPassword) {
      runInAction(() => {
        this.confirmPasswordError = 'This field is required';
      });
      return false;
    }
    
    const isValid = password === confirmPassword;
    runInAction(() => {
      this.confirmPasswordError = isValid ? null : 'Passwords do not match';
    });
    return isValid;
  }

  // Validate name
  validateName(name: string): boolean {
    if (!name.trim()) {
      runInAction(() => {
        this.nameError = 'This field is required';
      });
      return false;
    }
    runInAction(() => {
      this.nameError = null;
    });
    return true;
  }

  // Login flow
  async login(data: LoginRequest) {
    try {
      this.isLoading = true;
      this.error = null;
      
      // Validate input
      const isEmailValid = this.validateEmail(data.email);
      const isPasswordValid = data.password.length > 0;
      
      if (!isEmailValid || !isPasswordValid) {
        if (!isPasswordValid) this.passwordError = 'This field is required';
        throw new Error('Please correct the form errors');
      }
      
      // Attempt login
      const token = await authService.login(data);
      
      // Store token
      await authService.setToken(token);
      
      runInAction(() => {
        this.isLoggedIn = true;
        this.userId = 'user-id'; // In a real app, extract from JWT or fetch profile
        this.userName = 'User'; // In a real app, extract from JWT or fetch profile
        this.email = data.email;
        this.isLoading = false;
      });
      
      return true;
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
        // Handle specific API errors
        if (error.message.includes('Invalid email or password')) {
          this.error = 'Invalid email or password';
        } else if (error.message.includes('does not exist')) {
          this.error = 'Account does not exist';
        } else {
          this.error = error.message || 'Login failed. Please try again.';
        }
      });
      return false;
    }
  }

  // Register flow
  async register(data: RegisterRequest, confirmPassword: string) {
    try {
      this.isLoading = true;
      this.error = null;
      
      // Validate all inputs
      const isNameValid = this.validateName(data.name);
      const isEmailValid = this.validateEmail(data.email);
      const isPasswordValid = this.validatePassword(data.password);
      const isConfirmPasswordValid = this.validateConfirmPassword(data.password, confirmPassword);
      
      if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
        throw new Error('Please correct the form errors');
      }
      
      // Attempt registration
      const token = await authService.register(data);
      
      // Store token
      await authService.setToken(token);
      
      runInAction(() => {
        this.isLoading = false;
      });
      
      return true;
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
        
        // Handle specific API errors
        if (
          error.message.includes('email already exists') || 
          error.message.includes('duplicate key error') || 
          error.message.includes('dup_key') ||
          (error.message.includes('E11000') && error.message.includes('email'))
        ) {
          this.error = 'This email address is already registered. Please use a different email or try logging in.';
        } else if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
          this.error = 'Network Error: Unable to connect to the server. Please check your internet connection.';
        } else if (error.message.includes('500') || error.message.includes('Server Error')) {
          this.error = 'Server Error: Something went wrong on our end. Please try again later.';
        } else {
          this.error = error.message || 'Registration failed. Please try again.';
        }
      });
      return false;
    }
  }

  // Google Sign-in
  async signInWithGoogle(token: string) {
    try {
      this.isLoading = true;
      this.error = null;
      
      const authToken = await authService.loginWithGoogle(token);
      
      // Store token
      await authService.setToken(authToken);
      
      runInAction(() => {
        this.isLoggedIn = true;
        this.userId = 'google-user-id'; // In a real app, extract from JWT or fetch profile
        this.userName = 'Google User'; // In a real app, extract from JWT or fetch profile
        this.email = 'google@example.com'; // In a real app, extract from JWT or fetch profile
        this.isLoading = false;
      });
      
      return true;
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
        this.error = error.message || 'Google sign-in failed. Please try again.';
      });
      return false;
    }
  }

  // Logout flow
  async logout() {
    try {
      this.isLoading = true;
      await authService.clearToken();
      
      runInAction(() => {
        this.isLoggedIn = false;
        this.userId = null;
        this.userName = null;
        this.email = null;
        this.isLoading = false;
      });
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      runInAction(() => {
        this.isLoading = false;
        this.error = 'Logout failed. Please try again.';
      });
      return false;
    }
  }
}

// Create a singleton instance
export const authViewModel = new AuthViewModel(); 