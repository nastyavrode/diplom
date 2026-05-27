import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AuthScreenChrome from '../components/AuthScreenChrome';
import { API_AUTH_BASE } from '../utils/apiBase';
import { authFormStyles } from '../constants/authWelcomeFormStyles';
import { useAuthLayoutMetrics } from '../hooks/useAuthLayoutMetrics';

export default function ForgotPasswordScreen({ navigation }) {
  const m = useAuthLayoutMetrics();
  const f = m.form;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetRequest = async () => {
    if (!email) {
      Alert.alert('Ошибка', 'Введите email');
      return;
    }

    setLoading(true);
    try {
      await fetch(`${API_AUTH_BASE}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      Alert.alert('Готово', 'Если аккаунт существует, письмо отправлено на ваш email');
      navigation.navigate('Welcome');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось отправить запрос');
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
    <AuthScreenChrome subtitle="Восстановление пароля" showMascot={false}>
      <Text
        style={{
          color: '#fff',
          fontFamily: 'aMavickFont',
          textAlign: 'center',
          marginBottom: 12,
          maxWidth: f.maxContentWidth,
          alignSelf: 'center',
          fontSize: f.mutedLinkFontSize,
          flexShrink: 1,
        }}
      >
        Введите email аккаунта — мы отправим временный пароль.
      </Text>
      <TextInput
        style={inputStyle}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
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
          onPress={handleResetRequest}
        >
          <Text style={[authFormStyles.primaryButtonText, { fontSize: f.btnFontSize }]}>Отправить пароль</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={{ alignSelf: 'stretch' }} onPress={() => navigation.navigate('Welcome')}>
        <Text style={[authFormStyles.link, { fontSize: f.linkFontSize }]}>Назад</Text>
      </TouchableOpacity>
    </AuthScreenChrome>
  );
}
