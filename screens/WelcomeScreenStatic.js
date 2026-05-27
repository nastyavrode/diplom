import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform, View } from 'react-native';
import AuthScreenChrome from '../components/AuthScreenChrome';
import { login } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { authFormStyles } from '../constants/authWelcomeFormStyles';

export default function WelcomeScreenStatic({ navigation }) {
  const { signIn, enterGuestMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const onSignIn = async () => {
    const em = email.trim();
    if (!em || !password) {
      Alert.alert('Ошибка', 'Введите email и пароль.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      Alert.alert('Ошибка', 'Введите корректный email.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть не менее 6 символов.');
      return;
    }
    try {
      setLoading(true);
      await login(em, password);
      await signIn();
      navigation.reset({ index: 0, routes: [{ name: 'MainMenu' }] });
    } catch (err) {
      Alert.alert('Ошибка входа', err.message || 'Неверные данные.');
    } finally {
      setLoading(false);
    }
  };

  const onContinueAsGuest = async () => {
    try {
      setGuestLoading(true);
      await enterGuestMode();
    } catch (err) {
      Alert.alert('Ошибка', err.message || 'Не удалось продолжить.');
    } finally {
      setGuestLoading(false);
    }
  };

  // Стили с фиксированными размерами, где текст может обрезаться на маленьких экранах
  const fixedInputStyle = {
    ...authFormStyles.input,
    fontSize: 18,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 15,
  };

  const buttonTextStyle = {
    ...authFormStyles.primaryButtonText,
    fontSize: 18,
  };

  const linkTextStyle = {
    ...authFormStyles.link,
    fontSize: 16,
  };

  const mutedLinkTextStyle = {
    ...authFormStyles.mutedLink,
    fontSize: 14,
  };

  return (
    <AuthScreenChrome subtitle="Войди в свой аккаунт" showMascot>
      <TextInput
        style={fixedInputStyle}
        placeholder="Email"
        placeholderTextColor="#888"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={fixedInputStyle}
        placeholder="Пароль"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginVertical: 12 }} />
      ) : (
        <TouchableOpacity
          style={authFormStyles.primaryButton}
          onPress={onSignIn}
          disabled={loading}
        >
          <Text style={buttonTextStyle}>Войти</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={{ alignSelf: 'stretch' }} onPress={() => navigation.navigate('Register')}>
        <Text style={linkTextStyle}>Зарегистрироваться</Text>
      </TouchableOpacity>
      <TouchableOpacity style={{ alignSelf: 'stretch' }} onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={mutedLinkTextStyle}>Забыли пароль?</Text>
      </TouchableOpacity>
      {guestLoading ? (
        <ActivityIndicator size="small" color="#fff" style={{ marginTop: 8 }} />
      ) : (
        <TouchableOpacity style={{ alignSelf: 'stretch' }} onPress={onContinueAsGuest} disabled={guestLoading}>
          <Text style={mutedLinkTextStyle}>
            Продолжить без аккаунта
          </Text>
        </TouchableOpacity>
      )}
      {Platform.OS === 'web' ? <View style={{ height: 16 }} /> : null}
    </AuthScreenChrome>
  );
}
