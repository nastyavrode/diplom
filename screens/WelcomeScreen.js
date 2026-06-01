import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform, View } from 'react-native';
import AuthScreenChrome from '../components/AuthScreenChrome';
import { login } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { authFormStyles } from '../constants/authWelcomeFormStyles';
import { useAuthLayoutMetrics } from '../hooks/useAuthLayoutMetrics';

export default function WelcomeScreen({ navigation }) {
  const { signIn, enterGuestMode } = useAuth();
  const m = useAuthLayoutMetrics();
  const f = m.form;
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

  const inputStyle = [
    authFormStyles.input,
    {
      fontSize: f.inputFontSize,
      paddingVertical: f.inputPadV,
      paddingHorizontal: f.inputPadH,
      marginBottom: f.inputMarginB,
    },
  ];

  return (
    <AuthScreenChrome subtitle="Войди в свой аккаунт" showMascot>
      <TextInput
        style={inputStyle}
        placeholder="Email"
        placeholderTextColor="#888"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={inputStyle}
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
          style={[
            authFormStyles.primaryButton,
            {
              paddingVertical: f.btnPadV,
              marginBottom: f.btnMarginB,
              marginTop: f.btnMarginT,
            },
          ]}
          onPress={onSignIn}
          disabled={loading}
        >
          <Text style={[authFormStyles.primaryButtonText, { fontSize: f.btnFontSize }]}>Войти</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={{ alignSelf: 'stretch' }} onPress={() => navigation.navigate('Register')}>
        <Text style={[authFormStyles.link, { fontSize: f.linkFontSize }]}>Зарегистрироваться</Text>
      </TouchableOpacity>
      <TouchableOpacity style={{ alignSelf: 'stretch' }} onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={[authFormStyles.mutedLink, { fontSize: f.mutedLinkFontSize }]}>Забыли пароль?</Text>
      </TouchableOpacity>
      {guestLoading ? (
        <ActivityIndicator size="small" color="#fff" style={{ marginTop: 8 }} />
      ) : (
        <TouchableOpacity style={{ alignSelf: 'stretch' }} onPress={onContinueAsGuest} disabled={guestLoading}>
          <Text style={[authFormStyles.mutedLink, { marginTop: 4, fontSize: f.mutedLinkFontSize }]}>
            Продолжить без аккаунта
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={{ alignSelf: 'stretch', marginTop: 12 }} onPress={() => navigation.navigate('TeacherLogin')}>
        <Text style={[authFormStyles.mutedLink, { fontSize: f.mutedLinkFontSize, fontWeight: '600' }]}>
          Вход для учителей
        </Text>
      </TouchableOpacity>
      {Platform.OS === 'web' ? <View style={{ height: 16 }} /> : null}
    </AuthScreenChrome>
  );
}
