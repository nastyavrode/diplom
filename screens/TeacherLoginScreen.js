import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AuthScreenChrome from '../components/AuthScreenChrome';
import { login } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { authFormStyles } from '../constants/authWelcomeFormStyles';
import { useAuthLayoutMetrics } from '../hooks/useAuthLayoutMetrics';

export default function TeacherLoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const m = useAuthLayoutMetrics();
  const f = m.form;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
      if (data.role !== 'teacher') {
        Alert.alert('Ошибка', 'Это не аккаунт учителя');
        return;
      }
      await signIn();
      navigation.reset({ index: 0, routes: [{ name: 'TeacherCabinet' }] });
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
    <AuthScreenChrome subtitle="Кабинет учителя" showMascot>
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
          style={[authFormStyles.button, { marginBottom: 8 }]}
          onPress={handleLogin}
        >
          <Text style={authFormStyles.buttonText}>Войти</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => navigation.navigate('TeacherRegister')}>
        <Text style={authFormStyles.mutedLink}>Создать аккаунт учителя</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 12 }}>
        <Text style={authFormStyles.mutedLink}>Вход ученика</Text>
      </TouchableOpacity>
    </AuthScreenChrome>
  );
}
