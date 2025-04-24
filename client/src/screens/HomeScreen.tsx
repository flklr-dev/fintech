import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl
} from 'react-native';
import { observer } from 'mobx-react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import { authViewModel } from '../viewmodels/authViewModel';
import MessageDialog from '../components/MessageDialog';
import { authService } from '../services/apiService';

// Define the navigation prop type
type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Budget: undefined;
  Transactions: undefined;
  Reports: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

type ScreenName = 'Home' | 'Budgets' | 'Transactions' | 'Reports';

const HomeScreen = observer(() => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [activeScreen, setActiveScreen] = useState<ScreenName>('Home');
  const [refreshing, setRefreshing] = useState(false);
  
  // Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogProps, setDialogProps] = useState({
    type: 'error' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
    actionText: '',
    onAction: () => {},
  });

  // Check authentication on load
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    const token = await authService.getToken();
    if (!token) {
      showDialog({
        type: 'error',
        title: 'Session Expired',
        message: 'Your session has expired. Please login again.',
        actionText: 'Login',
        onAction: () => navigation.navigate('Login')
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Fetch latest data here
    // await fetchDashboardData();
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  const handleNavigation = (screen: ScreenName) => {
    setActiveScreen(screen);
    // Add actual navigation when these screens are implemented
  };

  const handleLogout = async () => {
    await authViewModel.logout();
    navigation.navigate('Login');
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

  // Dashboard items for the homepage
  const dashboardItems = [
    {
      id: 'budget',
      title: 'Budget Management',
      icon: 'wallet-outline',
      color: theme.colors.primary,
      description: 'Create and manage your budgets',
      screen: 'Budgets' as ScreenName,
    },
    {
      id: 'expenses',
      title: 'Expense Tracking',
      icon: 'cash-outline',
      color: theme.colors.secondary,
      description: 'Track your daily expenses',
      screen: 'Transactions' as ScreenName,
    },
    {
      id: 'reports',
      title: 'Financial Reports',
      icon: 'bar-chart-outline',
      color: theme.colors.accent,
      description: 'View financial insights',
      screen: 'Reports' as ScreenName,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        showNotifications={true}
        onNotificationsPress={() => {
          // Handle notifications
        }}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome, {authViewModel.userName || 'User'}!
          </Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </View>
        
        {/* Balance summary card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceTitle}>Total Balance</Text>
            <TouchableOpacity>
              <Ionicons name="eye-outline" size={20} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceAmount}>$2,450.00</Text>
          <View style={styles.balanceStats}>
            <View style={styles.statItem}>
              <Ionicons name="arrow-up-circle" size={20} color={theme.colors.success} />
              <Text style={styles.statLabel}>Income</Text>
              <Text style={styles.statValue}>$3,200.00</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Ionicons name="arrow-down-circle" size={20} color={theme.colors.error} />
              <Text style={styles.statLabel}>Expenses</Text>
              <Text style={styles.statValue}>$750.00</Text>
            </View>
          </View>
        </View>
        
        {/* Quick access sections */}
        <Text style={styles.sectionTitle}>Core Financial Management</Text>
        
        <View style={styles.gridContainer}>
          {dashboardItems.map((item) => (
            <TouchableOpacity 
              key={item.id}
              style={styles.dashboardItem}
              onPress={() => handleNavigation(item.screen)}
            >
              <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon as any} size={24} color={theme.colors.white} />
              </View>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDescription}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Recent Transactions */}
        <View style={styles.recentTransactions}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => handleNavigation('Transactions')}>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.transactionList}>
            {/* Placeholder for transactions - to be replaced with actual data */}
            <View style={styles.transactionItem}>
              <View style={[styles.categoryIcon, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="cart-outline" size={16} color="#fff" />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionTitle}>Grocery Shopping</Text>
                <Text style={styles.transactionDate}>Today, 2:30 PM</Text>
              </View>
              <Text style={styles.transactionAmount}>-$45.99</Text>
            </View>
            
            <View style={styles.transactionItem}>
              <View style={[styles.categoryIcon, { backgroundColor: theme.colors.secondary }]}>
                <Ionicons name="fast-food-outline" size={16} color="#fff" />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionTitle}>Restaurant</Text>
                <Text style={styles.transactionDate}>Yesterday, 7:15 PM</Text>
              </View>
              <Text style={styles.transactionAmount}>-$32.50</Text>
            </View>
            
            <View style={styles.transactionItem}>
              <View style={[styles.categoryIcon, { backgroundColor: theme.colors.success }]}>
                <Ionicons name="cash-outline" size={16} color="#fff" />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionTitle}>Salary Deposit</Text>
                <Text style={styles.transactionDate}>Aug 30, 9:00 AM</Text>
              </View>
              <Text style={[styles.transactionAmount, styles.incomeAmount]}>+$1,200.00</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      
      <BottomNavBar activeScreen={activeScreen} onPress={handleNavigation} />
      
      {/* Message Dialog */}
      <MessageDialog
        visible={dialogVisible}
        type={dialogProps.type}
        title={dialogProps.title}
        message={dialogProps.message}
        actionText={dialogProps.actionText}
        onAction={dialogProps.actionText ? dialogProps.onAction : undefined}
        onDismiss={() => setDialogVisible(false)}
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  welcomeSection: {
    padding: 16,
    paddingTop: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
  },
  dateText: {
    color: theme.colors.textLight,
    marginTop: 4,
  },
  balanceCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    ...theme.shadows.md,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceTitle: {
    color: theme.colors.white,
    opacity: 0.9,
    fontSize: 16,
  },
  balanceAmount: {
    color: theme.colors.white,
    fontSize: 32,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 16,
  },
  balanceStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: theme.borderRadius.sm,
    padding: 12,
  },
  statItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 8,
  },
  statLabel: {
    color: theme.colors.white,
    opacity: 0.8,
    fontSize: 12,
    marginTop: 4,
  },
  statValue: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 24,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 8,
  },
  dashboardItem: {
    width: '50%',
    padding: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 13,
    color: theme.colors.textLight,
    lineHeight: 18,
  },
  recentTransactions: {
    marginTop: 8,
    marginHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  viewAllText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  transactionList: {
    marginTop: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: 16,
    borderRadius: theme.borderRadius.md,
    marginBottom: 8,
    ...theme.shadows.sm,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: 13,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.error,
  },
  incomeAmount: {
    color: theme.colors.success,
  },
});

export default HomeScreen; 