import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { CurrencyProvider } from './src/contexts/CurrencyContext';
import { configureAmplify } from './src/config/aws-config';

export default function App() {
  useEffect(() => {
    configureAmplify();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CurrencyProvider>
        <AppNavigator />
        </CurrencyProvider>
      </AuthProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
