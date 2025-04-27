import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { observer } from 'mobx-react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Google from 'expo-auth-session/providers/google';
import { runInAction } from 'mobx';
import { theme } from '../theme';
import { authViewModel } from '../viewmodels/authViewModel';
import InputField from '../components/InputField';
import GoogleButton from '../components/GoogleButton';
import MessageDialog from '../components/MessageDialog';

// Define the navigation prop type
type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Budgets: undefined;
  Transactions: undefined;
  Goals: undefined;
  Reports: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen = observer(() => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Form validation tracking
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  // Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogProps, setDialogProps] = useState({
    type: 'error' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
    actionText: '',
    onAction: () => {},
  });

  // Google Sign-In
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    clientId: 'YOUR_WEB_CLIENT_ID',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
    iosClientId: 'YOUR_IOS_CLIENT_ID',
  });

  // Add useEffect for session check
  useEffect(() => {
    checkExistingSession();
  }, []);

  // Check if user is already logged in
  const checkExistingSession = async () => {
    // If the user is already logged in, navigate directly to Home
    if (authViewModel.isLoggedIn) {
      navigation.navigate('Home');
    }
  };

  // Handle input changes with validation
  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (touched.email) {
      authViewModel.validateEmail(text);
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (touched.password) {
      // Simple presence validation for login
      authViewModel.passwordError = text.length === 0 ? 'This field is required' : null;
    }
  };

  // Mark fields as touched on blur
  const handleEmailBlur = () => {
    setTouched({ ...touched, email: true });
    if (email.trim() === '') {
      runInAction(() => {
        authViewModel.emailError = 'This field is required';
      });
    } else {
      authViewModel.validateEmail(email);
    }
  };

  const handlePasswordBlur = () => {
    setTouched({ ...touched, password: true });
    runInAction(() => {
      authViewModel.passwordError = password.length === 0 ? 'This field is required' : null;
    });
  };

  // Handle login button press
  const handleLogin = async () => {
    // Validate inputs
    const isEmailValid = authViewModel.validateEmail(email);
    const isPasswordValid = password.length > 0;
    
    if (!isEmailValid || !isPasswordValid) {
      if (!isPasswordValid) {
        runInAction(() => {
          authViewModel.passwordError = 'This field is required';
        });
      }
      return;
    }
    
    // Attempt login
    const success = await authViewModel.login({ email, password });
    
    if (success) {
      showDialog({
        type: 'success',
        title: 'Login Successful',
        message: 'You have been logged in successfully.',
        onAction: () => navigation.navigate('Home'),
      });
    } else if (authViewModel.error) {
      showDialog({
        type: 'error',
        title: 'Login Failed',
        message: authViewModel.error
      });
    }
  };

  // Handle Google login
  const handleGoogleLogin = async (token: string) => {
    const success = await authViewModel.signInWithGoogle(token);
    
    if (success) {
      showDialog({
        type: 'success',
        title: 'Google Login Successful',
        message: 'You have been logged in successfully with Google.',
        onAction: () => navigation.navigate('Home'),
      });
    } else if (authViewModel.error) {
      showDialog({
        type: 'error',
        title: 'Google Login Failed',
        message: authViewModel.error
      });
    }
  };

  // Helper function to show dialog
  const showDialog = ({ type, title, message, actionText, onAction }: {
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    actionText?: string,
    onAction?: () => void,
  }) => {
    setDialogProps({
      type,
      title,
      message,
      actionText: actionText || '',
      onAction: onAction || (() => {}),
    });
    setDialogVisible(true);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to your account to continue
          </Text>
        </View>

        <View style={styles.form}>
          <InputField
            label="Email"
            placeholder="your.email@example.com"
            value={email}
            onChangeText={handleEmailChange}
            onBlur={handleEmailBlur}
            error={authViewModel.emailError}
            touched={touched.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <InputField
            label="Password"
            placeholder="Your password"
            value={password}
            onChangeText={handlePasswordChange}
            onBlur={handlePasswordBlur}
            error={authViewModel.passwordError}
            touched={touched.password}
            isPassword
          />

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              authViewModel.isLoading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={authViewModel.isLoading}
          >
            {authViewModel.isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <GoogleButton 
            onPress={() => promptGoogleAsync()} 
            isLoading={authViewModel.isLoading}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Message Dialog */}
      <MessageDialog
        visible={dialogVisible}
        type={dialogProps.type}
        title={dialogProps.title}
        message={dialogProps.message}
        actionText={dialogProps.actionText}
        onAction={dialogProps.onAction}
        onDismiss={() => setDialogVisible(false)}
        autoDismiss={dialogProps.type === 'success'} // Auto dismiss success messages
      />
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: theme.spacing.lg,
  },
  header: {
    marginTop: 60,
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textLight,
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.md,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: 14,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.gray,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    color: theme.colors.textLight,
    paddingHorizontal: theme.spacing.sm,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
  },
  footerText: {
    color: theme.colors.textLight,
    fontSize: 14,
  },
  footerLink: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default LoginScreen; 