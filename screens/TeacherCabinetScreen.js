import React, { useCallback, useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Dimensions, 
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { getAuthProfile } from '../utils/authProfile';
import { useAuth } from '../context/AuthContext';
import { createStudent, fetchStudents } from '../utils/api';

export default function TeacherCabinetScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const [userName, setUserName] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [creatingStudent, setCreatingStudent] = useState(false);

  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const CLOUD_WIDTH = SCREEN_WIDTH * 0.7;
  const CLOUD_HEIGHT = CLOUD_WIDTH * 218 / 270;

  const cloud1 = useRef(new Animated.Value(-270)).current;
  const cloud2 = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const cloud3 = useRef(new Animated.Value(-CLOUD_WIDTH)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(cloud1, {
        toValue: SCREEN_WIDTH,
        duration: 18000,
        useNativeDriver: false,
      })
    ).start();
    Animated.loop(
      Animated.timing(cloud2, {
        toValue: -CLOUD_WIDTH,
        duration: 20000,
        useNativeDriver: false,
      })
    ).start();
    Animated.loop(
      Animated.timing(cloud3, {
        toValue: SCREEN_WIDTH,
        duration: 26000,
        useNativeDriver: false,
      })
    ).start();
  }, [cloud1, cloud2, cloud3]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const auth = await getAuthProfile();
      const name = (auth?.name || '').trim();
      setUserName(name || '');

      const classStudents = await fetchStudents();
      setStudents(classStudents);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const resetAddForm = () => {
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentPassword('');
  };

  const closeAddModal = () => {
    setAddModalVisible(false);
    resetAddForm();
  };

  const handleCreateStudent = async () => {
    const nameTrim = newStudentName.trim();
    if (!nameTrim || !newStudentEmail.trim() || !newStudentPassword) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }
    if (nameTrim.length < 2) {
      Alert.alert('Ошибка', 'Имя — не менее 2 символов');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newStudentEmail.trim())) {
      Alert.alert('Ошибка', 'Введите корректный email');
      return;
    }
    if (newStudentPassword.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть не менее 6 символов');
      return;
    }

    setCreatingStudent(true);
    try {
      const result = await createStudent({
        name: nameTrim,
        email: newStudentEmail.trim(),
        password: newStudentPassword,
      });
      closeAddModal();
      if (result?.student) {
        setStudents((prev) => [result.student, ...prev]);
      } else {
        await loadData();
      }
      Alert.alert('Успех', 'Ученик успешно добавлен');
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Не удалось добавить ученика');
    } finally {
      setCreatingStudent(false);
    }
  };

  const dynamicPaddingTop = SCREEN_HEIGHT < 700 ? 24 : 48;
  const dynamicTitleFontSize = SCREEN_HEIGHT < 700 ? 28 : 40;
  const dynamicTitleLineHeight = SCREEN_HEIGHT < 700 ? 32 : 44;

  const renderStudentCard = ({ item }) => (
    <Pressable 
      style={styles.studentCard}
      onPress={() => navigation.navigate('StudentProgress', { studentId: item._id, studentName: item.name })}
    >
      <View style={styles.studentCardContent}>
        <Text style={styles.studentName}>{item.name || 'Ученик'}</Text>
        <Text style={styles.studentEmail}>{item.email}</Text>
        <View style={styles.progressInfo}>
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>Уроков:</Text>
            <Text style={styles.progressValue}>{item.progress.completedLessons.length}</Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>Челленджей:</Text>
            <Text style={styles.progressValue}>{item.progress.completedChallenges.length}</Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>★</Text>
            <Text style={styles.progressValue}>{item.progress.stars}</Text>
          </View>
        </View>
      </View>
      <Svg width={20} height={20} viewBox="0 0 24 24" style={styles.arrowIcon}>
        <Path d="M9 6l6 6-6 6" stroke="#4F8CFF" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </Svg>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#4F8CFF' }}>
      <TouchableOpacity
        style={[styles.addStudentButton, { top: insets.top + 12 }]}
        onPress={() => setAddModalVisible(true)}
        accessibilityLabel="Добавить ученика"
      >
        <Text style={styles.addStudentButtonText}>+</Text>
      </TouchableOpacity>

      <Modal
        transparent
        animationType="fade"
        visible={addModalVisible}
        onRequestClose={closeAddModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Добавить ученика</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Имя"
              placeholderTextColor="#888"
              value={newStudentName}
              onChangeText={setNewStudentName}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Email"
              placeholderTextColor="#888"
              keyboardType="email-address"
              autoCapitalize="none"
              value={newStudentEmail}
              onChangeText={setNewStudentEmail}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Пароль"
              placeholderTextColor="#888"
              secureTextEntry
              value={newStudentPassword}
              onChangeText={setNewStudentPassword}
            />
            {creatingStudent ? (
              <ActivityIndicator size="large" color="#4F8CFF" style={{ marginVertical: 12 }} />
            ) : (
              <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleCreateStudent}>
                <Text style={styles.modalPrimaryButtonText}>Добавить</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.modalCancelButton} onPress={closeAddModal}>
              <Text style={styles.modalCancelButtonText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Animated.View style={[styles.cloud, { top: 100, opacity: 0.4, width: CLOUD_WIDTH, height: CLOUD_HEIGHT, transform: [{ translateX: cloud1 }] }]}> 
        <Svg width="100%" height="100%" viewBox="0 0 270 218">
          <Path opacity={0.2} d="M215.238 91.1967C211.571 75.7343 201.566 61.8108 186.931 51.8045C172.297 41.7982 153.942 36.3298 135 36.3333C103.451 36.3333 76.05 51.23 62.4042 73.03C46.3592 74.4727 31.521 80.7982 20.7406 90.7908C9.96018 100.784 3.99813 113.739 4 127.167C4 157.233 33.3658 181.667 69.5 181.667H211.417C241.547 181.667 266 161.32 266 136.25C266 112.27 243.621 92.8317 215.238 91.1967Z" fill="#fff" />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.cloud, { top: 300, opacity: 0.5, width: CLOUD_WIDTH, height: CLOUD_HEIGHT, transform: [{ translateX: cloud2 }] }]}> 
        <Svg width="100%" height="100%" viewBox="0 0 270 218">
          <Path opacity={0.2} d="M262 128.425C262.001 120.796 258.648 113.388 252.478 107.387C246.309 101.386 237.68 97.1384 227.973 95.325C227.571 83.2037 220.984 71.6815 209.614 63.2146C198.244 54.7477 182.991 50.0059 167.107 50C157.898 49.995 148.809 51.588 140.525 54.6587C132.242 57.7294 124.981 62.1974 119.292 67.725C114.662 63.1859 108.199 59.9403 100.906 58.4917C93.6127 57.0432 85.8971 57.4727 78.9563 59.7137C72.0156 61.9547 66.2379 65.8818 62.5198 70.8856C58.8017 75.8894 57.3512 81.6901 58.3933 87.3875C51.2498 86.4011 43.9098 86.6241 36.8916 88.0407C29.8735 89.4573 23.3484 92.0331 17.7774 95.5859C12.2063 99.1388 7.7252 103.582 4.65056 108.602C1.57593 113.622 -0.017232 119.096 -0.0163723 124.638C-0.0120396 134.674 5.21054 144.299 14.5043 151.398C23.7981 158.497 36.4031 162.49 49.5508 162.5H217.46C229.28 162.48 240.607 158.881 248.955 152.492C257.302 146.104 262.004 137.448 262 128.425Z" fill="#fff" />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.cloud, { bottom: 100, opacity: 0.3, width: CLOUD_WIDTH, height: CLOUD_HEIGHT, transform: [{ translateX: cloud3 }] }]}> 
        <Svg width="100%" height="100%" viewBox="0 0 270 218">
          <Path opacity={0.2} d="M215.238 91.1967C211.571 75.7343 201.566 61.8108 186.931 51.8045C172.297 41.7982 153.942 36.3298 135 36.3333C103.451 36.3333 76.05 51.23 62.4042 73.03C46.3592 74.4727 31.521 80.7982 20.7406 90.7908C9.96018 100.784 3.99813 113.739 4 127.167C4 157.233 33.3658 181.667 69.5 181.667H211.417C241.547 181.667 266 161.32 266 136.25C266 112.27 243.621 92.8317 215.238 91.1967Z" fill="#fff" />
        </Svg>
      </Animated.View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingTop: dynamicPaddingTop + insets.top, paddingHorizontal: 16, alignItems: 'center' }]} 
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { fontSize: dynamicTitleFontSize, lineHeight: dynamicTitleLineHeight }]}>
          КАБИНЕТ{"\n"}УЧИТЕЛЯ
        </Text>
        {userName ? <Text style={styles.greeting}>Привет, {userName}!</Text> : null}

        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginVertical: 32 }} />
        ) : students.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Нет учеников в классе</Text>
            <Text style={styles.emptyStateHint}>Нажмите «+», чтобы добавить первого ученика</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Мои ученики ({students.length})</Text>
            <FlatList
              data={students}
              renderItem={renderStudentCard}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              style={{ width: '100%', maxWidth: 350 }}
            />
          </>
        )}

        <TouchableOpacity
          style={styles.exitButton}
          onPress={async () => {
            await signOut();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }}
        >
          <Svg
            width={32}
            height={32}
            viewBox="0 0 32 32"
            style={{ marginRight: 12 }}
          >
            <Path d="M10.6667 4C11.0065 4.00038 11.3334 4.13051 11.5805 4.3638C11.8276 4.59709 11.9763 4.91594 11.9962 5.25519C12.0161 5.59445 11.9058 5.92851 11.6876 6.18911C11.4695 6.44971 11.1601 6.6172 10.8227 6.65733L10.6667 6.66667H3.99998C3.67341 6.66671 3.3582 6.78661 3.11416 7.00362C2.87011 7.22063 2.71419 7.51967 2.67598 7.844L2.66665 8V24C2.66669 24.3266 2.78659 24.6418 3.0036 24.8858C3.22062 25.1299 3.51965 25.2858 3.84398 25.324L3.99998 25.3333H9.99999C10.3398 25.3337 10.6667 25.4638 10.9138 25.6971C11.1609 25.9304 11.3096 26.2493 11.3295 26.5885C11.3495 26.9278 11.2391 27.2618 11.021 27.5224C10.8028 27.783 10.4934 27.9505 10.156 27.9907L9.99999 28H3.99998C2.9797 28.0001 1.99796 27.6102 1.25564 26.9103C0.513309 26.2103 0.0665081 25.2532 0.00665157 24.2347L-1.52526e-05 24V8C-7.20878e-05 6.97972 0.389752 5.99798 1.0897 5.25565C1.78964 4.51332 2.74679 4.06652 3.76532 4.00667L3.99998 4H10.6667ZM18.276 11.2853L22.0467 15.0573C22.2966 15.3074 22.437 15.6464 22.437 16C22.437 16.3536 22.2966 16.6926 22.0467 16.9427L18.276 20.7147C18.0258 20.9647 17.6865 21.1051 17.3328 21.1049C16.9792 21.1048 16.64 20.9642 16.39 20.714C16.14 20.4638 15.9996 20.1246 15.9997 19.7709C15.9998 19.4172 16.1405 19.078 16.3907 18.828L17.8853 17.3333H10.6667C10.313 17.3333 9.97389 17.1929 9.72384 16.9428C9.47379 16.6928 9.33332 16.3536 9.33332 16C9.33332 15.6464 9.47379 15.3072 9.72384 15.0572C9.97389 14.8071 10.313 14.6667 10.6667 14.6667H17.8853L16.3907 13.172C16.1405 12.922 15.9998 12.5828 15.9997 12.2291C15.9996 11.8754 16.14 11.5362 16.39 11.286C16.64 11.0358 16.9792 10.8952 17.3328 10.8951C17.6865 10.8949 18.0258 11.0353 18.276 11.2853Z" fill="white"/>
          </Svg>
          <Text style={styles.buttonText}>Выйти</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingBottom: 32,
  },
  addStudentButton: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    backgroundColor: '#FFD600',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  addStudentButtonText: {
    color: '#4F8CFF',
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'aMavickFont',
    lineHeight: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalContent: {
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
  modalTitle: {
    fontFamily: 'aMavickFont',
    fontSize: 22,
    color: '#1976D2',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalPrimaryButton: {
    marginTop: 8,
    backgroundColor: '#4F8CFF',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    color: '#fff',
    fontFamily: 'aMavickFont',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCancelButton: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalCancelButtonText: {
    color: '#607D8B',
    fontFamily: 'aMavickFont',
    fontSize: 16,
  },
  title: {
    color: '#FFD600',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.1,
    textShadowColor: '#2d5db3',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 2,
    fontFamily: 'aMavickFont',
  },
  greeting: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'aMavickFont',
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'aMavickFont',
    marginVertical: 16,
    width: '100%',
    paddingHorizontal: 16,
  },
  studentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  studentCardContent: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressItem: {
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11,
    color: '#999',
  },
  progressValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4F8CFF',
  },
  arrowIcon: {
    marginLeft: 8,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'aMavickFont',
  },
  emptyStateHint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontFamily: 'aMavickFont',
    marginTop: 8,
    textAlign: 'center',
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E53935',
    width: '100%',
    maxWidth: 320,
    borderRadius: 28,
    paddingVertical: 20,
    marginTop: 24,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'aMavickFont',
  },
  cloud: {
    position: 'absolute',
    zIndex: 0,
  },
});
