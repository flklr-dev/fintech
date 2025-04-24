import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

type ScreenName = 'Home' | 'Budgets' | 'Transactions' | 'Reports';

interface BottomNavBarProps {
  activeScreen: ScreenName;
  onPress: (screenName: ScreenName) => void;
}

const { width } = Dimensions.get('window');
const TAB_WIDTH = width / 4;

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeScreen, onPress }) => {
  const navItems: Array<{
    name: ScreenName;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
    label: string;
  }> = [
    { name: 'Home', icon: 'home-outline', activeIcon: 'home', label: 'Home' },
    { name: 'Budgets', icon: 'pie-chart-outline', activeIcon: 'pie-chart', label: 'Budget' },
    { name: 'Transactions', icon: 'wallet-outline', activeIcon: 'wallet', label: 'Expenses' },
    { name: 'Reports', icon: 'bar-chart-outline', activeIcon: 'bar-chart', label: 'Reports' },
  ];

  // Find the index of active tab
  const activeIndex = navItems.findIndex(item => item.name === activeScreen);

  return (
    <View style={styles.container}>
      {/* Indicator */}
      <View style={styles.indicatorContainer}>
        <View 
          style={[
            styles.indicator,
            {
              transform: [{ translateX: activeIndex * TAB_WIDTH }],
            }
          ]} 
        />
      </View>

      {/* Tab Buttons */}
      <View style={styles.tabContainer}>
        {navItems.map((item) => {
          const isActive = activeScreen === item.name;
          
          return (
            <TouchableOpacity
              key={item.name}
              style={styles.tabButton}
              onPress={() => onPress(item.name)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Ionicons
                  name={isActive ? item.activeIcon : item.icon}
                  size={20}
                  color={isActive ? theme.colors.primary : theme.colors.gray}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.activeTabLabel
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 20 : 6,
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    shadowOpacity: 1,
    elevation: 8,
    position: 'relative',
    borderTopWidth: 0,
  },
  indicatorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    flexDirection: 'row',
  },
  indicator: {
    width: TAB_WIDTH,
    height: 2,
    backgroundColor: theme.colors.primary,
    borderRadius: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconContainer: {
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: theme.colors.gray,
  },
  activeTabLabel: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

export default BottomNavBar; 