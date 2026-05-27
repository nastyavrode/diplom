import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AuthScreenChrome from '../components/AuthScreenChrome';
import { login } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { authFormStyles } from '../constants/authWelcomeFormStyles';
import { useAuthLayoutMetrics } from '../hooks/useAuthLayoutMetrics';

export default function LoginScreen({ navigation }) {
  const { signIn, enterGuestMode } = useAuth();
  const m = useAuthLayoutMetrics();
  const f = m.form;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const onContinueWithoutAccount = async () => {
    try {
      setGuestLoading(true);
      await enterGuestMode();
      navigation.navigate('MainMenu');
    } catch (err) {
      Alert.alert('Ошибка', err.message || 'Не удалось продолжить.');
    } finally {
      setGuestLoading(false);
    }
  };
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Ошибка', 'Введите корректный email');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      await signIn();
      // Перенаправить в зависимости от роли
      const route = data.role === 'teacher' ? 'TeacherCabinet' : 'MainMenu';
      navigation.reset({ index: 0, routes: [{ name: route }] });
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Не удалось войти');
    } finally {
      setLoading(false);
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
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#888"
      />
      <TextInput
        style={inputStyle}
        placeholder="Пароль"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#888"
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
          onPress={handleLogin}
        >
          <Text style={[authFormStyles.primaryButtonText, { fontSize: f.btnFontSize }]}>Войти</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={{ alignSelf: 'stretch' }} onPress={() => navigation.navigate('Register')}>
        <Text style={[authFormStyles.link, { fontSize: f.linkFontSize }]}>Зарегистрироваться</Text>
      </TouchableOpacity>
      <TouchableOpacity style={{ alignSelf: 'stretch' }} onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={[authFormStyles.mutedLink, { marginTop: 8, fontSize: f.mutedLinkFontSize }]}>
          Забыли пароль?
        </Text>
      </TouchableOpacity>
      {guestLoading ? (
        <ActivityIndicator size="small" color="#fff" style={{ marginTop: 8 }} />
      ) : (
        <TouchableOpacity style={{ alignSelf: 'stretch' }} onPress={onContinueWithoutAccount} disabled={guestLoading}>
          <Text style={[authFormStyles.mutedLink, { marginTop: 4, fontSize: f.mutedLinkFontSize }]}>
            Продолжить без аккаунта
          </Text>
        </TouchableOpacity>
      )}
    </AuthScreenChrome>
  );
}
