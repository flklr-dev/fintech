import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { observer } from 'mobx-react';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import BudgetScreen from '../screens/BudgetScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import { authViewModel } from '../viewmodels/authViewModel';

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
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = observer(() => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={authViewModel.isLoggedIn ? 'Home' : 'Login'}
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
      </Stack.Navigator>
    </NavigationContainer>
  );
});

export default AppNavigator; 