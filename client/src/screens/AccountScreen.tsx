import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  Switch, 
  Platform,
  SafeAreaView,
  StatusBar,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import AppHeader from '../components/AppHeader';
import MessageDialog from '../components/MessageDialog';
import { apiService, UserProfile } from '../services/apiService';
import BottomNavBar from '../components/BottomNavBar';
import { ScreenName } from '../components/BottomNavBar';
import { useCurrency } from '../contexts/CurrencyContext';
import { SUPPORTED_CURRENCIES } from '../utils/currencyUtils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const { width, height } = Dimensions.get('window');

const AccountScreen = () => {
  const { user: authUser, logout } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [activeScreen, setActiveScreen] = useState<ScreenName>('Home');
  const { currency, setCurrency } = useCurrency();
  
  // App preferences state
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  
  // User profile state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Confirmation dialog
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogProps, setDialogProps] = useState({
    type: 'warning' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
    actionText: '',
    onAction: () => {},
  });
  
  // Edit profile state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Change password state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<{
    current?: string;
    new?: string;
    confirm?: string;
    general?: string;
  }>({});
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | 'very-strong' | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [lastPasswordChange, setLastPasswordChange] = useState<Date | null>(null);
  
  // Fetch user profile data
  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
    setLoading(true);
      setError(null);
      const userProfile = await apiService.getUserProfile();
      setUser(userProfile);
      
      // Check for last password change date from AsyncStorage
      try {
        const lastChangeStr = await AsyncStorage.getItem('lastPasswordChange');
        if (lastChangeStr) {
          setLastPasswordChange(new Date(lastChangeStr));
        }
      } catch (err) {
        console.error('Error getting last password change date:', err);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile data');
      console.error('Error fetching user profile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const validatePassword = (password: string): boolean => {
    // Minimum 8 characters
    if (password.length < 8) {
      setPasswordErrors(prev => ({
        ...prev,
        new: 'Password must be at least 8 characters'
      }));
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
    
    if (!isValid) {
      setPasswordErrors(prev => ({
        ...prev,
        new: 'Password must contain uppercase, lowercase, number, and special character'
      }));
    } else {
      setPasswordErrors(prev => ({
        ...prev,
        new: undefined
      }));
    }
    
    return isValid;
  };

  const validateConfirmPassword = (password: string, confirmPass: string): boolean => {
    const isValid = password === confirmPass;
    
    setPasswordErrors(prev => ({
      ...prev,
      confirm: isValid ? undefined : 'Passwords do not match'
    }));
    
    return isValid;
  };

  const canChangePassword = (): boolean => {
    if (!lastPasswordChange) return true;
    
    const now = new Date();
    const daysSinceLastChange = Math.floor(
      (now.getTime() - lastPasswordChange.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysSinceLastChange >= 7;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserProfile();
  };
  
  const handleNavigation = (screen: ScreenName) => {
    setActiveScreen(screen);
    if (screen === 'Home') {
      navigation.navigate('Home' as any);
    } else if (screen === 'Budget') {
      navigation.navigate('Budget' as any);
    } else if (screen === 'Transactions') {
      navigation.navigate('Transactions' as any);
    } else if (screen === 'Reports') {
      navigation.navigate('Reports' as any);
    }
  };

  const showConfirmDialog = (props: {
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    actionText?: string,
    onAction?: () => void,
  }) => {
    setDialogProps({
      type: props.type,
      title: props.title,
      message: props.message,
      actionText: props.actionText || 'OK',
      onAction: props.onAction || (() => setDialogVisible(false)),
    });
    setDialogVisible(true);
  };

  const handleLogoutPress = () => {
    showConfirmDialog({
      type: 'warning',
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of your account?',
      actionText: 'Sign Out',
      onAction: handleLogout,
    });
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      
      // Properly clean up authentication state
      await logout();
      
      // Clear any additional tokens or cached data
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      await AsyncStorage.removeItem('token_expiry');
      
      // Reset any other session-related flags
      await AsyncStorage.removeItem('has_completed_onboarding');
      await AsyncStorage.removeItem('just_registered');
      
      // Reset the navigation stack completely to ensure a fresh login state
      // First, navigate to Login with animation disabled
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' as keyof RootStackParamList }],
      });
      
      // Let the navigation complete and then reset auth state again
      setTimeout(() => {
        setLoading(false);
        setDialogVisible(false);
      }, 150);
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
      setLoading(false);
      setDialogVisible(false);
    }
  };

  const handleEditProfile = () => {
    setEditName(user?.name || '');
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    try {
      setSaving(true);
      const updatedUser = await apiService.updateUserProfile(editName);
      setUser(updatedUser);
      setShowEditModal(false);
      showConfirmDialog({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully',
        actionText: 'Great!',
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = () => {
    if (!canChangePassword()) {
      const daysToWait = 7 - Math.floor(
        (new Date().getTime() - (lastPasswordChange?.getTime() || 0)) / (1000 * 60 * 60 * 24)
      );
      
      showConfirmDialog({
        type: 'warning',
        title: 'Password Change Restricted',
        message: `You can only change your password once every 7 days. Please try again in ${daysToWait} day${daysToWait !== 1 ? 's' : ''}.`,
      });
      return;
    }
    
    // Reset state
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordErrors({});
    setPasswordStrength(null);
    setShowPasswordModal(true);
  };
  
  const handlePasswordChange = (password: string) => {
    setNewPassword(password);
    validatePassword(password);
    
    if (confirmPassword) {
      validateConfirmPassword(password, confirmPassword);
    }
  };
  
  const handleConfirmPasswordChange = (password: string) => {
    setConfirmPassword(password);
    validateConfirmPassword(newPassword, password);
  };

  const handlePasswordFocus = () => {
    setIsPasswordFocused(true);
  };
  
  const handlePasswordBlur = () => {
    setIsPasswordFocused(false);
  };
  
  const handleSavePassword = async () => {
    // Reset any previous errors
    setPasswordErrors({});
    
    // Validate inputs
    let hasError = false;
    
    if (!currentPassword) {
      setPasswordErrors(prev => ({
        ...prev,
        current: 'Current password is required'
      }));
      hasError = true;
    }
    
    if (!newPassword) {
      setPasswordErrors(prev => ({
        ...prev,
        new: 'New password is required'
      }));
      hasError = true;
    }
    
    if (!confirmPassword) {
      setPasswordErrors(prev => ({
        ...prev,
        confirm: 'Please confirm your password'
      }));
      hasError = true;
    }
    
    if (hasError) return;
    
    // Validate password strength and confirmation
    const isPasswordValid = validatePassword(newPassword);
    const isConfirmValid = validateConfirmPassword(newPassword, confirmPassword);
    
    if (!isPasswordValid || !isConfirmValid) return;
    
    // Check that new password is different from current
    if (currentPassword === newPassword) {
      setPasswordErrors(prev => ({
        ...prev,
        new: 'New password must be different from your current password'
      }));
      return;
    }
    
    try {
      setChangingPassword(true);
      await apiService.changePassword({
        currentPassword,
        newPassword,
      });
      
      // Store the date of password change
      await AsyncStorage.setItem('lastPasswordChange', new Date().toISOString());
      setLastPasswordChange(new Date());
      
      // Show success message within the modal
      setPasswordErrors({
        general: 'Password changed successfully!'
      });
      
      // Delay closing modal slightly for better feedback
      setTimeout(() => {
        setShowPasswordModal(false);
        showConfirmDialog({
          type: 'success',
          title: 'Password Changed',
          message: 'Your password has been changed successfully.',
        });
      }, 1000);
    } catch (err: any) {
      // Don't log the error to console since it will be shown in the UI
      // Display appropriate error message based on error type
      if (err.message.includes('Current password is incorrect')) {
        setPasswordErrors({
          current: 'Current password is incorrect'
        });
      } else {
        setPasswordErrors({
          general: err.message || 'Failed to change password. Please try again.'
        });
      }
    } finally {
      setChangingPassword(false);
    }
  };

  // Navigate to Contact Support
  const navigateToContactSupport = () => {
    navigation.navigate('ContactSupport');
  };

  // Open Privacy Policy screen
  const openPrivacyPolicy = () => {
    navigation.navigate('PrivacyPolicy');
  };

  // Open Terms of Service screen
  const openTermsOfService = () => {
    navigation.navigate('TermsOfService');
  };
  
  // Get current currency name
  const getCurrentCurrencyName = () => {
    return currency.name;
  };
  
  // Render loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader showBackButton={false} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
        <BottomNavBar activeScreen={activeScreen} onPress={handleNavigation} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <AppHeader showBackButton={true} />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchUserProfile}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Profile Info (modern, centered, with icon) */}
            <View style={styles.profileInfoContainer}>
              <Ionicons name="person-circle" size={64} color={theme.colors.primary} style={styles.profileIcon} />
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
              <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
                <Text style={styles.editProfileText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* Section label */}
            <Text style={styles.sectionLabel}>Settings</Text>

            {/* Settings Sections */}
            <View style={styles.settingsContainer}>
              {/* Account Section */}
              <View style={styles.settingsSection}>
                <TouchableOpacity
                  style={styles.settingsItem}
                  onPress={handleChangePassword}
                  disabled={!canChangePassword()}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingsItemLeft}>
                    <Ionicons name="lock-closed-outline" size={22} color={theme.colors.primary} style={styles.settingsIcon} />
                    <View style={styles.settingsItemContent}>
                      <Text style={styles.settingsItemText}>Change Password</Text>
                      {!canChangePassword() && (
                        <Text style={styles.settingsItemSubtext}>
                          Available after 7 days from last change
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.settingsItem}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingsItemLeft}>
                    <Ionicons name="mail-outline" size={22} color="#4CAF50" style={styles.settingsIcon} />
                    <View style={styles.settingsItemContent}>
                      <Text style={styles.settingsItemText}>Email Notifications</Text>
                      <Text style={styles.settingsItemSubtext}>Receive alerts and updates via email</Text>
                    </View>
                  </View>
                  <Switch
                    trackColor={{ false: theme.colors.lightGray, true: `${theme.colors.primary}80` }}
                    thumbColor={notifications ? theme.colors.primary : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={() => setNotifications(!notifications)}
                    value={notifications}
                  />
                </TouchableOpacity>
              </View>

              {/* Appearance Section */}
              <View style={styles.settingsSection}>
                <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
                  <View style={styles.settingsItemLeft}>
                    <Ionicons name="moon-outline" size={22} color="#FFC107" style={styles.settingsIcon} />
                    <View style={styles.settingsItemContent}>
                      <Text style={styles.settingsItemText}>Dark Mode</Text>
                      <Text style={styles.settingsItemSubtext}>Switch to dark theme</Text>
                    </View>
                  </View>
                  <Switch
                    trackColor={{ false: theme.colors.lightGray, true: `${theme.colors.primary}80` }}
                    thumbColor={darkMode ? theme.colors.primary : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={() => setDarkMode(!darkMode)}
                    value={darkMode}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
                  <View style={styles.settingsItemLeft}>
                    <Ionicons name="finger-print-outline" size={22} color="#00BCD4" style={styles.settingsIcon} />
                    <View style={styles.settingsItemContent}>
                      <Text style={styles.settingsItemText}>Biometric Login</Text>
                      <Text style={styles.settingsItemSubtext}>Use fingerprint or Face ID</Text>
                    </View>
                  </View>
                  <Switch
                    trackColor={{ false: theme.colors.lightGray, true: `${theme.colors.primary}80` }}
                    thumbColor={biometricEnabled ? theme.colors.primary : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={() => setBiometricEnabled(!biometricEnabled)}
                    value={biometricEnabled}
                  />
                </TouchableOpacity>
              </View>

              {/* Currency Section */}
              <View style={styles.settingsSection}>
                <TouchableOpacity 
                  style={styles.settingsItem} 
                  activeOpacity={0.7}
                  onPress={() => setShowCurrencyModal(true)}
                >
                  <View style={styles.settingsItemLeft}>
                    <Ionicons name="cash-outline" size={22} color="#4CAF50" style={styles.settingsIcon} />
                    <View style={styles.settingsItemContent}>
                      <Text style={styles.settingsItemText}>Currency</Text>
                      <Text style={styles.settingsItemSubtext}>{getCurrentCurrencyName()}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
                </TouchableOpacity>
              </View>

              {/* Help & Support Section */}
              <View style={styles.settingsSection}>
                <TouchableOpacity style={styles.settingsItem} onPress={navigateToContactSupport} activeOpacity={0.7}>
                  <View style={styles.settingsItemLeft}>
                    <Ionicons name="chatbox-ellipses-outline" size={22} color="#9C27B0" style={styles.settingsIcon} />
                    <Text style={styles.settingsItemText}>Contact Support</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingsItem} onPress={openPrivacyPolicy} activeOpacity={0.7}>
                  <View style={styles.settingsItemLeft}>
                    <Ionicons name="shield-checkmark-outline" size={22} color="#F44336" style={styles.settingsIcon} />
                    <Text style={styles.settingsItemText}>Privacy Policy</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingsItem} onPress={openTermsOfService} activeOpacity={0.7}>
                  <View style={styles.settingsItemLeft}>
                    <Ionicons name="document-text-outline" size={22} color="#795548" style={styles.settingsIcon} />
                    <Text style={styles.settingsItemText}>Terms of Service</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign Out Button */}
            <TouchableOpacity style={styles.signOutButton} onPress={handleLogoutPress}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
            
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </>
        )}
      </ScrollView>
      <BottomNavBar activeScreen={activeScreen} onPress={handleNavigation} />
      {/* Edit Profile Modal */}
      {showEditModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                autoCapitalize="words"
              />
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.passwordModalContainer]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              {passwordErrors.general && (
                <View style={[
                  styles.errorBanner, 
                  passwordErrors.general.includes('successfully') && styles.successBanner
                ]}>
                  <Ionicons 
                    name={passwordErrors.general.includes('successfully') ? "checkmark-circle" : "alert-circle-outline"} 
                    size={20} 
                    color={passwordErrors.general.includes('successfully') ? theme.colors.success : theme.colors.error} 
                  />
                  <Text style={[
                    styles.errorBannerText,
                    passwordErrors.general.includes('successfully') && styles.successBannerText
                  ]}>{passwordErrors.general}</Text>
                </View>
              )}
              
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={[styles.input, passwordErrors.current && styles.inputError]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter your current password"
                secureTextEntry
              />
              {passwordErrors.current && (
                <Text style={styles.passwordError}>{passwordErrors.current}</Text>
              )}
              
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>New Password</Text>
              <TextInput
                style={[styles.input, passwordErrors.new && styles.inputError]}
                value={newPassword}
                onChangeText={handlePasswordChange}
                onFocus={handlePasswordFocus}
                onBlur={handlePasswordBlur}
                placeholder="Create a secure password"
                secureTextEntry
              />
              {passwordErrors.new && (
                <Text style={styles.passwordError}>{passwordErrors.new}</Text>
              )}
              
              {(isPasswordFocused || passwordStrength) && (
                <View style={styles.strengthContainer}>
                  <Text style={styles.strengthLabel}>
                    Password Strength: {
                      passwordStrength === 'weak' ? 'Weak' :
                      passwordStrength === 'medium' ? 'Medium' :
                      passwordStrength === 'strong' ? 'Strong' :
                      passwordStrength === 'very-strong' ? 'Very Strong' : 'Weak'
                    }
                  </Text>
                  <View style={styles.strengthMeter}>
                    <View 
                      style={[
                        styles.strengthIndicator, 
                        styles.strengthWeak,
                        passwordStrength && styles.strengthActive
                      ]} 
                    />
                    <View 
                      style={[
                        styles.strengthIndicator, 
                        styles.strengthMedium,
                        (passwordStrength === 'medium' || passwordStrength === 'strong' || passwordStrength === 'very-strong') && styles.strengthActive
                      ]} 
                    />
                    <View 
                      style={[
                        styles.strengthIndicator, 
                        styles.strengthStrong,
                        (passwordStrength === 'strong' || passwordStrength === 'very-strong') && styles.strengthActive
                      ]} 
                    />
                    <View 
                      style={[
                        styles.strengthIndicator, 
                        styles.strengthVeryStrong,
                        passwordStrength === 'very-strong' && styles.strengthActive
                      ]} 
                    />
                  </View>
                  <Text style={styles.passwordHint}>
                    Password must be at least 8 characters and include uppercase, lowercase, number, and special character.
                  </Text>
                </View>
              )}
              
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Confirm New Password</Text>
              <TextInput
                style={[styles.input, passwordErrors.confirm && styles.inputError]}
                value={confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                placeholder="Confirm your new password"
                secureTextEntry
              />
              {passwordErrors.confirm && (
                <Text style={styles.passwordError}>{passwordErrors.confirm}</Text>
              )}
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPasswordModal(false)}
                disabled={changingPassword}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSavePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Confirmation Dialog */}
      <MessageDialog
        visible={dialogVisible}
        type={dialogProps.type}
        title={dialogProps.title}
        message={dialogProps.message}
        onDismiss={() => setDialogVisible(false)}
        onAction={dialogProps.onAction}
        actionText={dialogProps.actionText}
        autoDismiss={dialogProps.type === 'success'}
      />
      
      {/* Currency List Modal */}
      {showCurrencyModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { width: width * 0.85 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity
                onPress={() => setShowCurrencyModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.currencyList}>
              {SUPPORTED_CURRENCIES.map((currencyItem) => (
                <TouchableOpacity 
                  key={currencyItem.symbol}
                  style={styles.currencyItem}
                  onPress={async () => {
                    await setCurrency(currencyItem.symbol);
                    setShowCurrencyModal(false);
                  }}
                >
                  <View style={styles.currencyItemContent}>
                    <Text style={styles.currencySymbol}>{currencyItem.symbol}</Text>
                    <Text style={styles.currencyName}>{currencyItem.name}</Text>
                  </View>
                  
                  {currency.symbol === currencyItem.symbol && (
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.textLight,
    fontSize: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    minHeight: 300,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Profile Info (modern, centered, with icon)
  profileInfoContainer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
    backgroundColor: theme.colors.white,
  },
  profileIcon: {
    marginBottom: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 40,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 8,
    textAlign: 'center',
  },
  editProfileButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'center',
  },
  editProfileText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  sectionLabel: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontWeight: '600',
    marginTop: 18,
    marginBottom: 6,
    marginLeft: 20,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  settingsContainer: {
    paddingHorizontal: 0,
  },
  settingsSection: {
    marginBottom: 18,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsIcon: {
    marginRight: 16,
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  settingsItemSubtext: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  signOutButton: {
    marginTop: 32,
    alignSelf: 'center',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 24,
    backgroundColor: theme.colors.error,
    marginBottom: 8,
    elevation: 2,
  },
  signOutText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  versionText: {
    textAlign: 'center',
    color: theme.colors.textLight,
    fontSize: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  
  // Modal styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    width: width * 0.88,
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textLight,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    color: theme.colors.text,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.lightGray,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  cancelButtonText: {
    color: theme.colors.textLight,
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Password modal styles
  passwordModalContainer: {
    maxHeight: height * 0.8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    color: theme.colors.error,
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  passwordError: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },
  strengthContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  strengthLabel: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 6,
  },
  strengthMeter: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  strengthIndicator: {
    flex: 1,
    marginHorizontal: 2,
    backgroundColor: theme.colors.lightGray,
  },
  strengthActive: {
    opacity: 1,
  },
  strengthWeak: {
    backgroundColor: theme.colors.error,
    opacity: 0.3,
  },
  strengthMedium: {
    backgroundColor: theme.colors.warning,
    opacity: 0.3,
  },
  strengthStrong: {
    backgroundColor: theme.colors.success,
    opacity: 0.3,
  },
  strengthVeryStrong: {
    backgroundColor: '#4CAF50',
    opacity: 0.3,
  },
  passwordHint: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 4,
    lineHeight: 18,
  },
  successBanner: {
    backgroundColor: 'rgba(156, 255, 156, 0.1)',
  },
  successBannerText: {
    color: theme.colors.success,
  },
  
  // Currency selection modal styles
  currencyList: {
    padding: 16,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  currencyItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    marginRight: 16,
    width: 30,
    textAlign: 'center',
  },
  currencyName: {
    fontSize: 16,
    color: theme.colors.text,
  },
});

export default AccountScreen; 