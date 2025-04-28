import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Platform,
  Dimensions,
  Share,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react';
import { useNavigation } from '../hooks/useNavigation';
import { theme } from '../theme';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import { ScreenName } from '../components/BottomNavBar';
import { PieChart } from 'react-native-chart-kit';
import { LineChart } from 'react-native-chart-kit';
import api from '../api/api';
import { budgetService } from '../services/budgetService';
import { useFocusEffect } from '@react-navigation/native';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 48;
const CHART_HEIGHT = Math.min(220, width * 0.6);

// Format currency helper
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const ReportsScreen = observer(() => {
  const navigation = useNavigation();
  const [activeScreen, setActiveScreen] = useState<ScreenName>('Reports');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('Monthly');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Data states
  const [spendingByCategory, setSpendingByCategory] = useState<any[]>([]);
  const [incomeVsExpenseData, setIncomeVsExpenseData] = useState<any>({
    labels: [],
    datasets: [{ data: [] }, { data: [] }]
  });
  const [budgets, setBudgets] = useState<any[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [hasData, setHasData] = useState(false);

  // Colors for categories
  const categoryColors = {
    'Food & Dining': '#4CAF50',
    'Transport': '#2196F3',
    'Utilities': '#FF9800',
    'Entertainment': '#9C27B0',
    'Shopping': '#3F51B5',
    'Healthcare': '#E91E63',
    'Education': '#009688',
    'Other': '#607D8B'
  };

  // Use useFocusEffect to refresh data when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchAllData();
      return () => {
        // Cleanup if needed
      };
    }, [selectedPeriod])
  );

  // Improved check for data existence
  useEffect(() => {
    // This effect runs whenever relevant data changes
    const dataExists = 
      totalIncome > 0 || 
      totalExpense > 0 || 
      budgets.length > 0 || 
      spendingByCategory.length > 0;
    
    console.log('Data check in effect:', { 
      totalIncome, 
      totalExpense, 
      budgetsLength: budgets.length,
      categoriesLength: spendingByCategory.length,
      dataExists
    });
    
    setHasData(dataExists);
  }, [totalIncome, totalExpense, budgets.length, spendingByCategory.length]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTransactionData(),
        fetchBudgetData()
      ]);
    } catch (error) {
      console.error('Error fetching report data:', error);
      Alert.alert('Error', 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionData = async () => {
    try {
      // Get date range based on selected period
      const { startDate, endDate } = getDateRangeForPeriod(selectedPeriod);
      
      console.log(`Fetching transactions for ${selectedPeriod}: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      // Fetch transactions within date range
      const response = await api.get('/transactions', {
        params: { 
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });
      
      if (!response.data || !response.data.data || !response.data.data.transactions) {
        console.error('Invalid transaction data format:', response.data);
        throw new Error('Invalid transaction data returned from API');
      }
      
      const transactions = response.data.data.transactions;
      console.log('Transactions fetched:', transactions.length);
      
      // Process spending by category data
      processSpendingByCategory(transactions);
      
      // Process income vs expense data
      processIncomeVsExpenseData(transactions);
      
    } catch (error) {
      console.error('Error fetching transaction data:', error);
      throw error;
    }
  };

  const fetchBudgetData = async () => {
    try {
      const budgetsData = await budgetService.getBudgets();
      console.log('Budgets fetched:', budgetsData?.length || 0);
      setBudgets(budgetsData || []);
    } catch (error) {
      console.error('Error fetching budget data:', error);
      throw error;
    }
  };

  const getDateRangeForPeriod = (period: string) => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    
    switch (period) {
      case 'Weekly':
        startDate = new Date(now.setDate(now.getDate() - 7));
        endDate = new Date();
        break;
      case 'Monthly':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'Yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case 'Custom':
        // For now, default to last 3 months
        startDate = subMonths(startOfMonth(now), 2);
        endDate = endOfMonth(now);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }
    
    return { startDate, endDate };
  };

  const processSpendingByCategory = (transactions: any[]) => {
    // Filter expenses only
    const expenses = transactions.filter(t => t.type === 'expense');
    
    console.log('Processing expenses:', expenses.length);
    
    // Group expenses by category
    const categoryMap = new Map<string, number>();
    
    expenses.forEach(expense => {
      const category = expense.category || 'Other';
      const amount = expense.amount || 0;
      
      if (categoryMap.has(category)) {
        categoryMap.set(category, categoryMap.get(category)! + amount);
      } else {
        categoryMap.set(category, amount);
      }
    });
    
    // Convert map to array of objects for the chart
    const categoryData = Array.from(categoryMap.entries()).map(([name, amount]) => ({
      name,
      amount,
      color: categoryColors[name as keyof typeof categoryColors] || '#607D8B',
      legendFontColor: theme.colors.text,
      legendFontSize: 12
    }));
    
    // Sort by amount in descending order
    categoryData.sort((a, b) => b.amount - a.amount);
    
    // Limit number of categories for smaller screens
    // On small screens, show top categories and group the rest as "Other"
    const maxCategories = width < 360 ? 4 : 6;
    if (categoryData.length > maxCategories) {
      const topCategories = categoryData.slice(0, maxCategories - 1);
      const otherCategories = categoryData.slice(maxCategories - 1);
      
      const otherAmount = otherCategories.reduce((sum, cat) => sum + cat.amount, 0);
      if (otherAmount > 0) {
        topCategories.push({
          name: 'Other categories',
          amount: otherAmount,
          color: '#607D8B',
          legendFontColor: theme.colors.text,
          legendFontSize: 12
        });
      }
      
      console.log(`Limiting categories from ${categoryData.length} to ${topCategories.length} for small screen`);
      console.log('Spending categories processed:', topCategories.length);
      setSpendingByCategory(topCategories);
    } else {
      console.log('Spending categories processed:', categoryData.length);
      setSpendingByCategory(categoryData);
    }
  };

  const processIncomeVsExpenseData = (transactions: any[]) => {
    // For monthly/yearly view, group by month
    // For weekly view, group by day
    
    // For simplicity, we'll implement monthly view for now
    const incomeByMonth = new Map<string, number>();
    const expenseByMonth = new Map<string, number>();
    
    // Initialize with last 6 months
    const months: string[] = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = format(month, 'MMM');
      months.push(monthKey);
      incomeByMonth.set(monthKey, 0);
      expenseByMonth.set(monthKey, 0);
    }
    
    // Process transactions
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = format(date, 'MMM');
      
      // Only process if it's within our display range
      if (months.includes(monthKey)) {
        if (transaction.type === 'income') {
          incomeByMonth.set(monthKey, (incomeByMonth.get(monthKey) || 0) + transaction.amount);
        } else {
          expenseByMonth.set(monthKey, (expenseByMonth.get(monthKey) || 0) + transaction.amount);
        }
      }
    });
    
    // Prepare data for chart
    const labels = months;
    const incomeData = months.map(month => incomeByMonth.get(month) || 0);
    const expenseData = months.map(month => expenseByMonth.get(month) || 0);
    
    // Calculate totals
    const totalInc = incomeData.reduce((sum, amount) => sum + amount, 0);
    const totalExp = expenseData.reduce((sum, amount) => sum + amount, 0);
    
    setTotalIncome(totalInc);
    setTotalExpense(totalExp);
    
    setIncomeVsExpenseData({
      labels,
      datasets: [
        {
          data: incomeData,
          color: (opacity = 1) => theme.colors.success,
          strokeWidth: 2
        },
        {
          data: expenseData,
          color: (opacity = 1) => theme.colors.error,
          strokeWidth: 2
        }
      ]
    });
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
    if (screen === 'Home') {
      navigation.navigate('Home' as any);
    } else if (screen === 'Budget') {
      navigation.navigate('Budget' as any);
    } else if (screen === 'Transactions') {
      navigation.navigate('Transactions' as any);
    } else if (screen === 'Goals') {
      navigation.navigate('Goals' as any);
    }
  };

  const handleExport = async () => {
    try {
      await Share.share({
        message: 'Financial Report',
        title: 'Export Report',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export report');
    }
  };

  const handleCategoryPress = (category: string) => {
    setSelectedCategory(category === selectedCategory ? null : category);
  };

  // Calculate net savings
  const netSavings = totalIncome - totalExpense;
  
  // Get highest spending category
  const highestSpendingCategory = spendingByCategory[0] || { name: 'None', amount: 0 };

  // Force check for data in the render function
  const checkHasData = () => {
    const calculatedHasData = 
      totalIncome > 0 || 
      totalExpense > 0 || 
      budgets.length > 0 || 
      spendingByCategory.length > 0;
    
    return calculatedHasData;
  };

  // Handle navigation to account screen
  const handleProfilePress = () => {
    navigation.navigate('Account');
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader showNotifications={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading financial insights...</Text>
        </View>
        <BottomNavBar activeScreen={activeScreen} onPress={handleNavigation} />
      </SafeAreaView>
    );
  }

  // Render empty state for new users - use direct check instead of state
  if (!checkHasData()) {
    console.log('Rendering empty state (direct check)');
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader 
          showBackButton={false}
          showNotifications={true}
        />
        
        <View style={styles.headerContainer}>
          <Text style={styles.screenTitle}>Financial Insights</Text>
        </View>
        
        <View style={styles.emptyStateContainer}>
          <Ionicons name="analytics-outline" size={80} color={theme.colors.gray} />
          <Text style={styles.emptyStateTitle}>No data yet</Text>
          <Text style={styles.emptyStateText}>
            Start adding transactions to see your financial reports and insights
          </Text>
          <TouchableOpacity 
            style={styles.emptyStateButton}
            onPress={() => navigation.navigate('Transactions' as any, { showAddModal: true })}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.emptyStateButtonText}>Add Your First Transaction</Text>
          </TouchableOpacity>
        </View>
        
        <BottomNavBar activeScreen={activeScreen} onPress={handleNavigation} />
      </SafeAreaView>
    );
  }

  console.log('Rendering regular view, hasData=true or loading=true', { hasData, loading });
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        showProfile={true}
        onProfilePress={handleProfilePress}
      />
      
      <View style={styles.headerContainer}>
        <Text style={styles.screenTitle}>Financial Insights</Text>
        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Ionicons name="download-outline" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Time Range Selector */}
        <View style={styles.periodSelector}>
          {['Weekly', 'Monthly', 'Yearly', 'Custom'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.selectedPeriod
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodText,
                selectedPeriod === period && styles.selectedPeriodText
              ]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsContainer}>
          <View style={[styles.metricCard, styles.cardShadow]}>
            <Text style={styles.metricLabel}>Total Income</Text>
            <Text style={[styles.metricValue, styles.incomeValue]}>
              {formatCurrency(totalIncome)}
            </Text>
          </View>
          <View style={[styles.metricCard, styles.cardShadow]}>
            <Text style={styles.metricLabel}>Total Expenses</Text>
            <Text style={[styles.metricValue, styles.expenseValue]}>
              {formatCurrency(totalExpense)}
            </Text>
          </View>
          <View style={[styles.metricCard, styles.cardShadow]}>
            <Text style={styles.metricLabel}>Net Savings</Text>
            <Text style={[styles.metricValue, netSavings >= 0 ? styles.incomeValue : styles.expenseValue]}>
              {formatCurrency(Math.abs(netSavings))}
            </Text>
          </View>
        </View>

        {/* Spending Breakdown Chart */}
        {spendingByCategory.length > 0 ? (
          <View style={[styles.chartContainer, styles.cardShadow]}>
            <Text style={styles.chartTitle}>Spending by Category</Text>
            <View style={styles.pieChartContainer}>
              <PieChart
                data={spendingByCategory.map(category => ({
                  ...category,
                  // Make text smaller on small screens
                  legendFontSize: width < 360 ? 10 : 12
                }))}
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                chartConfig={{
                  backgroundColor: theme.colors.white,
                  backgroundGradientFrom: theme.colors.white,
                  backgroundGradientTo: theme.colors.white,
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="0"
                absolute
                center={[CHART_WIDTH/2 - 140, 0]}
                hasLegend={true}
              />
            </View>
          </View>
        ) : (
          <View style={[styles.chartContainer, styles.cardShadow]}>
            <Text style={styles.chartTitle}>Spending by Category</Text>
            <View style={styles.noChartDataContainer}>
              <Text style={styles.noDataText}>No expense data for this period</Text>
            </View>
          </View>
        )}

        {/* Income vs Expense Chart */}
        {incomeVsExpenseData.labels.length > 0 ? (
          <View style={[styles.chartContainer, styles.cardShadow]}>
            <Text style={styles.chartTitle}>Income vs Expenses</Text>
            <View style={styles.lineChartContainer}>
              <LineChart
                data={incomeVsExpenseData}
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                chartConfig={{
                  backgroundColor: theme.colors.white,
                  backgroundGradientFrom: theme.colors.white,
                  backgroundGradientTo: theme.colors.white,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: "6",
                    strokeWidth: "2",
                  }
                }}
                bezier
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                  marginLeft: -20,
                }}
              />
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
                  <Text style={styles.legendText}>Income</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.colors.error }]} />
                  <Text style={styles.legendText}>Expenses</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.chartContainer, styles.cardShadow]}>
            <Text style={styles.chartTitle}>Income vs Expenses</Text>
            <View style={styles.noChartDataContainer}>
              <Text style={styles.noDataText}>No transaction data for this period</Text>
            </View>
          </View>
        )}

        {/* Budget Utilization */}
        <View style={[styles.budgetContainer, styles.cardShadow]}>
          <Text style={styles.sectionTitle}>Budget Utilization</Text>
          
          {budgets.length > 0 ? (
            budgets.map((budget, index) => {
              const spent = budget.currentSpending || 0;
              const allocated = budget.amount || 0;
              const percentage = allocated > 0 ? (spent / allocated) * 100 : 0;
              const isOverBudget = percentage > 100;
              const isNearBudget = percentage > 80 && percentage <= 100;
              const budgetStatus = isOverBudget ? 'exceeded' : isNearBudget ? 'warning' : 'safe';
              
              return (
                <TouchableOpacity
                  key={budget._id || index}
                  style={styles.budgetItem}
                  onPress={() => handleCategoryPress(budget.category)}
                >
                  <View style={styles.budgetHeader}>
                    <View style={[
                      styles.categoryDot, 
                      { backgroundColor: categoryColors[budget.category as keyof typeof categoryColors] || '#607D8B' }
                    ]} />
                    <Text style={styles.categoryName}>{budget.category}</Text>
                    <Text style={styles.budgetAmount}>{formatCurrency(spent)}</Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View 
                      style={[
                        styles.progressBar,
                        { 
                          width: `${Math.min(percentage, 100)}%`,
                          backgroundColor: isOverBudget 
                            ? theme.colors.error 
                            : isNearBudget 
                              ? theme.colors.warning 
                              : theme.colors.success
                        }
                      ]} 
                    />
                  </View>
                  
                  {selectedCategory === budget.category && (
                    <View style={styles.budgetDetails}>
                      <View style={styles.budgetDetailRow}>
                        <Text style={styles.budgetDetailLabel}>Allocated:</Text>
                        <Text style={styles.budgetDetailValue}>{formatCurrency(allocated)}</Text>
                      </View>
                      <View style={styles.budgetDetailRow}>
                        <Text style={styles.budgetDetailLabel}>Spent:</Text>
                        <Text style={[
                          styles.budgetDetailValue,
                          isOverBudget && styles.redText
                        ]}>{formatCurrency(spent)}</Text>
                      </View>
                      <View style={styles.budgetDetailRow}>
                        <Text style={styles.budgetDetailLabel}>Remaining:</Text>
                        <Text style={[
                          styles.budgetDetailValue,
                          isOverBudget ? styles.redText : styles.greenText
                        ]}>{formatCurrency(allocated - spent)}</Text>
                      </View>
                      <View style={styles.budgetDetailRow}>
                        <Text style={styles.budgetDetailLabel}>Utilization:</Text>
                        <Text style={[
                          styles.budgetDetailValue,
                          isOverBudget ? styles.redText : isNearBudget ? styles.yellowText : styles.greenText
                        ]}>{percentage.toFixed(1)}%</Text>
                      </View>
                      {isOverBudget && (
                        <View style={styles.budgetStatusTag}>
                          <Ionicons name="alert-circle" size={14} color="#fff" />
                          <Text style={styles.budgetStatusText}>Over Budget</Text>
                        </View>
                      )}
                      {isNearBudget && (
                        <View style={[styles.budgetStatusTag, styles.warningTag]}>
                          <Ionicons name="warning" size={14} color="#fff" />
                          <Text style={styles.budgetStatusText}>Near Limit</Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.noBudgetContainer}>
              <Text style={styles.noBudgetText}>No budgets created yet</Text>
              <TouchableOpacity 
                style={styles.createBudgetButton}
                onPress={() => navigation.navigate('Budget' as any)}
              >
                <Text style={styles.createBudgetText}>Create Budget</Text>
              </TouchableOpacity>
            </View>
          )}
      </View>
      </ScrollView>
      
      <BottomNavBar activeScreen={activeScreen} onPress={handleNavigation} />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  exportButton: {
    padding: 8,
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
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: theme.colors.lightGray,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  selectedPeriod: {
    backgroundColor: theme.colors.primary,
  },
  periodText: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  selectedPeriodText: {
    color: theme.colors.white,
    fontWeight: '500',
  },
  metricsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  cardShadow: {
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
  metricLabel: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  incomeValue: {
    color: theme.colors.success,
  },
  expenseValue: {
    color: theme.colors.error,
  },
  chartContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  noChartDataContainer: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  budgetContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  budgetItem: {
    marginBottom: 16,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  budgetAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
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
  budgetDetails: {
    marginTop: 8,
    padding: 12,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 8,
  },
  budgetDetailText: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  budgetDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  budgetDetailLabel: {
    fontSize: 13,
    color: theme.colors.textLight,
  },
  budgetDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  redText: {
    color: theme.colors.error,
  },
  yellowText: {
    color: theme.colors.warning,
  },
  greenText: {
    color: theme.colors.success,
  },
  budgetStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  warningTag: {
    backgroundColor: theme.colors.warning,
  },
  budgetStatusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    marginLeft: 4,
  },
  pieChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    overflow: 'hidden',
    marginBottom: 10,
  },
  lineChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  noBudgetContainer: {
    alignItems: 'center',
    padding: 24,
  },
  noBudgetText: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 16,
    textAlign: 'center',
  },
  createBudgetButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  createBudgetText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyStateButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    marginLeft: 8,
  }
});

export default ReportsScreen; 