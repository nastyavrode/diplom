import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import AuthScreenChrome from '../components/AuthScreenChrome';
import { API_AUTH_BASE } from '../utils/apiBase';
import { authFormStyles } from '../constants/authWelcomeFormStyles';
import { useAuthLayoutMetrics } from '../hooks/useAuthLayoutMetrics';
import { getAuthToken } from '../utils/api';

const ChangePasswordScreen = ({ navigation }) => {
  const m = useAuthLayoutMetrics();
  const f = m.form;
  const [currentPassword, setCurrentPassword] = useState('');
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

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Ошибка', 'Новые пароли не совпадают');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Ошибка', 'Новый пароль должен быть не менее 6 символов');
      return;
    }

    const token = await getAuthToken();
    if (!token) {
      Alert.alert('Ошибка', 'Вы не авторизованы');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_AUTH_BASE}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Успех', 'Пароль успешно изменён');
        navigation.goBack();
      } else {
        Alert.alert('Ошибка', data.error || 'Не удалось изменить пароль');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось подключиться к серверу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenChrome subtitle="Смена пароля" showMascot={false}>
      <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
        <TextInput
          style={inputStyle}
          placeholder="Текущий пароль"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          placeholderTextColor="#888"
        />
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
          placeholder="Подтвердите новый пароль"
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
            onPress={handleChangePassword}
          >
            <Text style={[authFormStyles.primaryButtonText, { fontSize: f.btnFontSize }]}>Сменить пароль</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={{ alignSelf: 'stretch' }} onPress={() => navigation.goBack()}>
          <Text style={[authFormStyles.link, { fontSize: f.linkFontSize }]}>Отмена</Text>
        </TouchableOpacity>
      </ScrollView>
    </AuthScreenChrome>
  );
};

export default ChangePasswordScreen;
