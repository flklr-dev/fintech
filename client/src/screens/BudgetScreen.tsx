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
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react';
import { useNavigation } from '../hooks/useNavigation';
import { theme } from '../theme';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import { ScreenName } from '../components/BottomNavBar';
import { budgetService, Budget, CreateBudgetDTO } from '../services/budgetService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

// Currency formatter
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Valid budget categories matching the server's enum
const BUDGET_CATEGORIES = [
  'Food & Dining',
  'Transport',
  'Utilities',
  'Entertainment',
  'Shopping',
  'Healthcare',
  'Education',
  'Other'
] as const;

type BudgetCategory = typeof BUDGET_CATEGORIES[number];

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// Map of category-specific icons
const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Food & Dining': 'restaurant-outline',
  'Transport': 'car-outline',
  'Utilities': 'flash-outline',
  'Entertainment': 'film-outline',
  'Shopping': 'cart-outline',
  'Healthcare': 'medical-outline',
  'Education': 'school-outline',
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
  'Other': '#607D8B'          // Blue Grey
};

const BudgetScreen = observer(() => {
  const navigation = useNavigation();
  const [activeScreen, setActiveScreen] = useState<ScreenName>('Budget');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');
  
  // We're not showing the period in the UI anymore, but the backend still requires it
  // Setting a default value of 'monthly' for API compatibility
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  
  // State for adding new budget
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState('');
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  
  // New state variables for the form
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(new Date().setMonth(new Date().getMonth() + 1)));
  const [isRecurring, setIsRecurring] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Demo budget categories
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  
  // Add the missing state variables for date pickers
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Set minimum allowed dates
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to beginning of day
  
  // Get minimum date for end date picker (must be after start date and not before today)
  const getMinEndDate = () => {
    // Return the later of start date or today
    const minDate = new Date(Math.max(startDate.getTime(), today.getTime()));
    // Add one day to ensure no overlap
    minDate.setDate(minDate.getDate() + 1);
    return minDate;
  };

  // Handle date selection
  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      // If selected start date is after current end date, update end date too
      setStartDate(selectedDate);
      
      // Calculate min valid end date: start date + 1 day
      const minValidEndDate = new Date(selectedDate);
      minValidEndDate.setDate(minValidEndDate.getDate() + 1);
      
      if (endDate <= minValidEndDate) {
        // Set end date to 1 month after start date
        const newEndDate = new Date(selectedDate);
        newEndDate.setMonth(newEndDate.getMonth() + 1);
        setEndDate(newEndDate);
      }
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      // Additional validation just to be sure
      if (selectedDate <= startDate) {
        Alert.alert('Error', 'End date must be after start date');
        return;
      }
      setEndDate(selectedDate);
    }
  };

  // Fetch budgets
  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const fetchedBudgets = await budgetService.getBudgets(selectedPeriod.toLowerCase());
      setBudgets(fetchedBudgets || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch budgets');
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [selectedPeriod]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBudgets();
    setRefreshing(false);
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
  const totalAllocated = budgets?.reduce((sum, budget) => sum + budget.amount, 0) || 0;
  const totalSpent = budgets?.reduce((sum, budget) => sum + (budget.currentSpending || 0), 0) || 0;
  const totalRemaining = totalAllocated - totalSpent;
  
  // Handle adding a new budget
  const handleAddBudget = async () => {
    if (!newBudgetName) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    
    if (!newBudgetAmount.trim() || isNaN(Number(newBudgetAmount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (startDate >= endDate) {
      Alert.alert('Error', 'Start date must be before end date');
      return;
    }
    
    // Check if budget for this category already exists
    const categoryExists = budgets?.some(budget => 
      budget.category.toLowerCase() === newBudgetName.toLowerCase() &&
      new Date(budget.endDate) > new Date() // Only check active budgets
    );
    
    if (categoryExists) {
      Alert.alert(
        'Category Already Exists',
        `You already have an active budget for "${newBudgetName}". Would you like to update it instead?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Update Existing',
            onPress: () => {
              // Close this modal and navigate to existing budget
              setShowAddModal(false);
              // Here you could add navigation to edit the existing budget
              // or implement an edit flow
            }
          }
        ]
      );
      return;
    }
    
    try {
      // Create budget data - note that period is still required by the API
      // even though we're no longer showing it in the UI
      const budgetData: CreateBudgetDTO = {
        category: newBudgetName,
        amount: Number(newBudgetAmount),
        period: selectedPeriod.toLowerCase() as 'weekly' | 'monthly' | 'yearly',
        startDate,
        endDate,
        notifications: {
          enabled: true,
          threshold: 80
        }
      };
      
      await budgetService.createBudget(budgetData);
      await fetchBudgets();
      
      setNewBudgetName('');
      setNewBudgetAmount('');
      setShowAddModal(false);
      Alert.alert('Success', 'Budget created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create budget');
    }
  };
  
  // Get filtered categories
  const getFilteredBudgets = () => {
    if (!budgets) return [];
    
    let filtered = [...budgets];
    
    if (selectedFilter === 'Exceeded') {
      filtered = filtered.filter(budget => (budget.currentSpending || 0) > budget.amount);
    } else if (selectedFilter === 'Active') {
      filtered = filtered.filter(budget => (budget.currentSpending || 0) <= budget.amount);
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

  const [showEditModal, setShowEditModal] = useState(false);
  const [editBudgetId, setEditBudgetId] = useState('');
  const [editBudgetCategory, setEditBudgetCategory] = useState('');
  const [editBudgetAmount, setEditBudgetAmount] = useState('');
  const [editStartDate, setEditStartDate] = useState(new Date());
  const [editEndDate, setEditEndDate] = useState(new Date());
  const [showEditStartDatePicker, setShowEditStartDatePicker] = useState(false);
  const [showEditEndDatePicker, setShowEditEndDatePicker] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Handle opening the options menu for a budget
  const handleOpenOptions = (budget: Budget, event: any) => {
    // Measure the position of the touchable that was pressed
    event.target.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
      // Position the menu to the left of the button, slightly below it
      setMenuPosition({ 
        x: pageX - 150, // Position left of the button with width of 150
        y: pageY + height 
      });
      setSelectedBudget(budget);
      setShowOptionsModal(true);
    });
  };

  // Handle editing a budget
  const handleEditBudget = () => {
    if (!selectedBudget) return;
    
    setEditBudgetId(selectedBudget._id);
    setEditBudgetCategory(selectedBudget.category);
    setEditBudgetAmount(selectedBudget.amount.toString());
    setEditStartDate(new Date(selectedBudget.startDate));
    setEditEndDate(new Date(selectedBudget.endDate));
    
    setShowOptionsModal(false);
    setShowEditModal(true);
  };

  // Handle deleting a budget
  const handleDeleteBudget = async () => {
    if (!selectedBudget) return;
    
    Alert.alert(
      "Delete Budget",
      `Are you sure you want to delete the budget for "${selectedBudget.category}"?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await budgetService.deleteBudget(selectedBudget._id);
              setShowOptionsModal(false);
              await fetchBudgets();
              Alert.alert("Success", "Budget deleted successfully");
            } catch (error) {
              Alert.alert("Error", "Failed to delete budget");
            }
          }
        }
      ]
    );
  };

  // Save edited budget
  const handleSaveEditedBudget = async () => {
    if (!editBudgetId) return;
    
    if (!editBudgetAmount.trim() || isNaN(Number(editBudgetAmount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (editStartDate >= editEndDate) {
      Alert.alert('Error', 'Start date must be before end date');
      return;
    }
    
    try {
      const updates = {
        amount: Number(editBudgetAmount),
        startDate: editStartDate,
        endDate: editEndDate
      };
      
      await budgetService.updateBudget(editBudgetId, updates);
      await fetchBudgets();
      
      setShowEditModal(false);
      Alert.alert('Success', 'Budget updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update budget');
    }
  };

  // Handle edit date selection
  const handleEditStartDateChange = (event: any, selectedDate?: Date) => {
    setShowEditStartDatePicker(false);
    if (selectedDate) {
      setEditStartDate(selectedDate);
      
      const minValidEndDate = new Date(selectedDate);
      minValidEndDate.setDate(minValidEndDate.getDate() + 1);
      
      if (editEndDate <= minValidEndDate) {
        const newEndDate = new Date(selectedDate);
        newEndDate.setMonth(newEndDate.getMonth() + 1);
        setEditEndDate(newEndDate);
      }
    }
  };

  const handleEditEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEditEndDatePicker(false);
    if (selectedDate) {
      if (selectedDate <= editStartDate) {
        Alert.alert('Error', 'End date must be after start date');
        return;
      }
      setEditEndDate(selectedDate);
    }
  };

  // Get minimum date for edit end date picker
  const getMinEditEndDate = () => {
    const minDate = new Date(Math.max(editStartDate.getTime(), today.getTime()));
    minDate.setDate(minDate.getDate() + 1);
    return minDate;
  };

  // Render the budget item
  const renderBudgetItem = ({ item: budget }: { item: Budget }) => {
    const spent = budget.currentSpending || 0;
    const percentage = Math.min((spent / budget.amount) * 100, 100);
    const isOverBudget = spent > budget.amount;
    const progressColor = isOverBudget ? theme.colors.error : 
                         percentage > 75 ? theme.colors.warning : 
                         theme.colors.success;
    const remaining = budget.amount - spent;
    
    // Get the category-specific icon and color
    const categoryIcon = CATEGORY_ICONS[budget.category] || 'wallet-outline';
    const categoryColor = CATEGORY_COLORS[budget.category] || theme.colors.primary;
    
    return (
      <View style={[styles.budgetItem, styles.cardShadow]}>
        <View style={styles.budgetHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: categoryColor }]}>
            <Ionicons name={categoryIcon} size={20} color="#fff" />
          </View>
          <View style={styles.budgetInfo}>
            <Text style={styles.budgetName}>{budget.category}</Text>
            <Text style={styles.budgetPeriod}>{budget.period}</Text>
          </View>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={(event) => handleOpenOptions(budget, event)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.textLight} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.budgetAmounts}>
          <View>
            <Text style={styles.amountLabel}>Allocated</Text>
            <Text style={styles.amountValue}>{formatCurrency(budget.amount)}</Text>
          </View>
          <View>
            <Text style={styles.amountLabel}>Spent</Text>
            <Text style={[styles.amountValue, isOverBudget && styles.redText]}>
              {formatCurrency(spent)}
            </Text>
          </View>
          <View>
            <Text style={styles.amountLabel}>Remaining</Text>
            <Text style={[styles.amountValue, isOverBudget ? styles.redText : styles.greenText]}>
              {formatCurrency(remaining)}
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
  const renderEmptyState = () => {
    // Show different empty states based on the filter selected when there are budgets but none match the filter
    if (budgets && budgets.length > 0) {
      if (selectedFilter === 'Active') {
        return (
          <View style={styles.filterEmptyState}>
            <Ionicons name="checkmark-circle-outline" size={60} color={theme.colors.gray} />
            <Text style={styles.filterEmptyStateTitle}>No active budgets</Text>
            <Text style={styles.filterEmptyStateText}>
              All your current budgets have been exceeded.
            </Text>
            <TouchableOpacity 
              style={styles.filterEmptyStateButton}
              onPress={() => setSelectedFilter('All')}
            >
              <Text style={styles.filterEmptyStateButtonText}>View All Budgets</Text>
            </TouchableOpacity>
          </View>
        );
      }
      
      if (selectedFilter === 'Exceeded') {
        return (
          <View style={styles.filterEmptyState}>
            <Ionicons name="alert-circle-outline" size={60} color={theme.colors.gray} />
            <Text style={styles.filterEmptyStateTitle}>No exceeded budgets</Text>
            <Text style={styles.filterEmptyStateText}>
              Great job! You're staying within all your budget limits.
            </Text>
            <TouchableOpacity 
              style={styles.filterEmptyStateButton}
              onPress={() => setSelectedFilter('All')}
            >
              <Text style={styles.filterEmptyStateButtonText}>View All Budgets</Text>
            </TouchableOpacity>
          </View>
        );
      }
    }
    
    // Default empty state when there are no budgets at all
    return (
      <View style={styles.emptyState}>
        <Ionicons name="wallet-outline" size={80} color={theme.colors.gray} />
        <Text style={styles.emptyStateTitle}>No budgets yet</Text>
        <Text style={styles.emptyStateText}>
          Start tracking your expenses by creating your first budget!
        </Text>
        <Text style={styles.emptyStateSubText}>
          Set spending limits for different categories and stay on top of your finances.
        </Text>
        <TouchableOpacity 
          style={styles.emptyStateButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add-circle-outline" size={24} color={theme.colors.white} style={styles.buttonIcon} />
          <Text style={styles.emptyStateButtonText}>Create Your First Budget</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Update the modal content
  const renderAddBudgetModal = () => (
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
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={newBudgetName}
                onValueChange={(itemValue) => setNewBudgetName(itemValue)}
                style={styles.picker}
                mode="dropdown"
              >
                <Picker.Item label="Select a category" value="" color={theme.colors.textLight} />
                {BUDGET_CATEGORIES.map((category) => {
                  // Check if this category already has an active budget
                  const isUsed = budgets?.some(budget => 
                    budget.category === category && 
                    new Date(budget.endDate) > new Date()
                  );
                  
                  return (
                    <Picker.Item 
                      key={category} 
                      label={isUsed ? `${category} (already exists)` : category} 
                      value={category}
                      color={isUsed ? theme.colors.textLight : undefined}
                      enabled={!isUsed}
                    />
                  );
                })}
              </Picker>
            </View>
            
            <Text style={styles.inputLabel}>Budget Amount</Text>
            <View style={styles.currencyInputContainer}>
              <Text style={styles.currencySymbol}>₱</Text>
              <TextInput
                style={styles.currencyInput}
                placeholder="0.00"
                keyboardType="numeric"
                value={newBudgetAmount}
                onChangeText={setNewBudgetAmount}
              />
            </View>
            
            <Text style={styles.inputLabel}>Start Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {formatDate(startDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={handleStartDateChange}
                minimumDate={today}
              />
            )}

            <Text style={styles.inputLabel}>End Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {formatDate(endDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            {showEndDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                onChange={handleEndDateChange}
                minimumDate={getMinEndDate()}
              />
            )}

            <View style={styles.toggleContainer}>
              <Text style={styles.inputLabel}>Auto-renew</Text>
              <TouchableOpacity
                style={[styles.toggle, isRecurring && styles.toggleActive]}
                onPress={() => setIsRecurring(!isRecurring)}
              >
                <View style={[styles.toggleHandle, isRecurring && styles.toggleHandleActive]} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddBudget}
            >
              <Text style={styles.addButtonText}>Create Budget</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Options modal - improved UX
  const renderOptionsModal = () => (
    <Modal
      visible={showOptionsModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowOptionsModal(false)}
    >
      <TouchableOpacity 
        style={styles.optionsOverlay}
        activeOpacity={1}
        onPress={() => setShowOptionsModal(false)}
      >
        <View 
          style={[
            styles.optionsContainer, 
            { 
              position: 'absolute',
              left: menuPosition.x,
              top: menuPosition.y,
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={handleEditBudget}
          >
            <Ionicons name="create-outline" size={20} color={theme.colors.text} />
            <Text style={styles.optionText}>Edit</Text>
          </TouchableOpacity>
          
          <View style={styles.optionDivider} />
          
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={handleDeleteBudget}
          >
            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
            <Text style={[styles.optionText, { color: theme.colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Edit budget modal
  const renderEditBudgetModal = () => (
    <Modal
      visible={showEditModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowEditModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Budget: {editBudgetCategory}</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Budget Amount</Text>
            <View style={styles.currencyInputContainer}>
              <Text style={styles.currencySymbol}>₱</Text>
              <TextInput
                style={styles.currencyInput}
                placeholder="0.00"
                keyboardType="numeric"
                value={editBudgetAmount}
                onChangeText={setEditBudgetAmount}
              />
            </View>
            
            <Text style={styles.inputLabel}>Start Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEditStartDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {formatDate(editStartDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            {showEditStartDatePicker && (
              <DateTimePicker
                value={editStartDate}
                mode="date"
                display="default"
                onChange={handleEditStartDateChange}
                minimumDate={today}
              />
            )}

            <Text style={styles.inputLabel}>End Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEditEndDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {formatDate(editEndDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            {showEditEndDatePicker && (
              <DateTimePicker
                value={editEndDate}
                mode="date"
                display="default"
                onChange={handleEditEndDateChange}
                minimumDate={getMinEditEndDate()}
              />
            )}
            
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleSaveEditedBudget}
            >
              <Text style={styles.addButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
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
      {budgets && budgets.length > 0 && (
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
      )}
      
      {/* Budget listing */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={getFilteredBudgets()}
          renderItem={renderBudgetItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.listContainer,
            (!budgets || budgets.length === 0) && styles.emptyListContainer
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
      
      {/* Floating Action Button */}
      {budgets && budgets.length > 0 && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}
      
      {renderAddBudgetModal()}
      {renderOptionsModal()}
      {renderEditBudgetModal()}
      
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
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.8,
  },
  emptyStateButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyStateButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
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
  pickerContainer: {
    backgroundColor: theme.colors.lightGray,
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.lightGray,
    borderRadius: 8,
    marginBottom: 16,
  },
  currencySymbol: {
    paddingLeft: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  currencyInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
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
  dateButton: {
    backgroundColor: theme.colors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  filterEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  filterEmptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  filterEmptyStateText: {
    fontSize: 16,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  filterEmptyStateButton: {
    backgroundColor: theme.colors.lightGray,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  filterEmptyStateButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  optionsContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    width: 160,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  optionText: {
    fontSize: 15,
    marginLeft: 12,
    color: theme.colors.text,
  },
  optionDivider: {
    height: 1,
    backgroundColor: theme.colors.lightGray,
  },
});

export default BudgetScreen; 