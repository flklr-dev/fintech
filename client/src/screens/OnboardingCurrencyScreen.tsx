import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  FlatList,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { SUPPORTED_CURRENCIES, CurrencyOption } from '../utils/currencyUtils';
import { useCurrency } from '../contexts/CurrencyContext';

const { width } = Dimensions.get('window');

const OnboardingCurrencyScreen = () => {
  const navigation = useNavigation();
  const { setCurrency } = useCurrency();
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyOption | null>(null);
  
  // Animation value for button scale
  const buttonScale = React.useRef(new Animated.Value(1)).current;
  
  // Handle currency selection
  const handleSelectCurrency = (currency: CurrencyOption) => {
    setSelectedCurrency(currency);
  };
  
  // Handle continue button press
  const handleContinue = async () => {
    if (selectedCurrency) {
      // Animate button press
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Save selected currency
      await setCurrency(selectedCurrency.symbol);
      
      // Navigate to income screen
      navigation.navigate('OnboardingIncome' as never);
    }
  };
  
  // Render currency item
  const renderCurrencyItem = ({ item }: { item: CurrencyOption }) => {
    const isSelected = selectedCurrency?.code === item.code;
    
    return (
      <TouchableOpacity
        style={[
          styles.currencyItem,
          isSelected && styles.currencyItemSelected,
        ]}
        onPress={() => handleSelectCurrency(item)}
      >
        <View style={styles.currencySymbolContainer}>
          <Text style={styles.currencySymbol}>{item.symbol}</Text>
        </View>
        <View style={styles.currencyDetails}>
          <Text style={styles.currencyCode}>{item.code}</Text>
          <Text style={styles.currencyName}>{item.name}</Text>
        </View>
        {isSelected && (
          <View style={styles.checkmarkContainer}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.stepText}>Step 1 of 3</Text>
        <Text style={styles.title}>Select Your Currency</Text>
        <Text style={styles.subtitle}>
          Choose the currency you'll primarily use with your account
        </Text>
      </View>
      
      <View style={styles.currencyList}>
        <FlatList
          data={SUPPORTED_CURRENCIES}
          keyExtractor={(item) => item.code}
          renderItem={renderCurrencyItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
      
      <View style={styles.footer}>
        <Animated.View
          style={[
            { transform: [{ scale: buttonScale }] },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.button,
              !selectedCurrency && styles.buttonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!selectedCurrency}
          >
            <Text style={styles.buttonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </Animated.View>
        
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.navigate('Home' as never)}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 24,
    paddingTop: 40,
  },
  stepText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textLight,
    lineHeight: 22,
  },
  currencyList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  currencyItemSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  currencySymbolContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  currencyDetails: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  currencyName: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  checkmarkContainer: {
    marginLeft: 8,
  },
  footer: {
    padding: 24,
    paddingBottom: 36,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.gray,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  skipButton: {
    alignItems: 'center',
    padding: 8,
  },
  skipButtonText: {
    color: theme.colors.textLight,
    fontSize: 14,
  },
});

export default OnboardingCurrencyScreen; 