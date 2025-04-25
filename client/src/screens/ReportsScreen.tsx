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
  Alert
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

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 32;
const CHART_HEIGHT = 220;

// Demo data for charts
const spendingData = [
  { name: 'Food & Dining', amount: 500, color: '#4CAF50', legendFontColor: theme.colors.text, legendFontSize: 12 },
  { name: 'Transport', amount: 300, color: '#2196F3', legendFontColor: theme.colors.text, legendFontSize: 12 },
  { name: 'Utilities', amount: 200, color: '#FF9800', legendFontColor: theme.colors.text, legendFontSize: 12 },
  { name: 'Entertainment', amount: 150, color: '#E91E63', legendFontColor: theme.colors.text, legendFontSize: 12 },
  { name: 'Shopping', amount: 250, color: '#9C27B0', legendFontColor: theme.colors.text, legendFontSize: 12 },
];

const incomeExpenseData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      data: [3000, 3200, 2800, 3500, 3000, 3300],
      color: (opacity = 1) => theme.colors.success,
      strokeWidth: 2
    },
    {
      data: [2500, 2800, 2600, 3000, 2700, 2900],
      color: (opacity = 1) => theme.colors.error,
      strokeWidth: 2
    }
  ]
};

const ReportsScreen = observer(() => {
  const navigation = useNavigation();
  const [activeScreen, setActiveScreen] = useState<ScreenName>('Reports');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Monthly');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    // Fetch latest reports data here
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  const handleNavigation = (screen: ScreenName) => {
    setActiveScreen(screen);
    if (screen === 'Home') {
      navigation.navigate('Home');
    } else if (screen === 'Budget') {
      navigation.navigate('Budget');
    } else if (screen === 'Transactions') {
      navigation.navigate('Transactions');
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

  // Calculate total amounts
  const totalIncome = incomeExpenseData.datasets[0].data.reduce((a, b) => a + b, 0);
  const totalExpense = incomeExpenseData.datasets[1].data.reduce((a, b) => a + b, 0);
  const netSavings = totalIncome - totalExpense;
  const highestSpendingCategory = spendingData.reduce((prev, current) => 
    (prev.amount > current.amount) ? prev : current
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        showBackButton={false}
        showNotifications={true}
        onNotificationsPress={() => {
          // Handle notifications
        }}
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
              ${totalIncome.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.metricCard, styles.cardShadow]}>
            <Text style={styles.metricLabel}>Total Expenses</Text>
            <Text style={[styles.metricValue, styles.expenseValue]}>
              ${totalExpense.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.metricCard, styles.cardShadow]}>
            <Text style={styles.metricLabel}>Net Savings</Text>
            <Text style={[styles.metricValue, netSavings >= 0 ? styles.incomeValue : styles.expenseValue]}>
              ${Math.abs(netSavings).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Spending Breakdown Chart */}
        <View style={[styles.chartContainer, styles.cardShadow]}>
          <Text style={styles.chartTitle}>Spending by Category</Text>
          <PieChart
            data={spendingData}
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
            paddingLeft="15"
            absolute
          />
        </View>

        {/* Income vs Expense Chart */}
        <View style={[styles.chartContainer, styles.cardShadow]}>
          <Text style={styles.chartTitle}>Income vs Expenses</Text>
          <LineChart
            data={incomeExpenseData}
            width={CHART_WIDTH}
            height={CHART_HEIGHT}
            chartConfig={{
              backgroundColor: theme.colors.white,
              backgroundGradientFrom: theme.colors.white,
              backgroundGradientTo: theme.colors.white,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16,
            }}
          />
        </View>

        {/* Budget Utilization */}
        <View style={[styles.budgetContainer, styles.cardShadow]}>
          <Text style={styles.sectionTitle}>Budget Utilization</Text>
          {spendingData.map((category, index) => {
            const percentage = (category.amount / 1000) * 100; // Assuming 1000 as budget
            const isOverBudget = percentage > 100;
            const isNearBudget = percentage > 80 && percentage <= 100;
            
            return (
              <TouchableOpacity
                key={index}
                style={styles.budgetItem}
                onPress={() => handleCategoryPress(category.name)}
              >
                <View style={styles.budgetHeader}>
                  <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.budgetAmount}>${category.amount}</Text>
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
                {selectedCategory === category.name && (
                  <View style={styles.budgetDetails}>
                    <Text style={styles.budgetDetailText}>
                      Budget: $1,000
                    </Text>
                    <Text style={styles.budgetDetailText}>
                      Remaining: ${(1000 - category.amount).toFixed(2)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
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
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
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
    padding: 8,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 8,
  },
  budgetDetailText: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
});

export default ReportsScreen; 