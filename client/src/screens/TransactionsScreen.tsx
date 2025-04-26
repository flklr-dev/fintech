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
  Alert,
  SectionList,
  KeyboardAvoidingView,
  ActivityIndicator,
  ToastAndroid,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useNavigation } from '../hooks/useNavigation';
import { theme } from '../theme';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import { ScreenName } from '../components/BottomNavBar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import api from '../api/api';
import * as transactionService from '../api/transactionService';
import { budgetService, Budget as BudgetType } from '../services/budgetService';

// Interface for transaction
interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  date: Date;
  note?: string;
  isRecurring?: boolean;
  paymentMethod?: string;
  linkedBudget?: string; // Changed to string to store budget ID
}

// Define categories for both expense and income
const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transport',
  'Utilities',
  'Entertainment',
  'Shopping',
  'Healthcare',
  'Education',
  'Other'
];

const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investments',
  'Gift',
  'Refund',
  'Other'
];

// Payment methods
const PAYMENT_METHODS = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'Bank Transfer',
  'E-wallet',
  'Other'
];

// Map of category-specific icons
const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Food & Dining': 'restaurant-outline',
  'Transport': 'car-outline',
  'Utilities': 'flash-outline',
  'Entertainment': 'film-outline',
  'Shopping': 'cart-outline',
  'Healthcare': 'medical-outline',
  'Education': 'school-outline',
  'Rent': 'home-outline',
  'Salary': 'cash-outline',
  'Freelance': 'laptop-outline',
  'Investments': 'trending-up-outline',
  'Gift': 'gift-outline',
  'Refund': 'return-down-back-outline',
  'Other': 'wallet-outline'
};

// Map of category-specific colors
const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#4CAF50', // Green
  'Transport': '#2196F3',     // Blue
  'Utilities': '#FF9800',     // Orange
  'Entertainment': '#9C27B0', // Purple
  'Shopping': '#E91E63',      // Pink
  'Healthcare': '#00BCD4',    // Cyan
  'Education': '#3F51B5',     // Indigo
  'Rent': '#795548',          // Brown
  'Salary': '#4CAF50',        // Green
  'Freelance': '#2196F3',     // Blue
  'Investments': '#673AB7',   // Deep Purple
  'Gift': '#E91E63',          // Pink
  'Refund': '#FF9800',        // Orange
  'Other': '#607D8B'          // Blue Grey
};

// Interface for grouped transactions
interface GroupedTransaction {
  title: string;
  data: Transaction[];
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const TransactionsScreen = observer(() => {
  const navigation = useNavigation();
  const [activeScreen, setActiveScreen] = useState<ScreenName>('Transactions');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState('Today');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    title: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    category: '',
    note: '',
    date: new Date(),
    paymentMethod: '',
    linkedBudget: ''
  });
  const [lastTransactionType, setLastTransactionType] = useState<'income' | 'expense'>('expense');
  const [showSuccessFeedback, setShowSuccessFeedback] = useState(false);
  const successOpacity = useState(new Animated.Value(0))[0];
  
  // Demo transactions data
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      title: 'Grocery Shopping',
      amount: 45.99,
      type: 'expense',
      category: 'Food & Dining',
      icon: 'cart-outline',
      color: '#4CAF50',
      date: new Date(),
      note: 'Weekly groceries',
    },
    {
      id: '2',
      title: 'Salary Deposit',
      amount: 2500.00,
      type: 'income',
      category: 'Salary',
      icon: 'cash-outline',
      color: '#2196F3',
      date: new Date(),
      isRecurring: true,
    },
    {
      id: '3',
      title: 'Gas Station',
      amount: 35.50,
      type: 'expense',
      category: 'Transport',
      icon: 'car-outline',
      color: '#FF9800',
      date: new Date(Date.now() - 86400000), // Yesterday
    },
    {
      id: '4',
      title: 'Netflix Subscription',
      amount: 14.99,
      type: 'expense',
      category: 'Entertainment',
      icon: 'tv-outline',
      color: '#E91E63',
      date: new Date(Date.now() - 86400000),
      isRecurring: true,
    },
  ]);

  // Form validation
  const [formErrors, setFormErrors] = useState({
    amount: '',
    category: ''
  });

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Add state for available budgets
  const [availableBudgets, setAvailableBudgets] = useState<BudgetType[]>([]);
  const [activeBudgetsByCategory, setActiveBudgetsByCategory] = useState<Record<string, BudgetType>>({});
  
  // Initialize all sections as expanded by default
  useEffect(() => {
    if (transactions.length > 0) {
      const sectionTitles = Array.from(new Set(transactions.map(t => t.date.toDateString())));
      const initialExpandState = sectionTitles.reduce((state, title) => {
        state[title] = true; // All sections expanded by default
        return state;
      }, {} as { [key: string]: boolean });
      
      setExpandedSections(initialExpandState);
    }
  }, [transactions]);

  // Fetch transactions from API
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Use the existing axios instance with proper error handling
      const response = await api.get('/transactions');
      
      // Check if we have valid data
      if (response && response.data && response.data.data && response.data.data.transactions) {
        // Map transactions to our internal structure
        const formattedTransactions = response.data.data.transactions.map((transaction: any) => {
          const category = transaction.category || 'Other';
          return {
            id: transaction._id || transaction.id,
            title: transaction.description || category,
            amount: transaction.amount,
            type: transaction.type,
            category: category,
            icon: CATEGORY_ICONS[category] || 'wallet-outline',
            color: CATEGORY_COLORS[category] || theme.colors.primary,
            date: new Date(transaction.date),
            note: transaction.description,
            paymentMethod: transaction.paymentMethod || '',
            linkedBudget: transaction.linkedBudget || false
          };
        });
        
        setTransactions(formattedTransactions);
      } else {
        console.log('No transactions data received, using demo data');
        // Fallback to demo data if no transactions found
        setTransactions([
          {
            id: '1',
            title: 'Grocery Shopping',
            amount: 45.99,
            type: 'expense',
            category: 'Food & Dining',
            icon: 'cart-outline',
            color: '#4CAF50',
            date: new Date(),
            note: 'Weekly groceries',
          },
          {
            id: '2',
            title: 'Salary Deposit',
            amount: 2500.00,
            type: 'income',
            category: 'Salary',
            icon: 'cash-outline',
            color: '#2196F3',
            date: new Date(),
            isRecurring: true,
          },
          {
            id: '3',
            title: 'Gas Station',
            amount: 35.50,
            type: 'expense',
            category: 'Transport',
            icon: 'car-outline',
            color: '#FF9800',
            date: new Date(Date.now() - 86400000), // Yesterday
          },
          {
            id: '4',
            title: 'Netflix Subscription',
            amount: 14.99,
            type: 'expense',
            category: 'Entertainment',
            icon: 'tv-outline',
            color: '#E91E63',
            date: new Date(Date.now() - 86400000),
            isRecurring: true,
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      
      // Fallback to demo data if API fails
      setTransactions([
        {
          id: '1',
          title: 'Grocery Shopping',
          amount: 45.99,
          type: 'expense',
          category: 'Food & Dining',
          icon: 'cart-outline',
          color: '#4CAF50',
          date: new Date(),
          note: 'Weekly groceries',
        },
        {
          id: '2',
          title: 'Salary Deposit',
          amount: 2500.00,
          type: 'income',
          category: 'Salary',
          icon: 'cash-outline',
          color: '#2196F3',
          date: new Date(),
          isRecurring: true,
        },
        {
          id: '3',
          title: 'Gas Station',
          amount: 35.50,
          type: 'expense',
          category: 'Transport',
          icon: 'car-outline',
          color: '#FF9800',
          date: new Date(Date.now() - 86400000), // Yesterday
        },
        {
          id: '4',
          title: 'Netflix Subscription',
          amount: 14.99,
          type: 'expense',
          category: 'Entertainment',
          icon: 'tv-outline',
          color: '#E91E63',
          date: new Date(Date.now() - 86400000),
          isRecurring: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch transactions and budgets
  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Fetch transactions
      await fetchTransactions();
      
      // Fetch budgets
      const budgets = await budgetService.getBudgets();
      setAvailableBudgets(budgets);
      
      // Create a map of active budgets by category
      const budgetMap: Record<string, BudgetType> = {};
      budgets.forEach(budget => {
        const now = new Date();
        if (new Date(budget.startDate) <= now && new Date(budget.endDate) >= now) {
          budgetMap[budget.category] = budget;
        }
      });
      setActiveBudgetsByCategory(budgetMap);
      
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  };
  
  const handleNavigation = (screen: ScreenName) => {
    setActiveScreen(screen);
    if (screen === 'Home') {
      navigation.navigate('Home');
    } else if (screen === 'Budget') {
      navigation.navigate('Budget');
    } else if (screen === 'Reports') {
      navigation.navigate('Reports');
    }
  };

  // Group transactions by date
  const getGroupedTransactions = () => {
    const filtered = transactions.filter(transaction => {
      const matchesSearch = transaction.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || transaction.category === selectedCategory;
      const matchesType = selectedType === 'All' || transaction.type === selectedType;
      return matchesSearch && matchesCategory && matchesType;
    });

    const groups: { [key: string]: Transaction[] } = {};
    
    filtered.forEach(transaction => {
      const date = transaction.date.toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
    });

    return Object.entries(groups).map(([date, data]) => ({
      title: date,
      data: data.sort((a, b) => b.date.getTime() - a.date.getTime())
    }));
  };

  // Toggle section expansion
  const toggleSection = (date: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  // Handle category selection to automatically set budget link for expenses
  const handleCategorySelect = (category: string) => {
    setNewTransaction(prev => ({ ...prev, category }));
    setFormErrors(prev => ({ ...prev, category: '' }));
    
    // Auto-link to budget if it's an expense and budget exists for the category
    if (newTransaction.type === 'expense' && activeBudgetsByCategory[category]) {
      setNewTransaction(prev => ({ 
        ...prev, 
        category,
        linkedBudget: activeBudgetsByCategory[category]._id
      }));
    } else {
      setNewTransaction(prev => ({ 
        ...prev, 
        category,
        linkedBudget: '' // Clear budget link if no matching budget
      }));
    }
  };
  
  // Handle expense/income toggle with budget implications
  const handleTypeChange = (type: 'income' | 'expense') => {
    setNewTransaction(prev => ({ 
      ...prev, 
      type,
      category: '', // Reset category when changing type
      linkedBudget: '' // Reset budget link when changing type
    }));
    setFormErrors(prev => ({ ...prev, category: '' }));
  };

  // Function to show success feedback
  const showTransactionAddedFeedback = (transactionType: 'income' | 'expense') => {
    setShowSuccessFeedback(true);
    
    // Animate opacity in
    Animated.sequence([
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.delay(2000),
      Animated.timing(successOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => {
      setShowSuccessFeedback(false);
    });
    
    // Show toast on Android
    if (Platform.OS === 'android') {
      ToastAndroid.show(
        `${transactionType === 'income' ? 'Income' : 'Expense'} added successfully!`, 
        ToastAndroid.SHORT
      );
    }
  };

  // Handle adding new transaction with budget integration
  const handleAddTransaction = async () => {
    // Reset form errors
    const errors = {
      amount: '',
      category: ''
    };
    
    // Validate amount
    if (!newTransaction.amount.trim()) {
      errors.amount = 'Amount is required';
    } else if (parseFloat(newTransaction.amount) <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }
    
    // Validate category
    if (!newTransaction.category) {
      errors.category = 'Please select a category';
    }
    
    // Check for future date
    if (newTransaction.date > new Date()) {
      Alert.alert('Invalid Date', 'Transaction date cannot be in the future');
      return;
    }
    
    // If there are errors, show them and stop submission
    if (errors.amount || errors.category) {
      setFormErrors(errors);
      return;
    }

    // Create title if not provided
    const title = newTransaction.title.trim() 
      ? newTransaction.title 
      : newTransaction.category;
      
    const amount = parseFloat(newTransaction.amount);
    
    // Get icon and color based on category
    const icon = CATEGORY_ICONS[newTransaction.category] || 'wallet-outline';
    const color = CATEGORY_COLORS[newTransaction.category] || theme.colors.primary;
    
    try {
      // For expenses, ensure it's linked to a budget if one exists
      let linkedBudgetId = newTransaction.linkedBudget;
      
      if (newTransaction.type === 'expense' && !linkedBudgetId) {
        // Check if there's an active budget for this category
        if (activeBudgetsByCategory[newTransaction.category]) {
          linkedBudgetId = activeBudgetsByCategory[newTransaction.category]._id;
        }
      }
      
      // Prepare data for API call
      const transactionData = {
        amount,
        type: newTransaction.type,
        category: newTransaction.category,
        description: title,
        date: newTransaction.date,
        note: newTransaction.note,
        paymentMethod: newTransaction.paymentMethod,
        linkedBudget: linkedBudgetId || undefined
      };
      
      // Send to API
      const response = await transactionService.createTransaction(transactionData);
      
      // Format for local state update
      const newTransactionObj: Transaction = {
        id: response.data.transaction._id || Date.now().toString(),
        title,
        amount,
        type: newTransaction.type,
        category: newTransaction.category,
        icon,
        color,
        date: newTransaction.date,
        note: newTransaction.note,
        paymentMethod: newTransaction.paymentMethod || '',
        linkedBudget: linkedBudgetId
      };
      
      // Update local state
      setTransactions([newTransactionObj, ...transactions]);
      
      // For expenses, explicitly refresh the budget spending calculations
      if (newTransaction.type === 'expense') {
        try {
          // First refresh the spending calculations on the server
          await budgetService.refreshBudgetSpending();
          
          // Then fetch updated budgets
          const budgets = await budgetService.getBudgets();
          setAvailableBudgets(budgets);
          
          // Update active budgets map
          const budgetMap: Record<string, BudgetType> = {};
          budgets.forEach(budget => {
            const now = new Date();
            if (new Date(budget.startDate) <= now && new Date(budget.endDate) >= now) {
              budgetMap[budget.category] = budget;
            }
          });
          setActiveBudgetsByCategory(budgetMap);
          
          console.log('Successfully refreshed budget data after transaction');
        } catch (refreshError) {
          console.error('Error refreshing budget data:', refreshError);
        }
      }
      
      // Show success feedback
      showTransactionAddedFeedback(newTransaction.type);
      
      // Close modal and reset form
      setShowAddModal(false);
      setNewTransaction({
        title: '',
        amount: '',
        type: 'expense',
        category: '',
        note: '',
        date: new Date(),
        paymentMethod: '',
        linkedBudget: ''
      });
      setFormErrors({ amount: '', category: '' });
      
      // Update last transaction type
      setLastTransactionType(newTransaction.type);
      
    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert(
        'Error',
        'Failed to create transaction. Please try again.'
      );
    }
  };
  
  // Handle date change
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setNewTransaction(prev => ({ ...prev, date: selectedDate }));
    }
  };
  
  // Get appropriate categories based on transaction type
  const getCategories = () => {
    return newTransaction.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  };

  // Render transaction item
  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const isExpense = item.type === 'expense';
    
    return (
      <TouchableOpacity 
        style={[styles.transactionItem, styles.cardShadow]}
        onPress={() => {
          // Handle transaction details
        }}
      >
        <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon} size={20} color="#fff" />
        </View>
        
        <View style={styles.transactionInfo}>
          <View style={styles.transactionHeader}>
            <Text style={styles.transactionTitle}>{item.title}</Text>
            {item.isRecurring && (
              <Ionicons name="repeat" size={16} color={theme.colors.primary} />
            )}
          </View>
          <Text style={styles.transactionCategory}>{item.category}</Text>
          <Text style={styles.transactionDate}>
            {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        
        <View style={styles.amountContainer}>
          <Text style={[
            styles.transactionAmount,
            isExpense ? styles.expenseAmount : styles.incomeAmount
          ]}>
            {isExpense ? '-' : '+'}${Math.abs(item.amount).toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render section header with expand/collapse
  const renderSectionHeader = ({ section: { title } }: { section: GroupedTransaction }) => (
    <TouchableOpacity 
      style={styles.sectionHeader}
      onPress={() => toggleSection(title)}
    >
      <View style={styles.sectionHeaderContent}>
        <Text style={styles.sectionTitle}>
          {new Date(title).toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })}
        </Text>
        <Ionicons 
          name={expandedSections[title] ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color={theme.colors.textLight} 
        />
      </View>
    </TouchableOpacity>
  );

  // Render transaction list with expandable sections
  const renderTransactionList = () => (
    <SectionList
      sections={getGroupedTransactions()}
      renderItem={({ item, section }) => 
        expandedSections[section.title] ? renderTransactionItem({ item }) : null
      }
      renderSectionHeader={renderSectionHeader}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={renderEmptyState}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    />
  );

  // Empty state when no transactions
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="wallet-outline" size={80} color={theme.colors.gray} />
      <Text style={styles.emptyStateTitle}>No transactions yet</Text>
      <Text style={styles.emptyStateText}>
        Start by logging your expenses or income!
      </Text>
      <TouchableOpacity 
        style={styles.emptyStateButton}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add-circle-outline" size={24} color={theme.colors.white} style={{ marginRight: 8 }} />
        <Text style={styles.emptyStateButtonText}>Add Your First Transaction</Text>
      </TouchableOpacity>
    </View>
  );

  // Empty state check - determine if we have transactions
  const hasTransactions = transactions.length > 0;

  // Render add transaction modal
  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddModal(false)}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Transaction</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Transaction Type Toggle */}
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    newTransaction.type === 'income' && styles.incomeTypeButton
                  ]}
                  onPress={() => handleTypeChange('income')}
                >
                  <Ionicons 
                    name="arrow-down-circle" 
                    size={20} 
                    color={newTransaction.type === 'income' ? theme.colors.white : theme.colors.textLight} 
                  />
                  <Text style={[
                    styles.typeButtonText,
                    newTransaction.type === 'income' && styles.activeTypeButtonText
                  ]}>
                    Income
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    newTransaction.type === 'expense' && styles.expenseTypeButton
                  ]}
                  onPress={() => handleTypeChange('expense')}
                >
                  <Ionicons 
                    name="arrow-up-circle" 
                    size={20} 
                    color={newTransaction.type === 'expense' ? theme.colors.white : theme.colors.textLight} 
                  />
                  <Text style={[
                    styles.typeButtonText,
                    newTransaction.type === 'expense' && styles.activeTypeButtonText
                  ]}>
                    Expense
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amount */}
              <Text style={styles.inputLabel}>Amount *</Text>
              <View style={[
                styles.currencyInputContainer,
                formErrors.amount ? styles.inputError : null
              ]}>
                <Text style={styles.currencySymbol}>₱</Text>
                <TextInput
                  style={styles.currencyInput}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={newTransaction.amount}
                  onChangeText={(text) => {
                    setNewTransaction(prev => ({ ...prev, amount: text }));
                    if (text.trim() && parseFloat(text) > 0) {
                      setFormErrors(prev => ({ ...prev, amount: '' }));
                    }
                  }}
                />
              </View>
              {formErrors.amount ? (
                <Text style={styles.errorText}>{formErrors.amount}</Text>
              ) : null}

              {/* Category Selection */}
              <Text style={styles.inputLabel}>Category *</Text>
              <View style={[
                styles.pickerContainer,
                formErrors.category ? styles.inputError : null
              ]}>
                <Picker
                  selectedValue={newTransaction.category}
                  onValueChange={handleCategorySelect}
                  style={styles.picker}
                >
                  <Picker.Item label="Select a category" value="" color={theme.colors.textLight} />
                  {getCategories().map(category => {
                    // For expenses, show if a budget exists
                    const hasBudget = newTransaction.type === 'expense' && activeBudgetsByCategory[category];
                    
                    return (
                      <Picker.Item 
                        key={category} 
                        label={hasBudget ? `${category} (Budget: ${activeBudgetsByCategory[category].amount})` : category} 
                        value={category} 
                      />
                    );
                  })}
                </Picker>
              </View>
              {formErrors.category ? (
                <Text style={styles.errorText}>{formErrors.category}</Text>
              ) : null}

              {/* Budget Status - only show for expense transactions with linked budget */}
              {newTransaction.type === 'expense' && 
               newTransaction.category && 
               activeBudgetsByCategory[newTransaction.category] && (
                <View style={styles.budgetStatusContainer}>
                  <Text style={styles.budgetStatusLabel}>Budget Status:</Text>
                  <View style={styles.budgetStatusDetails}>
                    <Text style={styles.budgetStatusText}>
                      Allocated: ${activeBudgetsByCategory[newTransaction.category].amount.toFixed(2)}
                    </Text>
                    <Text style={styles.budgetStatusText}>
                      Spent: ${(activeBudgetsByCategory[newTransaction.category].currentSpending || 0).toFixed(2)}
                    </Text>
                    <Text style={styles.budgetStatusText}>
                      Remaining: ${((activeBudgetsByCategory[newTransaction.category].amount) - 
                                    (activeBudgetsByCategory[newTransaction.category].currentSpending || 0)).toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Date Picker */}
              <Text style={styles.inputLabel}>Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {newTransaction.date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.text} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={newTransaction.date}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
              
              {/* Title/Description */}
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Grocery Shopping"
                value={newTransaction.title}
                onChangeText={(text) => setNewTransaction(prev => ({ ...prev, title: text }))}
              />

              {/* Payment Method */}
              <Text style={styles.inputLabel}>Payment Method (Optional)</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newTransaction.paymentMethod}
                  onValueChange={(value) => setNewTransaction(prev => ({ ...prev, paymentMethod: value }))}
                  style={styles.picker}
                >
                  <Picker.Item label="Select payment method" value="" color={theme.colors.textLight} />
                  {PAYMENT_METHODS.map(method => (
                    <Picker.Item key={method} label={method} value={method} />
                  ))}
                </Picker>
              </View>

              {/* Note */}
              <Text style={styles.inputLabel}>Note (Optional)</Text>
              <TextInput
                style={[styles.input, styles.noteInput]}
                placeholder="Add additional details..."
                multiline
                value={newTransaction.note}
                onChangeText={(text) => setNewTransaction(prev => ({ ...prev, note: text }))}
              />

              {/* Add Button */}
              <TouchableOpacity 
                style={[
                  styles.addButton,
                  newTransaction.type === 'income' ? styles.incomeButton : styles.expenseButton
                ]}
                onPress={handleAddTransaction}
              >
                <Ionicons name="checkmark" size={20} color={theme.colors.white} style={styles.buttonIcon} />
                <Text style={styles.addButtonText}>
                  Add {newTransaction.type === 'income' ? 'Income' : 'Expense'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
        <Text style={styles.screenTitle}>Transactions</Text>
      </View>
      
      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={theme.colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {['Today', 'This Week', 'This Month', 'Custom'].map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.filterChip,
                selectedDateRange === range && styles.activeFilterChip
              ]}
              onPress={() => setSelectedDateRange(range)}
            >
              <Text style={[
                styles.filterChipText,
                selectedDateRange === range && styles.activeFilterChipText
              ]}>
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Transaction List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        renderTransactionList()
      )}
      
      {/* Success Feedback */}
      {showSuccessFeedback && (
        <Animated.View style={[styles.successFeedback, { opacity: successOpacity }]}>
          <Ionicons 
            name="checkmark-circle" 
            size={20} 
            color={theme.colors.white} 
            style={styles.successIcon} 
          />
          <Text style={styles.successText}>Transaction added successfully!</Text>
        </Animated.View>
      )}
      
      {/* Floating Action Button - Only show when we have transactions */}
      {transactions.length > 0 && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => {
            setNewTransaction(prev => ({ ...prev, type: lastTransactionType }));
            setShowAddModal(true);
          }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}
      
      {/* Add Transaction Modal */}
      {renderAddModal()}
      
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
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
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
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: theme.colors.text,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.lightGray,
  },
  activeFilterChip: {
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  activeFilterChipText: {
    color: theme.colors.white,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  sectionHeader: {
    paddingVertical: 12,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginRight: 8,
  },
  transactionCategory: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  expenseAmount: {
    color: theme.colors.error,
  },
  incomeAmount: {
    color: theme.colors.success,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 20,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  emptyStateButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 80,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    maxHeight: '90%',
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
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 12,
    gap: 8,
  },
  incomeTypeButton: {
    backgroundColor: theme.colors.success,
  },
  expenseTypeButton: {
    backgroundColor: theme.colors.error,
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textLight,
  },
  activeTypeButtonText: {
    color: theme.colors.white,
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
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  inputError: {
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 4,
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.lightGray,
    borderRadius: 12,
    marginBottom: 16,
  },
  currencySymbol: {
    paddingLeft: 14,
    fontSize: 18,
    color: theme.colors.text,
    fontWeight: '500',
  },
  currencyInput: {
    flex: 1,
    padding: 14,
    fontSize: 18,
    fontWeight: '500',
  },
  pickerContainer: {
    backgroundColor: theme.colors.lightGray,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  dateButton: {
    backgroundColor: theme.colors.lightGray,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  noteInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 8,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.lightGray,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleHandle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.white,
  },
  toggleHandleActive: {
    transform: [{ translateX: 20 }],
  },
  addButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  incomeButton: {
    backgroundColor: theme.colors.success,
  },
  expenseButton: {
    backgroundColor: theme.colors.error,
  },
  buttonIcon: {
    marginRight: 8,
  },
  addButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  budgetStatusContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
  },
  budgetStatusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  budgetStatusDetails: {
    paddingLeft: 8,
  },
  budgetStatusText: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 4,
  },
  successFeedback: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: theme.colors.success,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  successIcon: {
    marginRight: 8,
  },
  successText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default TransactionsScreen;
