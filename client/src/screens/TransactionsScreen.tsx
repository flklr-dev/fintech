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
  SectionList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react';
import { useNavigation } from '../hooks/useNavigation';
import { theme } from '../theme';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import { ScreenName } from '../components/BottomNavBar';

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
}

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
  const [newTransaction, setNewTransaction] = useState({
    title: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    category: '',
    note: '',
    date: new Date(),
  });
  
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

  const onRefresh = async () => {
    setRefreshing(true);
    // Fetch latest transactions here
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

  // Handle adding new transaction
  const handleAddTransaction = () => {
    if (!newTransaction.title.trim() || !newTransaction.amount.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const amount = parseFloat(newTransaction.amount);
    if (isNaN(amount)) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const transaction: Transaction = {
      id: Date.now().toString(),
      title: newTransaction.title,
      amount: amount,
      type: newTransaction.type,
      category: newTransaction.category || 'Uncategorized',
      icon: 'wallet-outline',
      color: theme.colors.primary,
      date: newTransaction.date,
      note: newTransaction.note,
    };

    setTransactions([transaction, ...transactions]);
    setShowAddModal(false);
    setNewTransaction({
      title: '',
      amount: '',
      type: 'expense',
      category: '',
      note: '',
      date: new Date(),
    });
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
      <Ionicons name="receipt-outline" size={60} color={theme.colors.gray} />
      <Text style={styles.emptyStateTitle}>No transactions yet</Text>
      <Text style={styles.emptyStateText}>
        Start by logging your expenses!
      </Text>
      <TouchableOpacity 
        style={styles.emptyStateButton}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.emptyStateButtonText}>Add Transaction</Text>
      </TouchableOpacity>
    </View>
  );

  // Render add transaction modal
  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddModal(false)}
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
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newTransaction.type === 'income' && styles.selectedType
                ]}
                onPress={() => setNewTransaction(prev => ({ ...prev, type: 'income' }))}
              >
                <Text style={[
                  styles.typeButtonText,
                  newTransaction.type === 'income' && styles.selectedTypeText
                ]}>
                  Income
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newTransaction.type === 'expense' && styles.selectedType
                ]}
                onPress={() => setNewTransaction(prev => ({ ...prev, type: 'expense' }))}
              >
                <Text style={[
                  styles.typeButtonText,
                  newTransaction.type === 'expense' && styles.selectedTypeText
                ]}>
                  Expense
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Grocery Shopping"
              value={newTransaction.title}
              onChangeText={(text) => setNewTransaction(prev => ({ ...prev, title: text }))}
            />

            <Text style={styles.inputLabel}>Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="numeric"
              value={newTransaction.amount}
              onChangeText={(text) => setNewTransaction(prev => ({ ...prev, amount: text }))}
            />

            <Text style={styles.inputLabel}>Category</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Food & Dining"
              value={newTransaction.category}
              onChangeText={(text) => setNewTransaction(prev => ({ ...prev, category: text }))}
            />

            <Text style={styles.inputLabel}>Note (Optional)</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder="Add a note..."
              multiline
              value={newTransaction.note}
              onChangeText={(text) => setNewTransaction(prev => ({ ...prev, note: text }))}
            />

            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddTransaction}
            >
              <Text style={styles.addButtonText}>Add Transaction</Text>
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
      {renderTransactionList()}
      
      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
      
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
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
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.lightGray,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  selectedType: {
    backgroundColor: theme.colors.primary,
  },
  typeButtonText: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  selectedTypeText: {
    color: theme.colors.white,
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  noteInput: {
    height: 100,
    textAlignVertical: 'top',
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
});

export default TransactionsScreen;
