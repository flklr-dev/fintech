import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, isAfter } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '../hooks/useNavigation';
import { observer } from 'mobx-react';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import { ScreenName } from '../components/BottomNavBar';
import MessageDialog from '../components/MessageDialog';
import { 
  SavingsGoal, 
  savingsGoalService,
  CreateSavingsGoalDTO
} from '../services/savingsGoalService';

const { width } = Dimensions.get('window');

interface DialogState {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
  autoDismiss?: boolean;
}

interface GoalFormData {
  name: string;
  targetAmount: string;
  targetDate: Date;
  priority: 'low' | 'medium' | 'high';
  notes: string;
}

const GOAL_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
] as const;

// Format currency helper
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const GoalsScreen = observer(() => {
  const navigation = useNavigation();
  const [activeScreen, setActiveScreen] = useState<ScreenName>('Goals');
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modals state
  const [addGoalModalVisible, setAddGoalModalVisible] = useState(false);
  const [editGoalModalVisible, setEditGoalModalVisible] = useState(false);
  const [contributeModalVisible, setContributeModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);

  // Dialog state
  const [dialog, setDialog] = useState<DialogState>({
    visible: false,
    type: 'info',
    title: '',
    message: ''
  });
  
  // Form data
  const [goalForm, setGoalForm] = useState<GoalFormData>({
    name: '',
    targetAmount: '',
    targetDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
    priority: 'medium',
    notes: ''
  });

  const [editGoalForm, setEditGoalForm] = useState<GoalFormData>({
    name: '',
    targetAmount: '',
    targetDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
    priority: 'medium',
    notes: ''
  });
  
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionNote, setContributionNote] = useState('');
  
  // Animation values
  const progressAnimations = useRef<{ [key: string]: Animated.Value }>({}).current;
  
  // Fetch goals when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchGoals();
      return () => {
        // Clean up if needed
      };
    }, [])
  );
  
  // Initialize progress animations when goals change
  useEffect(() => {
    goals.forEach(goal => {
      if (!progressAnimations[goal._id]) {
        progressAnimations[goal._id] = new Animated.Value(0);
      }
      
      const progress = (goal.currentAmount / goal.targetAmount) * 100;
      Animated.timing(progressAnimations[goal._id], {
        toValue: Math.min(progress, 100),
        duration: 1000,
        useNativeDriver: false
      }).start();
    });
  }, [goals]);

  // Fetch all savings goals
  const fetchGoals = async () => {
    setLoading(true);
    try {
      const goalsData = await savingsGoalService.getGoals();
      setGoals(goalsData);
    } catch (error) {
      console.error('Error fetching goals:', error);
      setDialog({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to load your savings goals. Please try again.'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGoals();
  };

  // Handle navigation between screens
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
    } else if (screen === 'Reports') {
      navigation.navigate('Reports' as any);
    }
  };

  // Show dialog helper
  const showDialog = ({ 
    type, 
    title, 
    message, 
    actionText, 
    onAction,
    autoDismiss = false 
  }: {
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    actionText?: string,
    onAction?: () => void,
    autoDismiss?: boolean
  }) => {
    setDialog({
      visible: true,
      type,
      title,
      message,
      actionText,
      onAction,
      autoDismiss
    });
  };

  // Handle date picking for new goal
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setGoalForm({
        ...goalForm,
        targetDate: selectedDate
      });
    }
  };

  // Handle date picking for editing goal
  const handleEditDateChange = (event: any, selectedDate?: Date) => {
    setShowEditDatePicker(false);
    if (selectedDate) {
      setEditGoalForm({
        ...editGoalForm,
        targetDate: selectedDate
      });
    }
  };

  // Reset form data
  const resetGoalForm = () => {
    setGoalForm({
      name: '',
      targetAmount: '',
      targetDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
      priority: 'medium',
      notes: ''
    });
  };

  // Handle opening the add goal modal
  const handleAddGoalPress = () => {
    resetGoalForm();
    setAddGoalModalVisible(true);
  };

  // Handle creating a new goal
  const handleCreateGoal = async () => {
    // Validate input
    if (!goalForm.name.trim()) {
      showDialog({
        type: 'error',
        title: 'Error',
        message: 'Please enter a goal name',
      });
      return;
    }

    if (!goalForm.targetAmount || parseFloat(goalForm.targetAmount) <= 0) {
      showDialog({
        type: 'error',
        title: 'Error',
        message: 'Please enter a valid target amount greater than zero',
      });
      return;
    }

    if (!isAfter(goalForm.targetDate, new Date())) {
      showDialog({
        type: 'error',
        title: 'Error',
        message: 'Target date must be in the future',
      });
      return;
    }

    try {
      const newGoalData: CreateSavingsGoalDTO = {
        name: goalForm.name.trim(),
        targetAmount: parseFloat(goalForm.targetAmount),
        targetDate: goalForm.targetDate,
        priority: goalForm.priority,
        notes: goalForm.notes
      };

      await savingsGoalService.createGoal(newGoalData);
      
      // Close modal and refresh goals
      setAddGoalModalVisible(false);
      resetGoalForm();
      fetchGoals();
      
      showDialog({
        type: 'success',
        title: 'Success',
        message: 'Your savings goal has been created!',
        autoDismiss: true
      });
    } catch (error) {
      console.error('Error creating goal:', error);
      showDialog({
        type: 'error',
        title: 'Error',
        message: 'Failed to create savings goal. Please try again.'
      });
    }
  };

  // Handle selecting a goal for editing
  const handleEditGoalPress = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setEditGoalForm({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      targetDate: new Date(goal.targetDate),
      priority: goal.priority,
      notes: goal.notes || ''
    });
    setEditGoalModalVisible(true);
  };

  // Handle updating a goal
  const handleUpdateGoal = async () => {
    if (!selectedGoal) return;

    // Validate input (similar to create)
    if (!editGoalForm.name.trim()) {
      showDialog({
        type: 'error',
        title: 'Error',
        message: 'Please enter a goal name',
      });
      return;
    }

    if (!editGoalForm.targetAmount || parseFloat(editGoalForm.targetAmount) <= 0) {
      showDialog({
        type: 'error',
        title: 'Error',
        message: 'Please enter a valid target amount greater than zero',
      });
      return;
    }

    if (!isAfter(editGoalForm.targetDate, new Date())) {
      showDialog({
        type: 'error',
        title: 'Error',
        message: 'Target date must be in the future',
      });
      return;
    }

    try {
      await savingsGoalService.updateGoal(selectedGoal._id, {
        name: editGoalForm.name.trim(),
        targetAmount: parseFloat(editGoalForm.targetAmount),
        targetDate: editGoalForm.targetDate,
        priority: editGoalForm.priority,
        notes: editGoalForm.notes
      });
      
      // Close modal and refresh goals
      setEditGoalModalVisible(false);
      setSelectedGoal(null);
      fetchGoals();
      
      showDialog({
        type: 'success',
        title: 'Success',
        message: 'Your savings goal has been updated!',
        autoDismiss: true
      });
    } catch (error) {
      console.error('Error updating goal:', error);
      showDialog({
        type: 'error',
        title: 'Error',
        message: 'Failed to update savings goal. Please try again.'
      });
    }
  };

  // Handle deleting a goal
  const handleDeleteGoalPress = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setShowDeleteConfirmation(true);
  };

  const handleDeleteGoal = async () => {
    if (!selectedGoal) return;

    try {
      await savingsGoalService.deleteGoal(selectedGoal._id);
      
      // Close modal and refresh goals
      setShowDeleteConfirmation(false);
      setSelectedGoal(null);
      fetchGoals();
      
      showDialog({
        type: 'success',
        title: 'Success',
        message: 'Your savings goal has been deleted!',
        autoDismiss: true
      });
    } catch (error) {
      console.error('Error deleting goal:', error);
      showDialog({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete savings goal. Please try again.'
      });
    }
  };

  // Handle contribution to a goal
  const handleContributePress = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setContributionAmount('');
    setContributionNote('');
    setContributeModalVisible(true);
  };

  const handleContribute = async () => {
    if (!selectedGoal) return;

    if (!contributionAmount || parseFloat(contributionAmount) <= 0) {
      showDialog({
        type: 'error',
        title: 'Error',
        message: 'Please enter a valid contribution amount greater than zero',
      });
      return;
    }

    try {
      await savingsGoalService.addContribution(selectedGoal._id, {
        amount: parseFloat(contributionAmount),
        note: contributionNote
      });
      
      // Close modal and refresh goals
      setContributeModalVisible(false);
      setSelectedGoal(null);
      fetchGoals();
      
      showDialog({
        type: 'success',
        title: 'Success',
        message: 'Your contribution has been added!',
        autoDismiss: true
      });
    } catch (error) {
      console.error('Error adding contribution:', error);
      showDialog({
        type: 'error',
        title: 'Error',
        message: 'Failed to add contribution. Please try again.'
      });
    }
  };

  // Get status badge for a goal
  const getGoalStatus = (goal: SavingsGoal) => {
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
    
    if (goal.status === 'achieved') {
      return { label: 'Completed', color: theme.colors.success };
    } else if (goal.status === 'behind_schedule') {
      return { label: 'Behind', color: theme.colors.error };
    } else {
      if (progress >= 90) {
        return { label: 'Almost There', color: theme.colors.success };
      } else if (progress >= 50) {
        return { label: 'On Track', color: theme.colors.primary };
      } else {
        return { label: 'In Progress', color: theme.colors.warning };
      }
    }
  };

  // Render a single goal item
  const renderGoalItem = ({ item: goal }: { item: SavingsGoal }) => {
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
    const progressWidth = progressAnimations[goal._id]?.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%']
    }) || '0%';
    
    const status = getGoalStatus(goal);
    
    return (
      <View style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalName}>{goal.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <Text style={styles.statusText}>{status.label}</Text>
          </View>
        </View>
        
        <View style={styles.goalDetails}>
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Current / Target</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
            </Text>
          </View>
          
          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>Target Date</Text>
            <Text style={styles.dateValue}>{format(new Date(goal.targetDate), 'MMM d, yyyy')}</Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View 
              style={[
                styles.progressFill,
                { 
                  width: progressWidth,
                  backgroundColor: progress >= 100 
                    ? theme.colors.success 
                    : progress >= 75 
                      ? theme.colors.primary 
                      : theme.colors.warning
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{Math.min(progress, 100).toFixed(1)}%</Text>
        </View>
        
        <View style={styles.goalActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.contributeButton]}
            onPress={() => handleContributePress(goal)}
          >
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Contribute</Text>
          </TouchableOpacity>
          
          <View style={styles.smallButtonsContainer}>
            <TouchableOpacity 
              style={[styles.smallButton, styles.editButton]}
              onPress={() => handleEditGoalPress(goal)}
            >
              <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.smallButton, styles.deleteButton]}
              onPress={() => handleDeleteGoalPress(goal)}
            >
              <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Render empty state if no goals
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="trophy-outline" size={80} color={theme.colors.gray} />
      <Text style={styles.emptyTitle}>No savings goals yet</Text>
      <Text style={styles.emptyText}>
        Let's create your first savings goal to start tracking your progress
      </Text>
      <TouchableOpacity 
        style={styles.addGoalButton}
        onPress={handleAddGoalPress}
      >
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.addGoalButtonText}>Create First Goal</Text>
      </TouchableOpacity>
    </View>
  );

  // Main component render
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        showBackButton={false}
        showNotifications={true}
      />
      
      <View style={styles.headerContainer}>
        <Text style={styles.screenTitle}>Savings Goals</Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your goals...</Text>
        </View>
      ) : (
        <FlatList
          data={goals}
          keyExtractor={(item) => item._id}
          renderItem={renderGoalItem}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      )}

      {/* Add FAB if there are goals */}
      {goals.length > 0 && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={handleAddGoalPress}
        >
          <Ionicons name="add" size={30} color={theme.colors.white} />
        </TouchableOpacity>
      )}
      
      {/* Add Goal Modal */}
      <Modal
        visible={addGoalModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddGoalModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setAddGoalModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <ScrollView style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Create New Goal</Text>
                    <TouchableOpacity onPress={() => setAddGoalModalVisible(false)}>
                      <Ionicons name="close" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Goal Name</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g., Emergency Fund"
                      value={goalForm.name}
                      onChangeText={(text) => setGoalForm({ ...goalForm, name: text })}
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Target Amount</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="10000"
                      keyboardType="numeric"
                      value={goalForm.targetAmount}
                      onChangeText={(text) => setGoalForm({ ...goalForm, targetAmount: text.replace(/[^0-9.]/g, '') })}
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Target Date</Text>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={styles.dateText}>
                        {format(goalForm.targetDate, 'MMMM d, yyyy')}
                      </Text>
                      <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                    
                    {showDatePicker && (
                      <DateTimePicker
                        value={goalForm.targetDate}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                        minimumDate={new Date()}
                      />
                    )}
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Priority</Text>
                    <View style={styles.priorityButtonsContainer}>
                      {GOAL_PRIORITIES.map((priority) => (
                        <TouchableOpacity
                          key={priority.value}
                          style={[
                            styles.priorityButton,
                            goalForm.priority === priority.value && styles.priorityButtonActive
                          ]}
                          onPress={() => setGoalForm({ ...goalForm, priority: priority.value })}
                        >
                          <Text 
                            style={[
                              styles.priorityButtonText,
                              goalForm.priority === priority.value && styles.priorityButtonTextActive
                            ]}
                          >
                            {priority.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Notes (Optional)</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      placeholder="Add any additional details about your goal"
                      multiline
                      numberOfLines={4}
                      value={goalForm.notes}
                      onChangeText={(text) => setGoalForm({ ...goalForm, notes: text })}
                    />
                  </View>
                  
                  <TouchableOpacity
                    style={styles.createButton}
                    onPress={handleCreateGoal}
                  >
                    <Text style={styles.createButtonText}>Create Goal</Text>
                  </TouchableOpacity>
                </ScrollView>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Edit Goal Modal */}
      <Modal
        visible={editGoalModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditGoalModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setEditGoalModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <ScrollView style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Edit Goal</Text>
                    <TouchableOpacity onPress={() => setEditGoalModalVisible(false)}>
                      <Ionicons name="close" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Goal Name</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g., Emergency Fund"
                      value={editGoalForm.name}
                      onChangeText={(text) => setEditGoalForm({ ...editGoalForm, name: text })}
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Target Amount</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="10000"
                      keyboardType="numeric"
                      value={editGoalForm.targetAmount}
                      onChangeText={(text) => setEditGoalForm({ ...editGoalForm, targetAmount: text.replace(/[^0-9.]/g, '') })}
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Target Date</Text>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => setShowEditDatePicker(true)}
                    >
                      <Text style={styles.dateText}>
                        {format(editGoalForm.targetDate, 'MMMM d, yyyy')}
                      </Text>
                      <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                    
                    {showEditDatePicker && (
                      <DateTimePicker
                        value={editGoalForm.targetDate}
                        mode="date"
                        display="default"
                        onChange={handleEditDateChange}
                        minimumDate={new Date()}
                      />
                    )}
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Priority</Text>
                    <View style={styles.priorityButtonsContainer}>
                      {GOAL_PRIORITIES.map((priority) => (
                        <TouchableOpacity
                          key={priority.value}
                          style={[
                            styles.priorityButton,
                            editGoalForm.priority === priority.value && styles.priorityButtonActive
                          ]}
                          onPress={() => setEditGoalForm({ ...editGoalForm, priority: priority.value })}
                        >
                          <Text 
                            style={[
                              styles.priorityButtonText,
                              editGoalForm.priority === priority.value && styles.priorityButtonTextActive
                            ]}
                          >
                            {priority.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Notes (Optional)</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      placeholder="Add any additional details about your goal"
                      multiline
                      numberOfLines={4}
                      value={editGoalForm.notes}
                      onChangeText={(text) => setEditGoalForm({ ...editGoalForm, notes: text })}
                    />
                  </View>
                  
                  <TouchableOpacity
                    style={styles.createButton}
                    onPress={handleUpdateGoal}
                  >
                    <Text style={styles.createButtonText}>Update Goal</Text>
                  </TouchableOpacity>
                </ScrollView>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Contribute Modal */}
      <Modal
        visible={contributeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setContributeModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setContributeModalVisible(false)}
        >
          <View style={[styles.modalContainer, styles.contributeModalContainer]}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Contribution</Text>
                  <TouchableOpacity onPress={() => setContributeModalVisible(false)}>
                    <Ionicons name="close" size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
                
                {selectedGoal && (
                  <View style={styles.selectedGoalInfo}>
                    <Text style={styles.selectedGoalName}>{selectedGoal.name}</Text>
                    <View style={styles.goalProgress}>
                      <Text style={styles.goalProgressText}>
                        {formatCurrency(selectedGoal.currentAmount)} / {formatCurrency(selectedGoal.targetAmount)}
                      </Text>
                    </View>
                  </View>
                )}
                
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Contribution Amount</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="1000"
                    keyboardType="numeric"
                    value={contributionAmount}
                    onChangeText={(text) => setContributionAmount(text.replace(/[^0-9.]/g, ''))}
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Note (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Monthly savings contribution"
                    value={contributionNote}
                    onChangeText={setContributionNote}
                  />
                </View>
                
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={handleContribute}
                >
                  <Text style={styles.createButtonText}>Add Contribution</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Delete Confirmation Dialog */}
      <Modal
        visible={showDeleteConfirmation}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirmation(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDeleteConfirmation(false)}
        >
          <View style={[styles.modalContainer, styles.deleteModalContainer]}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <Ionicons name="warning-outline" size={48} color={theme.colors.warning} style={styles.warningIcon} />
                
                <Text style={styles.deleteTitle}>Delete Goal?</Text>
                <Text style={styles.deleteMessage}>
                  Are you sure you want to delete this savings goal? This action cannot be undone.
                </Text>
                
                <View style={styles.deleteButtons}>
                  <TouchableOpacity
                    style={[styles.deleteButton, styles.cancelButton]}
                    onPress={() => setShowDeleteConfirmation(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.deleteButton, styles.confirmButton]}
                    onPress={handleDeleteGoal}
                  >
                    <Text style={styles.confirmButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Message Dialog */}
      <MessageDialog
        visible={dialog.visible}
        type={dialog.type}
        title={dialog.title}
        message={dialog.message}
        onDismiss={() => setDialog({ ...dialog, visible: false })}
        onAction={dialog.onAction}
        actionText={dialog.actionText}
        autoDismiss={dialog.autoDismiss}
      />
      
      <BottomNavBar activeScreen={activeScreen} onPress={handleNavigation} />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textLight
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24
  },
  // Goal Card
  goalCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8
      },
      android: {
        elevation: 3
      }
    })
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  goalName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 8
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.white
  },
  goalDetails: {
    flexDirection: 'row',
    marginBottom: 16
  },
  amountContainer: {
    flex: 1,
    marginRight: 8
  },
  dateContainer: {
    flex: 1,
    marginLeft: 8
  },
  amountLabel: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: 4
  },
  dateLabel: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: 4
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text
  },
  dateValue: {
    fontSize: 16,
    color: theme.colors.text
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8
  },
  progressFill: {
    height: '100%',
    borderRadius: 4
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    minWidth: 45,
    textAlign: 'right'
  },
  goalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  contributeButton: {
    backgroundColor: theme.colors.primary
  },
  actionButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4
  },
  smallButtonsContainer: {
    flexDirection: 'row'
  },
  smallButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: theme.colors.lightGray
  },
  editButton: {
    backgroundColor: 'rgba(108, 99, 255, 0.1)'
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)'
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22
  },
  addGoalButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12
  },
  addGoalButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  modalContainer: {
    width: '100%',
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '85%',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10
      },
      android: {
        elevation: 10
      }
    })
  },
  contributeModalContainer: {
    maxHeight: 'auto'
  },
  deleteModalContainer: {
    maxHeight: 'auto',
    width: width * 0.85,
    borderRadius: 16
  },
  modalContent: {
    padding: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text
  },
  // Form Styles
  formGroup: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8
  },
  textInput: {
    backgroundColor: theme.colors.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  dateInput: {
    backgroundColor: theme.colors.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  dateText: {
    fontSize: 16,
    color: theme.colors.text
  },
  priorityButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.lightGray,
    marginHorizontal: 4
  },
  priorityButtonActive: {
    backgroundColor: theme.colors.primary
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textLight
  },
  priorityButtonTextActive: {
    color: theme.colors.white,
    fontWeight: '600'
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16
  },
  createButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 16
  },
  // Selected Goal Info
  selectedGoalInfo: {
    backgroundColor: theme.colors.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20
  },
  selectedGoalName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4
  },
  goalProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  goalProgressText: {
    fontSize: 14,
    color: theme.colors.textLight
  },
  // Delete Dialog
  warningIcon: {
    alignSelf: 'center',
    marginBottom: 16
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8
  },
  deleteMessage: {
    fontSize: 16,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22
  },
  deleteButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  cancelButton: {
    flex: 1,
    marginRight: 6,
    backgroundColor: theme.colors.lightGray,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  confirmButton: {
    flex: 1,
    marginLeft: 6,
    backgroundColor: theme.colors.error,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 16
  },
  confirmButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 16
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
  }
});

export default GoalsScreen; 