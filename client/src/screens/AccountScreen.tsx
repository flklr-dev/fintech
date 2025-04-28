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
  Linking,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const { width } = Dimensions.get('window');

const AccountScreen = () => {
  const { user: authUser, logout } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [notifications, setNotifications] = useState(true);
  const [themeMode, setThemeMode] = useState('system');
  const [currency, setCurrency] = useState('₱'); // Philippine Peso
  
  // Connected accounts state
  const [connectedAccounts, setConnectedAccounts] = useState({
    google: false,
    apple: false
  });
  
  // User profile state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Logout confirmation dialog
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  
  // Edit profile state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Currency modal state
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  // Fetch user profile data
  useEffect(() => {
    fetchUserProfile();
    checkConnectedAccounts();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const userProfile = await apiService.getUserProfile();
      setUser(userProfile);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile data');
      console.error('Error fetching user profile:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const checkConnectedAccounts = async () => {
    try {
      // In a real implementation, you would fetch this from your backend
      // For now, we'll simulate this check with localStorage or hardcoded values
      
      // Check for Google connection (could use AsyncStorage or SecureStore)
      const hasGoogleAccount = await AsyncStorage.getItem('connected_google') === 'true';
      
      // Update state
      setConnectedAccounts({
        google: hasGoogleAccount,
        apple: false // We'll assume Apple is not connected for this example
      });
    } catch (err) {
      console.error('Error checking connected accounts:', err);
    }
  };

  const handleLogoutPress = () => {
    setShowLogoutConfirmation(true);
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' as keyof RootStackParamList }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    } finally {
      setLoading(false);
      setShowLogoutConfirmation(false);
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
      Alert.alert('Success', 'Profile updated successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setShowPasswordModal(true);
  };

  const handleSavePassword = async () => {
    // Validate passwords
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    try {
      setSaving(true);
      setPasswordError(null);
      await apiService.changePassword({
        currentPassword,
        newPassword
      });
      setShowPasswordModal(false);
      Alert.alert('Success', 'Password changed successfully');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle currency selection
  const handleCurrencySelect = (selectedCurrency: string) => {
    setCurrency(selectedCurrency);
    setShowCurrencyModal(false);
    // In a real app, you would save this to user preferences
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderSettingItem = (icon: string, label: string, onPress: () => void, rightComponent?: React.ReactNode) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingItemLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={20} color={theme.colors.primary} />
        </View>
        <Text style={styles.settingItemLabel}>{label}</Text>
      </View>
      {rightComponent || <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3770FF" />
      
      <AppHeader 
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        showProfile={false}
        showNotifications={false}
      />

      {loading && !user ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : error ? (
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
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          {/* User Profile Header */}
          <View style={styles.profileHeaderContainer}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.userInfoContainer}>
                <Text style={styles.userName}>{user?.name || 'User Name'}</Text>
                <View style={styles.emailContainer}>
                  <Ionicons name="mail-outline" size={16} color={theme.colors.textLight} />
                  <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.editProfileButton}
                activeOpacity={0.7}
                onPress={handleEditProfile}
              >
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Account Actions */}
          {renderSection('Account Settings', (
            <View>
              {renderSettingItem('lock-closed-outline', 'Change Password', handleChangePassword)}
              {renderSettingItem('shield-checkmark-outline', 'Privacy & Security', () => {})}
            </View>
          ))}

          {/* Security & Authentication */}
          {renderSection('Connected Accounts', (
            <View>
              {renderSettingItem('logo-google', 'Google Account', () => {}, (
                <Text style={connectedAccounts.google ? styles.connectedText : styles.notConnectedText}>
                  {connectedAccounts.google ? 'Connected' : 'Not Connected'}
                </Text>
              ))}
              {renderSettingItem('logo-apple', 'Apple ID', () => {}, (
                <Text style={connectedAccounts.apple ? styles.connectedText : styles.notConnectedText}>
                  {connectedAccounts.apple ? 'Connected' : 'Not Connected'}
                </Text>
              ))}
            </View>
          ))}

          {/* App Settings */}
          {renderSection('App Settings', (
            <View>
              {renderSettingItem('cash-outline', 'Currency', () => setShowCurrencyModal(true), (
                <View style={styles.currencySelector}>
                  <Text style={styles.currencyText}>{currency}</Text>
                </View>
              ))}
              {renderSettingItem('notifications-outline', 'Notifications', () => {}, (
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: theme.colors.lightGray, true: theme.colors.primary }}
                  thumbColor={theme.colors.white}
                  ios_backgroundColor={theme.colors.lightGray}
                />
              ))}
              {renderSettingItem('color-palette-outline', 'Theme', () => {}, (
                <View style={styles.themeSelector}>
                  <Text style={styles.themeText}>{themeMode}</Text>
                </View>
              ))}
            </View>
          ))}

          {/* Support & Legal */}
          {renderSection('Support & Legal', (
            <View>
              {renderSettingItem('help-circle-outline', 'Help & FAQs', () => {})}
              {renderSettingItem('mail-outline', 'Contact Support', () => {})}
              {renderSettingItem('document-text-outline', 'Privacy Policy', () => {})}
              {renderSettingItem('document-text-outline', 'Terms of Service', () => {})}
            </View>
          ))}

          {/* Sign Out */}
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogoutPress}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.colors.white} style={styles.logoutIcon} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Logout Confirmation Dialog */}
      <MessageDialog
        visible={showLogoutConfirmation}
        type="warning"
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        onDismiss={() => setShowLogoutConfirmation(false)}
        onAction={handleLogout}
        actionText="Sign Out"
        autoDismiss={false}
      />

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
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
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
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
              {passwordError && (
                <View style={styles.errorMessage}>
                  <Ionicons name="alert-circle-outline" size={18} color={theme.colors.error} />
                  <Text style={styles.errorMessageText}>{passwordError}</Text>
                </View>
              )}
              
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                secureTextEntry
              />
              
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry
              />
              
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
              />
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPasswordModal(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSavePassword}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity
                onPress={() => setShowCurrencyModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <TouchableOpacity
                style={[styles.currencyOption, currency === '₱' ? styles.selectedCurrency : null]}
                onPress={() => handleCurrencySelect('₱')}
              >
                <Text style={styles.currencySymbol}>₱</Text>
                <View style={styles.currencyDetails}>
                  <Text style={styles.currencyName}>Philippine Peso</Text>
                  <Text style={styles.currencyCode}>PHP</Text>
                </View>
                {currency === '₱' && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.currencyOption, currency === '$' ? styles.selectedCurrency : null]}
                onPress={() => handleCurrencySelect('$')}
              >
                <Text style={styles.currencySymbol}>$</Text>
                <View style={styles.currencyDetails}>
                  <Text style={styles.currencyName}>US Dollar</Text>
                  <Text style={styles.currencyCode}>USD</Text>
                </View>
                {currency === '$' && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.currencyOption, currency === '€' ? styles.selectedCurrency : null]}
                onPress={() => handleCurrencySelect('€')}
              >
                <Text style={styles.currencySymbol}>€</Text>
                <View style={styles.currencyDetails}>
                  <Text style={styles.currencyName}>Euro</Text>
                  <Text style={styles.currencyCode}>EUR</Text>
                </View>
                {currency === '€' && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: theme.colors.background,
  },
  scrollViewContent: {
    paddingBottom: theme.spacing.xl,
  },
  section: {
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
    marginLeft: theme.spacing.xs,
  },
  // Loading and error state styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textLight,
    marginTop: theme.spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    ...theme.typography.body,
    color: theme.colors.white,
    fontWeight: '600',
  },
  // Modern profile header styles
  profileHeaderContainer: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  profileHeader: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  avatarContainer: {
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...theme.shadows.sm,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  userInfoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  userName: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userEmail: {
    ...theme.typography.body,
    color: theme.colors.textLight,
    marginLeft: theme.spacing.xs,
  },
  editProfileButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    ...theme.shadows.sm,
  },
  editProfileText: {
    ...theme.typography.caption,
    color: theme.colors.white,
    fontWeight: '600',
  },
  // Setting styles
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
    ...theme.shadows.sm,
    marginHorizontal: theme.spacing.xs,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  settingItemLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  connectedText: {
    ...theme.typography.caption,
    color: theme.colors.success,
    fontWeight: '600',
  },
  notConnectedText: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
    fontWeight: '500',
  },
  currencySelector: {
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  currencyText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  themeSelector: {
    backgroundColor: theme.colors.lightGray + '50',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  themeText: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
    textTransform: 'capitalize',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  logoutIcon: {
    marginRight: theme.spacing.xs,
  },
  logoutText: {
    ...theme.typography.body,
    color: theme.colors.white,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
    padding: theme.spacing.md,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  modalBody: {
    padding: theme.spacing.md,
  },
  inputLabel: {
    ...theme.typography.body,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.xs,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.lightGray,
  },
  cancelButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
  },
  cancelButtonText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonText: {
    ...theme.typography.body,
    color: theme.colors.white,
    fontWeight: '600',
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error + '15',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  errorMessageText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginLeft: theme.spacing.xs,
    flex: 1,
  },
  // Currency Options
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  selectedCurrency: {
    backgroundColor: theme.colors.primary + '10',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    width: 40,
    textAlign: 'center',
  },
  currencyDetails: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  currencyName: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  currencyCode: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
  },
});

export default AccountScreen; 