import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Dimensions,
  Image,
  Platform
} from 'react-native';
import { observer } from 'mobx-react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import { authViewModel } from '../viewmodels/authViewModel';
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

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

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

  // Budget categories for progress visualization
  const budgetCategories = [
    { name: 'Food & Dining', spent: 320, budget: 500, icon: 'restaurant-outline', color: '#4CAF50' },
    { name: 'Transport', spent: 150, budget: 200, icon: 'car-outline', color: '#2196F3' },
    { name: 'Utilities', spent: 180, budget: 150, icon: 'flash-outline', color: '#FF9800' },
    { name: 'Entertainment', spent: 90, budget: 200, icon: 'film-outline', color: '#9C27B0' },
  ];

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

  const handleAddExpense = () => {
    // Navigate to add expense screen or show modal
    console.log('Add expense pressed');
  };

  const handleCreateBudget = () => {
    // Navigate to create budget screen
    console.log('Create budget pressed');
    handleNavigation('Budgets');
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

  // Calculate percentage for progress bars
  const calculatePercentage = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100;
    return percentage > 100 ? 100 : percentage;
  };

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
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome, {authViewModel.userName || 'User'}!
          </Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </View>
        
        {/* Total Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceTitle}>Total Balance</Text>
            <TouchableOpacity style={styles.eyeButton}>
              <Ionicons name="eye-outline" size={18} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceAmount}>$2,450.00</Text>
        </View>
        
        {/* Call-to-Action Buttons */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity 
            style={[styles.ctaButton, styles.expenseButton]} 
            onPress={handleAddExpense}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.ctaButtonText}>Add Expense</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.ctaButton, styles.budgetButton]} 
            onPress={handleCreateBudget}
          >
            <Ionicons name="wallet-outline" size={20} color="#fff" />
            <Text style={styles.ctaButtonText}>Create Budget</Text>
          </TouchableOpacity>
        </View>
        
        {/* Financial Summary Cards */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          
          <View style={styles.financialCards}>
            <View style={[styles.summaryCard, styles.cardShadow]}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="arrow-up-outline" size={18} color={theme.colors.success} />
              </View>
              <Text style={styles.cardLabel}>Income</Text>
              <Text style={styles.cardAmount}>$3,200.00</Text>
              <Text style={styles.cardPeriod}>This Month</Text>
            </View>
            
            <View style={[styles.summaryCard, styles.cardShadow]}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(255, 82, 82, 0.1)' }]}>
                <Ionicons name="arrow-down-outline" size={18} color={theme.colors.error} />
              </View>
              <Text style={styles.cardLabel}>Expenses</Text>
              <Text style={styles.cardAmount}>$750.00</Text>
              <Text style={styles.cardPeriod}>This Month</Text>
            </View>
            
            <View style={[styles.summaryCard, styles.cardShadow]}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(255, 193, 7, 0.1)' }]}>
                <Ionicons name="wallet-outline" size={18} color="#FF9800" />
              </View>
              <Text style={styles.cardLabel}>Remaining</Text>
              <Text style={styles.cardAmount}>$850.00</Text>
              <Text style={styles.cardPeriod}>Budget</Text>
            </View>
            
            <View style={[styles.summaryCard, styles.cardShadow]}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(156, 39, 176, 0.1)' }]}>
                <Ionicons name="trending-up-outline" size={18} color="#9C27B0" />
              </View>
              <Text style={styles.cardLabel}>Savings</Text>
              <Text style={styles.cardAmount}>$600.00</Text>
              <Text style={styles.cardPeriod}>Goal: $1,000</Text>
            </View>
          </View>
        </View>
        
        {/* Recent Transactions */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => handleNavigation('Transactions')}>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.transactionList}>
            <TouchableOpacity style={[styles.transactionItem, styles.cardShadow]}>
              <View style={[styles.categoryIcon, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="cart-outline" size={16} color="#fff" />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionTitle}>Grocery Shopping</Text>
                <Text style={styles.transactionDate}>Today, 2:30 PM</Text>
              </View>
              <Text style={styles.transactionAmount}>-$45.99</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.transactionItem, styles.cardShadow]}>
              <View style={[styles.categoryIcon, { backgroundColor: theme.colors.secondary }]}>
                <Ionicons name="fast-food-outline" size={16} color="#fff" />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionTitle}>Restaurant</Text>
                <Text style={styles.transactionDate}>Yesterday, 7:15 PM</Text>
              </View>
              <Text style={styles.transactionAmount}>-$32.50</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.transactionItem, styles.cardShadow]}>
              <View style={[styles.categoryIcon, { backgroundColor: theme.colors.success }]}>
                <Ionicons name="cash-outline" size={16} color="#fff" />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionTitle}>Salary Deposit</Text>
                <Text style={styles.transactionDate}>Aug 30, 9:00 AM</Text>
              </View>
              <Text style={[styles.transactionAmount, styles.incomeAmount]}>+$1,200.00</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Budget Progress */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Budget Progress</Text>
            <TouchableOpacity onPress={() => handleNavigation('Budgets')}>
              <Text style={styles.viewAllText}>Manage</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.budgetList}>
            {budgetCategories.map((category, index) => {
              const percentage = calculatePercentage(category.spent, category.budget);
              const isOverBudget = category.spent > category.budget;
              
              return (
                <View key={index} style={[styles.budgetItem, styles.cardShadow]}>
                  <View style={styles.budgetHeader}>
                    <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                      <Ionicons name={category.icon as any} size={16} color="#fff" />
                    </View>
                    <View style={styles.budgetInfoContainer}>
                      <Text style={styles.budgetCategory}>{category.name}</Text>
                      <Text style={styles.budgetNumbers}>
                        <Text style={isOverBudget ? styles.overBudget : undefined}>
                          ${category.spent}
                        </Text>
                        <Text style={styles.budgetSeparator}> / </Text>
                        <Text>${category.budget}</Text>
                      </Text>
                    </View>
                    <Text style={[
                      styles.budgetPercentage, 
                      isOverBudget ? styles.overBudget : styles.underBudget
                    ]}>
                      {percentage.toFixed(0)}%
                    </Text>
                  </View>
                  
                  <View style={styles.progressBarContainer}>
                    <View 
                      style={[
                        styles.progressBar, 
                        { 
                          width: `${percentage}%`,
                          backgroundColor: isOverBudget ? theme.colors.error : category.color
                        }
                      ]} 
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
      
      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.floatingButton} 
        onPress={handleAddExpense}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
      
      <BottomNavBar activeScreen={activeScreen} onPress={handleNavigation} />
      
      {/* Temporarily removed MessageDialog until it's fixed */}
      {/* <MessageDialog
        visible={dialogVisible}
        type={dialogProps.type}
        title={dialogProps.title}
        message={dialogProps.message}
        actionText={dialogProps.actionText}
        onAction={dialogProps.actionText ? dialogProps.onAction : undefined}
        onDismiss={() => setDialogVisible(false)}
      /> */}
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
    paddingBottom: 24,
  },
  welcomeSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.colors.text,
  },
  dateText: {
    color: theme.colors.textLight,
    marginTop: 2,
    fontSize: 14,
  },
  balanceCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
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
    fontWeight: '500',
  },
  eyeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 6,
  },
  balanceAmount: {
    color: theme.colors.white,
    fontSize: 32,
    fontWeight: '700',
    marginTop: 8,
  },
  ctaContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  ctaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.15)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      }
    }),
  },
  expenseButton: {
    backgroundColor: theme.colors.secondary,
    marginRight: 8,
  },
  budgetButton: {
    backgroundColor: theme.colors.primary,
    marginLeft: 8,
  },
  ctaButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  cardSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  viewAllText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  financialCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardShadow: {
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 13,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  cardPeriod: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 4,
  },
  transactionList: {
    marginTop: 4,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 15,
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
  budgetList: {
    marginTop: 4,
  },
  budgetItem: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetInfoContainer: {
    flex: 1,
  },
  budgetCategory: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  budgetNumbers: {
    fontSize: 13,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  budgetSeparator: {
    color: theme.colors.textLight,
  },
  budgetPercentage: {
    fontSize: 16,
    fontWeight: '600',
  },
  overBudget: {
    color: theme.colors.error,
  },
  underBudget: {
    color: theme.colors.success,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.2)',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      }
    }),
  },
});

export default HomeScreen; 