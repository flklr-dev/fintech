import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { observer } from 'mobx-react';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import BudgetScreen from '../screens/BudgetScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import AccountScreen from '../screens/AccountScreen';
import ContactSupportScreen from '../screens/ContactSupportScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';

// Define navigation types
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Budget: {
    showAddModal?: boolean;
    preselectedCategory?: string;
  };
  Transactions: {
    showAddModal?: boolean;
  };
  Reports: undefined;
  Account: undefined;
  ContactSupport: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = observer(() => {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
  return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

  return (
      <NavigationContainer>
        <Stack.Navigator
        initialRouteName={isLoggedIn ? 'Home' : 'Login'}
          screenOptions={{
            headerShown: false,
            animation: 'none',
            animationDuration: 0,
            gestureEnabled: false,
            presentation: 'card',
            contentStyle: {
              backgroundColor: '#fff',
            },
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Budget" component={BudgetScreen} />
          <Stack.Screen name="Transactions" component={TransactionsScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="Account" component={AccountScreen} />
        <Stack.Screen name="ContactSupport" component={ContactSupportScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
        </Stack.Navigator>
      </NavigationContainer>
  );
});

export default AppNavigator; 