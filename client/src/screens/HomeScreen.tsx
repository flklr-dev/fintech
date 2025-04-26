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
  Platform,
  ActivityIndicator
} from 'react-native';
import { observer } from 'mobx-react';
import { runInAction } from 'mobx';
import { useNavigation } from '../hooks/useNavigation';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import { authViewModel } from '../viewmodels/authViewModel';
import { authService } from '../services/apiService';
import MessageDialog from '../components/MessageDialog';
import { ScreenName } from '../components/BottomNavBar';
import api from '../api/api';
import { format } from 'date-fns';
import { budgetService } from '../services/budgetService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// Helper to format currency
const formatCurrency = (amount: number) => {
  return amount?.toLocaleString('en-US', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) || '₱0.00';
};

const HomeScreen = observer(() => {
  const navigation = useNavigation();
  const [activeScreen, setActiveScreen] = useState<ScreenName>('Home');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [remainingBudget, setRemainingBudget] = useState(0);
  const [savingsGoal, setSavingsGoal] = useState(1000);
  const [currentSavings, setCurrentSavings] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  
  // Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogProps, setDialogProps] = useState({
    type: 'error' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
    actionText: '',
    onAction: () => {},
  });

  // Check authentication and load data on mount
  useEffect(() => {
    checkAuthentication();
    fetchAllData();
  }, []);

  const checkAuthentication = async () => {
    if (!authViewModel.isLoggedIn) {
      const token = await authService.getToken();
      if (token) {
        // If token exists but isLoggedIn is false, update the state
        runInAction(() => {
          authViewModel.isLoggedIn = true;
        });
      } else {
        // Only show dialog if no token is found
        showDialog({
          type: 'error',
          title: 'Session Expired',
          message: 'Your session has expired. Please login again.',
          actionText: 'Login',
          onAction: () => navigation.navigate('Login')
        });
      }
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTransactionSummary(),
        fetchRecentTransactions(),
        fetchBudgets()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      showDialog({
        type: 'error',
        title: 'Data Error',
        message: 'Failed to fetch your financial data. Please try again.',
        actionText: 'Retry',
        onAction: fetchAllData
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionSummary = async () => {
    try {
      // Get the first and last day of current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Format dates for API
      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];
      
      console.log('Fetching transactions from', startDate, 'to', endDate);
      
      // Fetch transactions
      const response = await api.get('/transactions', {
        params: { 
          startDate,
          endDate
        }
      });
      
      // Get all transactions for the period
      const allTransactions = response.data.data.transactions || [];
      
      console.log('Fetched transactions:', allTransactions.length);
      
      // Separate transactions by type
      const incomeTransactions = allTransactions.filter(
        (transaction: any) => transaction.type === 'income'
      );
      
      const expenseTransactions = allTransactions.filter(
        (transaction: any) => transaction.type === 'expense'
      );
      
      console.log('Income transactions:', incomeTransactions.length);
      console.log('Expense transactions:', expenseTransactions.length);
      
      // Calculate totals
      const income = incomeTransactions.reduce(
        (sum: number, t: any) => sum + t.amount, 0
      );
      
      const expenses = expenseTransactions.reduce(
        (sum: number, t: any) => sum + t.amount, 0
      );
      
      console.log('Total income:', income);
      console.log('Total expenses:', expenses);
      
      // Update state
      setMonthlyIncome(income);
      setMonthlyExpenses(expenses);
      setTotalBalance(income - expenses);
      
      // For savings, it's Total Income - Total Expenses
      setCurrentSavings(income - expenses);
    } catch (error) {
      console.error('Error fetching transaction summary:', error);
      throw error;
    }
  };

  const fetchRecentTransactions = async () => {
    try {
      const response = await api.get('/transactions', {
        params: { limit: 3, sort: '-date' }
      });
      
      setRecentTransactions(response.data.data.transactions);
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      throw error;
    }
  };

  const fetchBudgets = async () => {
    try {
      const budgetsWithSpending = await budgetService.getBudgets();
      setBudgets(budgetsWithSpending);
      
      // Calculate total budget allocations
      const totalBudgetAmount = budgetsWithSpending.reduce(
        (sum, budget) => sum + budget.amount, 0
      );
      
      // Calculate total expenses linked to budgets
      const budgetExpenses = budgetsWithSpending.reduce(
        (sum, budget) => sum + (budget.currentSpending || 0), 0
      );
      
      // Remaining budget is: Total budget allocations - expenses linked to budgets
      setRemainingBudget(totalBudgetAmount - budgetExpenses);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      throw error;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAllData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleNavigation = (screen: ScreenName) => {
    setActiveScreen(screen);
    if (screen === 'Budget') {
      navigation.navigate('Budget');
    } else if (screen === 'Transactions') {
      navigation.navigate('Transactions');
    } else if (screen === 'Reports') {
      navigation.navigate('Reports');
    }
  };

  const handleLogout = async () => {
    await authViewModel.logout();
    navigation.navigate('Login');
  };

  const handleAddTransaction = () => {
    // @ts-ignore - ignoring type mismatch for navigation params
    navigation.navigate('Transactions', { showAddModal: true });
  };

  const handleCreateBudget = () => {
    // @ts-ignore - ignoring type mismatch for navigation params
    navigation.navigate('Budget', { showAddModal: true });
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
    if (!budget || budget <= 0) return 0;
    const percentage = (spent / budget) * 100;
    return percentage > 100 ? 100 : percentage;
  };

  // Get an appropriate icon for a category
  const getCategoryIcon = (category: string): any => {
    const iconMap: {[key: string]: any} = {
      'Food & Dining': 'restaurant-outline',
      'Transport': 'car-outline',
      'Utilities': 'flash-outline',
      'Entertainment': 'film-outline',
      'Shopping': 'cart-outline',
      'Healthcare': 'medical-outline',
      'Education': 'school-outline',
      'Other': 'ellipsis-horizontal-outline',
      'Salary': 'cash-outline',
      'Investment': 'trending-up-outline',
      'Bonus': 'gift-outline',
      'Refund': 'arrow-undo-outline'
    };
    
    return iconMap[category] || 'help-circle-outline';
  };

  // Get a color for a category
  const getCategoryColor = (category: string): string => {
    const colorMap: {[key: string]: string} = {
      'Food & Dining': '#4CAF50',
      'Transport': '#2196F3',
      'Utilities': '#FF9800',
      'Entertainment': '#9C27B0',
      'Shopping': '#3F51B5',
      'Healthcare': '#E91E63',
      'Education': '#009688',
      'Other': '#607D8B',
      'Salary': '#4CAF50',
      'Investment': '#3F51B5',
      'Bonus': '#E91E63',
      'Refund': '#009688'
    };
    
    return colorMap[category] || '#607D8B';
  };

  // Format date for display
  const formatTransactionDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader showNotifications={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your financial data...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.balanceAmount}>{formatCurrency(totalBalance)}</Text>
        </View>
        
        {/* Call-to-Action Buttons */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity 
            style={[styles.ctaButton, styles.expenseButton]} 
            onPress={handleAddTransaction}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.ctaButtonText}>Add Transaction</Text>
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
              <Text style={styles.cardAmount}>{formatCurrency(monthlyIncome)}</Text>
              <Text style={styles.cardPeriod}>This Month</Text>
            </View>
            
            <View style={[styles.summaryCard, styles.cardShadow]}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(255, 82, 82, 0.1)' }]}>
                <Ionicons name="arrow-down-outline" size={18} color={theme.colors.error} />
              </View>
              <Text style={styles.cardLabel}>Expenses</Text>
              <Text style={styles.cardAmount}>{formatCurrency(monthlyExpenses)}</Text>
              <Text style={styles.cardPeriod}>This Month</Text>
            </View>
            
            <View style={[styles.summaryCard, styles.cardShadow]}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(255, 193, 7, 0.1)' }]}>
                <Ionicons name="wallet-outline" size={18} color="#FF9800" />
              </View>
              <Text style={styles.cardLabel}>Budget Left</Text>
              <Text style={styles.cardAmount}>{formatCurrency(remainingBudget)}</Text>
              <Text style={styles.cardPeriod}>Remaining</Text>
            </View>
            
            <View style={[styles.summaryCard, styles.cardShadow]}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(156, 39, 176, 0.1)' }]}>
                <Ionicons name="trending-up-outline" size={18} color="#9C27B0" />
              </View>
              <Text style={styles.cardLabel}>Savings</Text>
              <Text style={styles.cardAmount}>{formatCurrency(currentSavings)}</Text>
              <Text style={styles.cardPeriod}>Income - Expenses</Text>
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
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction, index) => (
                <TouchableOpacity 
                  key={transaction._id || index} 
                  style={[styles.transactionItem, styles.cardShadow]}
                >
                  <View style={[
                    styles.categoryIcon, 
                    { backgroundColor: getCategoryColor(transaction.category) }
                  ]}>
                    <Ionicons 
                      name={getCategoryIcon(transaction.category)} 
                      size={16} 
                      color="#fff" 
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionTitle}>{transaction.description || transaction.category}</Text>
                    <Text style={styles.transactionDate}>
                      {formatTransactionDate(transaction.date)}
                    </Text>
                  </View>
                  <Text style={[
                    styles.transactionAmount, 
                    transaction.type === 'income' ? styles.incomeAmount : {}
                  ]}>
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>No recent transactions</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Budget Progress */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Budget Progress</Text>
            <TouchableOpacity onPress={() => handleNavigation('Budget')}>
              <Text style={styles.viewAllText}>Manage</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.budgetList}>
            {budgets.length > 0 ? (
              budgets.slice(0, 4).map((budget, index) => {
                const spent = budget.currentSpending || 0;
                const percentage = calculatePercentage(spent, budget.amount);
                const isOverBudget = spent > budget.amount;
                const color = getCategoryColor(budget.category);
                
                return (
                  <View key={budget._id || index} style={[styles.budgetItem, styles.cardShadow]}>
                    <View style={styles.budgetHeader}>
                      <View style={[styles.categoryIcon, { backgroundColor: color }]}>
                        <Ionicons 
                          name={getCategoryIcon(budget.category)} 
                          size={16} 
                          color="#fff" 
                        />
                      </View>
                      <View style={styles.budgetInfoContainer}>
                        <Text style={styles.budgetCategory}>{budget.category}</Text>
                        <Text style={styles.budgetNumbers}>
                          <Text style={isOverBudget ? styles.overBudget : undefined}>
                            {formatCurrency(spent)}
                          </Text>
                          <Text style={styles.budgetSeparator}> / </Text>
                          <Text>{formatCurrency(budget.amount)}</Text>
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
                            backgroundColor: isOverBudget ? theme.colors.error : color
                          }
                        ]} 
                      />
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>No budgets found</Text>
                <TouchableOpacity 
                  style={styles.emptyStateButton} 
                  onPress={handleCreateBudget}
                >
                  <Text style={styles.emptyStateButtonText}>Create a Budget</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      
      <BottomNavBar activeScreen={activeScreen} onPress={handleNavigation} />
      
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
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.textLight,
    fontSize: 16,
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
    backgroundColor: '#4CAF50',
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
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyStateButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
});

export default HomeScreen; 