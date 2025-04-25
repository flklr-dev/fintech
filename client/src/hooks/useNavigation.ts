import { useNavigation as useNavigationOriginal } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

export const useNavigation = () => {
  return useNavigationOriginal<NativeStackNavigationProp<RootStackParamList>>();
}; 