import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, Alert, ScrollView, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import ScreenBackButton from '../components/ScreenBackButton';
import { getCurrentProgress, getCurrentUser, updateCurrentUserProfile } from '../utils/storage';
import { setAuthProfile, getAuthProfile } from '../utils/authProfile';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ navigation }) {
  const { hasToken, isGuestMode } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [savedName, setSavedName] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [avatarUri, setAvatarUri] = useState(null); // путь к выбранному изображению
  const [progress, setProgress] = useState({ completedLessons: [], completedChallenges: [], stars: 0 });
  const [achievementModal, setAchievementModal] = useState({ visible: false, ach: null, isUnlocked: false });

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      const auth = await getAuthProfile();
      const user = await getCurrentUser();
      const userProgress = await getCurrentProgress();

      if (hasToken && auth?.email) {
        const displayName =
          (auth.name && String(auth.name).trim()) ||
          (user?.name && String(user.name).trim()) ||
          '';
        setName(displayName);
        setEmail(auth.email || '');
        setSavedName(displayName);
        setSavedEmail(auth.email || '');
      } else if (isGuestMode && user) {
        setName(user.name || '');
        setEmail('');
        setSavedName(user.name || '');
        setSavedEmail('');
      } else if (user) {
        setName(user.name || '');
        setEmail(user.email || '');
        setSavedName(user.name || '');
        setSavedEmail(user.email || '');
      } else {
        setName('');
        setEmail('');
        setSavedName('');
        setSavedEmail('');
      }

      if (user?.avatarUri) {
        setAvatarUri(user.avatarUri);
      } else if (!user) {
        setAvatarUri(null);
      }

      setProgress(userProgress);
    });
    return unsubscribe;
  }, [navigation, hasToken, isGuestMode]);

  const unlocked = new Set(Array.isArray(progress?.achievements) ? progress.achievements : []);

  // Награды (id соответствует backend/локальной логике)
  const achievements = [
    { id: 'first_login', icon: '🎉', title: 'Первый вход', desc: 'Войти в приложение' },
    { id: 'five_lessons', icon: '🏅', title: '5 уроков', desc: 'Завершить 5 уроков' },
    { id: 'sandbox', icon: '🧩', title: 'Песочница', desc: 'Сохранить работу в галерею' },
    { id: 'first_challenge', icon: '🏆', title: 'Челлендж', desc: 'Пройти первый челлендж' },
    { id: 'first_algorithm', icon: '🤖', title: 'Алгоритмист', desc: 'Сохранить маршрут с командами' },
  ];

  // Аватар (заглушка: инициал)
  const getInitials = (n) => {
    if (!n) return '?';
    return n.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
  };

  const handleSave = () => {
    (async () => {
      try {
        const updated = await updateCurrentUserProfile({
          name,
          email: hasToken ? email : '',
          avatarUri,
        });
        if (hasToken) {
          await setAuthProfile({
            name: updated.name,
            email: updated.email || '',
            avatarUri: updated.avatarUri ?? null,
          });
        }
        setSavedName(updated.name);
        setSavedEmail(updated.email || '');
        setAvatarUri(updated.avatarUri || null);
        Alert.alert('Профиль сохранён', 'Изменения успешно сохранены!');
      } catch (err) {
        Alert.alert('Ошибка', err.message || 'Не удалось сохранить профиль.');
      }
    })();
  };

  // Выбор аватара
  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа к фото', 'Разрешите доступ к фото для выбора аватара.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#4F8CFF', position: 'relative' }}>
      <ScreenBackButton
        navigation={navigation}
        target="MainMenu"
        variant="overlay"
        overlayStyle={{ top: 48, left: 16 }}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        <Modal
          transparent
          animationType="fade"
          visible={achievementModal.visible}
          onRequestClose={() => setAchievementModal({ visible: false, ach: null, isUnlocked: false })}
        >
          <View style={styles.achModalOverlay}>
            <View style={styles.achModalContent}>
              <Text style={styles.achModalTitle}>
                {(achievementModal.ach?.icon || '🏅') + ' ' + (achievementModal.ach?.title || 'Награда')}
              </Text>
              <Text style={styles.achModalDesc}>{achievementModal.ach?.desc || ''}</Text>
              <Text style={styles.achModalStatus}>
                Статус: {achievementModal.isUnlocked ? 'Получено' : 'Пока не получено'}
              </Text>
              <TouchableOpacity
                style={styles.achModalCloseBtn}
                onPress={() => setAchievementModal({ visible: false, ach: null, isUnlocked: false })}
              >
                <Text style={styles.achModalCloseText}>Закрыть</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Text style={styles.title}>Профиль</Text>
        {isGuestMode ? (
          <Text style={styles.guestHint}>
            Без аккаунта прогресс хранится только на устройстве. Войдите, чтобы сохранять данные в облаке.
          </Text>
        ) : null}
        <View style={styles.avatarBox}>
          <TouchableOpacity onPress={pickAvatar} activeOpacity={0.7} style={styles.avatarCircle}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitial}>{getInitials(savedName)}</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.avatarEditHint}>Нажмите, чтобы изменить</Text>
        </View>
        <View style={styles.profileBox}>
          <Text style={styles.label}>Имя:</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            editable={true}
            placeholder="Введите имя"
            placeholderTextColor="#aaa"
          />
          <Text style={styles.label}>Email:</Text>
          <TextInput
            style={[styles.input, isGuestMode && styles.inputDisabled]}
            value={email}
            onChangeText={setEmail}
            editable={hasToken}
            placeholder={isGuestMode ? 'Доступно после входа' : 'Введите email'}
            placeholderTextColor="#aaa"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Сохранить</Text>
          </TouchableOpacity>
          <Text style={styles.label}>Награды:</Text>
          <View style={styles.achievementsRow}>
            {achievements.map((ach) => {
              const isUnlocked = unlocked.has(ach.id);
              return (
                <TouchableOpacity
                  key={ach.id}
                  style={[styles.achievementCard, !isUnlocked && styles.achievementCardLocked]}
                  activeOpacity={0.8}
                  onPress={() => {
                    // Alert иногда не показывается (особенно на web), поэтому используем модалку.
                    setAchievementModal({ visible: true, ach, isUnlocked });
                  }}
                >
                  <Text style={styles.achievementIcon}>{ach.icon}</Text>
                  <Text style={[styles.achievementTitle, !isUnlocked && styles.achievementTitleLocked]}>
                    {ach.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.progressBox}>
            <Text style={styles.progressText}>Пройдено уроков: {progress.completedLessons?.length || 0}</Text>
            <Text style={styles.progressText}>Пройдено челленджей: {progress.completedChallenges?.length || 0}</Text>
            <Text style={styles.progressText}>Звезды: {progress.stars || 0}</Text>
          </View>
        </View>
        {isGuestMode ? (
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.buttonText}>Войти в аккаунт</Text>
          </TouchableOpacity>
        ) : null}
        {hasToken ? (
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ChangePassword')}>
            <Text style={styles.buttonText}>Сменить пароль</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#4F8CFF',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 56,
    paddingBottom: 24,
  },
  guestHint: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'aMavickFont',
    marginBottom: 12,
    paddingHorizontal: 16,
    maxWidth: 340,
    opacity: 0.95,
  },
  inputDisabled: {
    opacity: 0.65,
    backgroundColor: '#f0f0f0',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    width: '100%',
    minHeight: 600,
  },
  title: {
    fontSize: 32,
    color: '#FFD600',
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'aMavickFont',
    textShadowColor: '#2d5db3',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 2,
  },
  avatarBox: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFA726',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 45,
  },
  avatarInitial: {
    fontSize: 38,
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'aMavickFont',
  },
  avatarEditHint: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.7,
    fontFamily: 'aMavickFont',
    marginBottom: 2,
  },
  profileBox: {
    backgroundColor: '#fffbe8',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    marginBottom: 32,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  label: {
    fontSize: 18,
    color: '#4F8CFF',
    fontWeight: 'bold',
    marginTop: 8,
    fontFamily: 'aMavickFont',
  },
  input: {
    fontSize: 18,
    color: '#222',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 4,
    fontFamily: 'aMavickFont',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: '#4F8CFF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignSelf: 'flex-end',
    marginVertical: 10,
    elevation: 2,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'aMavickFont',
  },
  achievementsList: {
    marginTop: 4,
    marginBottom: 8,
  },
  achievement: {
    fontSize: 16,
    color: '#FFA726',
    fontFamily: 'aMavickFont',
    marginLeft: 8,
    marginBottom: 2,
  },
  achievementsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
    gap: 12,
  },
  achievementCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    margin: 4,
    minWidth: 80,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  achievementCardLocked: {
    opacity: 0.35,
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: 2,
    fontFamily: 'aMavickFont',
  },
  achievementTitle: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'aMavickFont',
  },
  achievementTitleLocked: {
    color: '#607D8B',
  },
  progressBox: {
    marginTop: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#1B5E20',
    fontFamily: 'aMavickFont',
  },
  button: {
    backgroundColor: '#FFA726',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'aMavickFont',
  },
  achModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  achModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fffbe8',
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 18,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  achModalTitle: {
    fontFamily: 'aMavickFont',
    fontSize: 22,
    color: '#1976D2',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  achModalDesc: {
    marginTop: 10,
    fontFamily: 'aMavickFont',
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  achModalStatus: {
    marginTop: 10,
    fontFamily: 'aMavickFont',
    fontSize: 14,
    color: '#607D8B',
    textAlign: 'center',
  },
  achModalCloseBtn: {
    marginTop: 14,
    backgroundColor: '#4F8CFF',
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  achModalCloseText: {
    color: '#fff',
    fontFamily: 'aMavickFont',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 