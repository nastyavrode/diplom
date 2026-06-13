import React, { useState, useMemo } from 'react';
import { Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, View } from 'react-native';
import AuthScreenChrome from '../components/AuthScreenChrome';
import { register } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { authFormStyles } from '../constants/authWelcomeFormStyles';
import { useAuthLayoutMetrics } from '../hooks/useAuthLayoutMetrics';

export default function RegisterScreen({ navigation }) {
  const { signIn } = useAuth();
  const m = useAuthLayoutMetrics();
  const f = m.form;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);

  const inputCommon = useMemo(
    () => (extra = {}) => [
      authFormStyles.input,
      {
        fontSize: f.inputFontSize,
        paddingVertical: f.inputPadV,
        paddingHorizontal: f.inputPadH,
        marginBottom: f.inputMarginB,
        ...extra,
      },
    ],
    [f.inputFontSize, f.inputPadV, f.inputPadH, f.inputMarginB]
  );

  const handleRegister = async () => {
    const nameTrim = name.trim();
    if (!nameTrim || !email.trim() || !password || !password2 || !role) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }
    if (!['student', 'teacher'].includes(role)) {
      Alert.alert('Ошибка', 'Выберите роль');
      return;
    }
    if (nameTrim.length < 2) {
      Alert.alert('Ошибка', 'Имя — не менее 2 символов');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Ошибка', 'Введите корректный email');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть не менее 6 символов');
      return;
    }
    if (password !== password2) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }

    setLoading(true);
    try {
      const data = await register({ name: nameTrim, email: email.trim(), password, role });
      await signIn();
      const route = data.role === 'teacher' ? 'TeacherCabinet' : 'MainMenu';
      navigation.reset({ index: 0, routes: [{ name: route }] });
      Alert.alert('Успех', 'Регистрация прошла успешно!');
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Не удалось зарегистрироваться');
    } finally {
      setLoading(false);
    }
  };

  const strength = (() => {
    let s = 0;
    if (password.length >= 6) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthColor = strength < 2 ? '#FF4757' : strength < 4 ? '#FFA502' : '#2ED573';
  const strengthLabel = strength < 2 ? 'Слабый' : strength < 4 ? 'Средний' : 'Надёжный';

  return (
    <AuthScreenChrome subtitle="Создай аккаунт" showMascot={false}>
      <TextInput
        style={inputCommon()}
        placeholder="Имя"
        placeholderTextColor="#888"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />
      <TextInput
        style={inputCommon()}
        placeholder="Email"
        placeholderTextColor="#888"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <Text
        style={{
          color: '#fff',
          fontFamily: 'aMavickFont',
          marginBottom: 8,
          fontSize: f.mutedLinkFontSize,
          alignSelf: 'center',
          maxWidth: f.maxContentWidth,
        }}
      >
        Роль
      </Text>
      <View
        style={{
          flexDirection: 'row',
          width: '100%',
          maxWidth: f.maxContentWidth,
          alignSelf: 'center',
          marginBottom: f.inputMarginB,
          gap: 8,
        }}
      >
        {[
          { value: 'student', label: 'Ученик' },
          { value: 'teacher', label: 'Учитель' },
        ].map((option) => {
          const selected = role === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={{
                flex: 1,
                backgroundColor: selected ? '#FFA726' : '#fffbe8',
                borderRadius: 28,
                paddingVertical: f.inputPadV,
                alignItems: 'center',
              }}
              onPress={() => setRole(option.value)}
            >
              <Text
                style={{
                  fontFamily: 'aMavickFont',
                  color: selected ? '#fff' : '#222',
                  fontWeight: 'bold',
                  fontSize: f.btnFontSize,
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TextInput
        style={inputCommon()}
        placeholder="Пароль"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={inputCommon({ marginBottom: 8 })}
        placeholder="Повторите пароль"
        placeholderTextColor="#888"
        secureTextEntry
        value={password2}
        onChangeText={setPassword2}
      />
      {password.length > 0 ? (
        <View style={{ width: '100%', maxWidth: f.maxContentWidth, marginBottom: 10, alignSelf: 'center' }}>
          <View
            style={{
              flexDirection: 'row',
              height: 5,
              borderRadius: 3,
              overflow: 'hidden',
              backgroundColor: '#e0e0e0',
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  backgroundColor: i < strength ? strengthColor : '#e0e0e0',
                }}
              />
            ))}
          </View>
          <Text
            style={{
              color: strengthColor,
              fontFamily: 'aMavickFont',
              marginTop: 6,
              fontSize: f.mutedLinkFontSize,
            }}
          >
            Сложность: {strengthLabel}
          </Text>
        </View>
      ) : null}
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
          onPress={handleRegister}
        >
          <Text style={[authFormStyles.primaryButtonText, { fontSize: f.btnFontSize }]}>
            Зарегистрироваться
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={{ alignSelf: 'stretch' }} onPress={() => navigation.navigate('Login')}>
        <Text style={[authFormStyles.link, { fontSize: f.linkFontSize }]}>Уже есть аккаунт? Войти</Text>
      </TouchableOpacity>
    </AuthScreenChrome>
  );
}
