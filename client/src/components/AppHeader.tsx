import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface AppHeaderProps {
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  showNotifications?: boolean;
  onNotificationsPress?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  showBackButton = false,
  onBackPress,
  rightIcon,
  onRightIconPress,
  showNotifications = true,
  onNotificationsPress,
}) => {
  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor="#3770FF"
        barStyle="light-content"
      />
      
      <View style={styles.headerContent}>
        <View style={styles.leftContainer}>
          {showBackButton ? (
            <TouchableOpacity style={styles.iconButton} onPress={onBackPress}>
              <Ionicons name="arrow-back" size={22} color={theme.colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>Fintech</Text>
              <View style={styles.dotAccent}></View>
            </View>
          )}
        </View>

        <View style={styles.rightContainer}>
          {showNotifications && (
            <TouchableOpacity 
              style={[styles.iconButton, styles.notificationButton]} 
              onPress={onNotificationsPress}
            >
              <Ionicons name="notifications-outline" size={20} color={theme.colors.white} />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          )}
          
          {rightIcon && (
            <TouchableOpacity style={styles.iconButton} onPress={onRightIconPress}>
              <Ionicons name={rightIcon} size={22} color={theme.colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#3770FF',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 8,
    shadowOpacity: 1,
    elevation: 8,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: theme.colors.white,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  dotAccent: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
    marginLeft: 4,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 6,
    borderRadius: 8,
  },
  notificationButton: {
    marginRight: 6,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.error,
    borderWidth: 1.5,
    borderColor: '#3770FF',
  },
});

export default AppHeader; 