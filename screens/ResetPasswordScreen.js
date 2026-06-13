import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native';
import AuthScreenChrome from '../components/AuthScreenChrome';
import { API_AUTH_BASE } from '../utils/apiBase';
import { authFormStyles } from '../constants/authWelcomeFormStyles';
import { useAuthLayoutMetrics } from '../hooks/useAuthLayoutMetrics';

const ResetPasswordScreen = ({ route, navigation }) => {
  const { token } = route.params || {};
  const m = useAuthLayoutMetrics();
  const f = m.form;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const strength = getPasswordStrength(newPassword);
  const color = strength < 2 ? '#FF4757' : strength < 4 ? '#FFA502' : '#2ED573';
  const label = strength < 2 ? 'Слабый' : strength < 4 ? 'Средний' : 'Надёжный';

  const inputStyle = [
    authFormStyles.input,
    {
      fontSize: f.inputFontSize,
      paddingVertical: f.inputPadV,
      paddingHorizontal: f.inputPadH,
      marginBottom: f.inputMarginB,
    },
  ];

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_AUTH_BASE}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Успех', 'Пароль успешно изменён');
        navigation.replace('Login');
      } else {
        Alert.alert('Ошибка', data.error || 'Не удалось сбросить пароль');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось подключиться к серверу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenChrome subtitle="Новый пароль" showMascot={false}>
      <TextInput
        style={inputStyle}
        placeholder="Новый пароль"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        placeholderTextColor="#888"
      />
      <TextInput
        style={inputStyle}
        placeholder="Подтвердите пароль"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholderTextColor="#888"
      />

      {newPassword.length > 0 ? (
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
            {[0, 1, 2, 3].map((index) => (
              <View
                key={index}
                style={{
                  flex: 1,
                  backgroundColor: index < strength ? color : '#e0e0e0',
                }}
              />
            ))}
          </View>
          <Text style={{ color, fontFamily: 'aMavickFont', marginTop: 6, fontSize: f.mutedLinkFontSize }}>
            Сложность: {label}
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
          onPress={handleReset}
        >
          <Text style={[authFormStyles.primaryButtonText, { fontSize: f.btnFontSize }]}>Сменить пароль</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={{ alignSelf: 'stretch' }} onPress={() => navigation.navigate('Login')}>
        <Text style={[authFormStyles.link, { fontSize: f.linkFontSize }]}>Назад</Text>
      </TouchableOpacity>
    </AuthScreenChrome>
  );
};

export default ResetPasswordScreen;
