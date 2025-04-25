import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  SafeAreaView,
  RefreshControl,
  Platform,
  Dimensions,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react';
import { useNavigation } from '../hooks/useNavigation';
import { theme } from '../theme';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import { ScreenName } from '../components/BottomNavBar';

// Interface for budget category
interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  period: 'Monthly' | 'Weekly' | 'Yearly';
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const BudgetScreen = observer(() => {
  const navigation = useNavigation();
  const [activeScreen, setActiveScreen] = useState<ScreenName>('Budget');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedPeriod, setSelectedPeriod] = useState('Monthly');
  
  // State for adding new budget
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState('');
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  
  // Demo budget categories
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([
    { 
      id: '1', 
      name: 'Food & Dining', 
      allocated: 500, 
      spent: 320, 
      icon: 'restaurant-outline', 
      color: '#4CAF50',
      period: 'Monthly'
    },
    { 
      id: '2', 
      name: 'Transport', 
      allocated: 200, 
      spent: 150, 
      icon: 'car-outline', 
      color: '#2196F3',
      period: 'Monthly'
    },
    { 
      id: '3', 
      name: 'Utilities', 
      allocated: 150, 
      spent: 180, 
      icon: 'flash-outline', 
      color: '#FF9800',
      period: 'Monthly'
    },
    { 
      id: '4', 
      name: 'Entertainment', 
      allocated: 200, 
      spent: 90, 
      icon: 'film-outline', 
      color: '#9C27B0',
      period: 'Monthly'
    },
    { 
      id: '5', 
      name: 'Shopping', 
      allocated: 300, 
      spent: 275, 
      icon: 'cart-outline', 
      color: '#E91E63',
      period: 'Monthly'
    },
  ]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    // Fetch latest budget data here
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  const handleNavigation = (screen: ScreenName) => {
    setActiveScreen(screen);
    if (screen === 'Home') {
      navigation.navigate('Home');
    } else if (screen === 'Transactions') {
      navigation.navigate('Transactions');
    } else if (screen === 'Reports') {
      navigation.navigate('Reports');
    }
  };
  
  // Calculate total budget amounts
  const totalAllocated = budgetCategories.reduce((sum, category) => sum + category.allocated, 0);
  const totalSpent = budgetCategories.reduce((sum, category) => sum + category.spent, 0);
  const totalRemaining = totalAllocated - totalSpent;
  
  // Handle adding a new budget
  const handleAddBudget = () => {
    if (!newBudgetName.trim()) {
      Alert.alert('Error', 'Please enter a budget name');
      return;
    }
    
    if (!newBudgetAmount.trim() || isNaN(Number(newBudgetAmount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    const newBudget: BudgetCategory = {
      id: Date.now().toString(),
      name: newBudgetName,
      allocated: Number(newBudgetAmount),
      spent: 0,
      icon: 'wallet-outline',
      color: '#3770FF',
      period: selectedPeriod as 'Monthly' | 'Weekly' | 'Yearly',
    };
    
    setBudgetCategories([...budgetCategories, newBudget]);
    setNewBudgetName('');
    setNewBudgetAmount('');
    setShowAddModal(false);
  };
  
  // Get filtered categories
  const getFilteredCategories = () => {
    let filtered = budgetCategories;
    
    // Filter by period
    if (selectedPeriod !== 'All') {
      filtered = filtered.filter(cat => cat.period === selectedPeriod);
    }
    
    // Filter by status
    if (selectedFilter === 'Exceeded') {
      filtered = filtered.filter(cat => cat.spent > cat.allocated);
    } else if (selectedFilter === 'Active') {
      filtered = filtered.filter(cat => cat.spent <= cat.allocated);
    }
    
    return filtered;
  };
  
  // Calculate percentage for progress bars
  const calculatePercentage = (spent: number, allocated: number) => {
    const percentage = (spent / allocated) * 100;
    return percentage > 100 ? 100 : percentage;
  };
  
  // Get color based on budget usage
  const getProgressColor = (spent: number, allocated: number) => {
    const percentage = (spent / allocated) * 100;
    if (percentage > 90) return theme.colors.error;
    if (percentage > 75) return '#FF9800';
    return theme.colors.success;
  };

  // Render the budget item
  const renderBudgetItem = ({ item }: { item: BudgetCategory }) => {
    const percentage = calculatePercentage(item.spent, item.allocated);
    const isOverBudget = item.spent > item.allocated;
    const progressColor = getProgressColor(item.spent, item.allocated);
    const remaining = item.allocated - item.spent;
    
    return (
      <View style={[styles.budgetItem, styles.cardShadow]}>
        <View style={styles.budgetHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
            <Ionicons name={item.icon} size={20} color="#fff" />
          </View>
          <View style={styles.budgetInfo}>
            <Text style={styles.budgetName}>{item.name}</Text>
            <Text style={styles.budgetPeriod}>{item.period}</Text>
          </View>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.textLight} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.budgetAmounts}>
          <View>
            <Text style={styles.amountLabel}>Allocated</Text>
            <Text style={styles.amountValue}>${item.allocated.toFixed(2)}</Text>
          </View>
          <View>
            <Text style={styles.amountLabel}>Spent</Text>
            <Text style={[styles.amountValue, isOverBudget && styles.redText]}>
              ${item.spent.toFixed(2)}
            </Text>
          </View>
          <View>
            <Text style={styles.amountLabel}>Remaining</Text>
            <Text style={[styles.amountValue, isOverBudget ? styles.redText : styles.greenText]}>
              ${remaining.toFixed(2)}
            </Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${percentage}%`, backgroundColor: progressColor }
              ]}
            />
          </View>
          <Text style={styles.percentageText}>{percentage.toFixed(0)}%</Text>
        </View>
      </View>
    );
  };

  // Empty state when no budgets
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="wallet-outline" size={60} color={theme.colors.gray} />
      <Text style={styles.emptyStateTitle}>No budgets yet</Text>
      <Text style={styles.emptyStateText}>
        Start by creating your first budget!
      </Text>
      <TouchableOpacity 
        style={styles.emptyStateButton}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.emptyStateButtonText}>Create Budget</Text>
      </TouchableOpacity>
    </View>
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
        <Text style={styles.screenTitle}>My Budgets</Text>
      </View>
      
      {/* Filter tabs */}
      <View style={styles.tabContainer}>
        {['All', 'Active', 'Exceeded'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              selectedFilter === filter && styles.activeFilterTab
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text 
              style={[
                styles.filterText,
                selectedFilter === filter && styles.activeFilterText
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Summary card */}
      <View style={[styles.summaryCard, styles.cardShadow]}>
        <Text style={styles.summaryTitle}>Budget Summary</Text>
        <View style={styles.summaryContent}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Budget</Text>
            <Text style={styles.summaryAmount}>${totalAllocated.toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Spent</Text>
            <Text style={styles.summaryAmount}>${totalSpent.toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Remaining</Text>
            <Text style={[
              styles.summaryAmount, 
              totalRemaining < 0 ? styles.redText : styles.greenText
            ]}>
              ${totalRemaining.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Budget listing */}
      <FlatList
        data={getFilteredCategories()}
        renderItem={renderBudgetItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      
      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
      
      {/* Add Budget Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Budget</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Budget Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Groceries, Rent, etc."
                value={newBudgetName}
                onChangeText={setNewBudgetName}
              />
              
              <Text style={styles.inputLabel}>Budget Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={newBudgetAmount}
                onChangeText={setNewBudgetAmount}
              />
              
              <Text style={styles.inputLabel}>Period</Text>
              <View style={styles.periodSelector}>
                {['Monthly', 'Weekly', 'Yearly'].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodOption,
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
              
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddBudget}
              >
                <Text style={styles.addButtonText}>Create Budget</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.lightGray,
  },
  activeFilterTab: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  activeFilterText: {
    color: theme.colors.white,
    fontWeight: '500',
  },
  summaryCard: {
    margin: 16,
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  divider: {
    width: 1,
    backgroundColor: theme.colors.lightGray,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  budgetItem: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetInfo: {
    flex: 1,
    marginLeft: 12,
  },
  budgetName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  budgetPeriod: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  menuButton: {
    padding: 5,
  },
  budgetAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBackground: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textLight,
    width: 36,
    textAlign: 'right',
  },
  redText: {
    color: theme.colors.error,
  },
  greenText: {
    color: theme.colors.success,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  modalContent: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: theme.colors.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  periodOption: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    backgroundColor: theme.colors.lightGray,
    marginRight: 8,
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
  addButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 80, // Above the bottom nav bar
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});

export default BudgetScreen; 