// utils/authStorage.js
// SecureStore uses native keychain APIs; on web the native module is empty, so we use AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';
const WEB_TOKEN_KEY = '@auth_token';

const useSecureStore = () => Platform.OS !== 'web';

export const storeToken = async (token) => {
  try {
    if (useSecureStore()) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await AsyncStorage.setItem(WEB_TOKEN_KEY, token);
    }
    return true;
  } catch (error) {
    console.error('Failed to store token:', error);
    return false;
  }
};

export const getToken = async () => {
  try {
    if (useSecureStore()) {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    }
    return await AsyncStorage.getItem(WEB_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get token:', error);
    return null;
  }
};

export const removeToken = async () => {
  try {
    if (useSecureStore()) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } else {
      await AsyncStorage.removeItem(WEB_TOKEN_KEY);
    }
  } catch (error) {
    console.error('Failed to remove token:', error);
  }
};