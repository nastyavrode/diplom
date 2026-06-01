import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getAuthToken, logout } from './utils/api';
import { AuthContext } from './context/AuthContext';
import {
  clearGuestBundle,
  setGuestBrowsing,
  ensureGuestBundleInitialized,
  getGuestBrowsing,
  unlockGuestAchievement,
} from './utils/guestBundle';
import { logoutUser } from './utils/storage';

import WelcomeScreen from './screens/WelcomeScreen';
import WelcomeScreenStatic from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import MainMenuScreen from './screens/MainMenuScreen';
import LessonsListScreen from './screens/LessonsListScreen';
import SandboxScreen from './screens/SandboxScreen';
import ChallengesScreen from './screens/ChallengesScreen';
import GalleryScreen from './screens/GalleryScreen';
import ProfileScreen from './screens/ProfileScreen';
import LessonPlayerScreen from './screens/LessonPlayerScreen';
import TeacherLoginScreen from './screens/TeacherLoginScreen';
import TeacherRegisterScreen from './screens/TeacherRegisterScreen';
import TeacherCabinetScreen from './screens/TeacherCabinetScreen';
import StudentProgressScreen from './screens/StudentProgressScreen';
import StudentRegisterForTeacherScreen from './screens/StudentRegisterForTeacherScreen';

const Stack = createNativeStackNavigator();

const App = () => {
  const fontMap = useMemo(
    () => ({
      /** Имя совпадает с fontFamily в стилях. Без useFonts веб и Expo Go часто рисуют системный шрифт. */
      aMavickFont: require('./assets/fonts/ofont.ru_Amavickfont.ttf'),
    }),
    []
  );
  const [fontsLoaded, fontError] = useFonts(fontMap);
  const [boot, setBoot] = useState({ ready: false, token: false, guest: false });

  useEffect(() => {
    if (__DEV__ && fontError) {
      // eslint-disable-next-line no-console
      console.warn('[fonts] Не удалось загрузить aMavickFont:', fontError);
    }
  }, [fontError]);

  const fontsReady = fontsLoaded || fontError != null;

  const rehydrateSession = useCallback(async () => {
    const token = await getAuthToken();
    const guestBrowsing = token ? false : await getGuestBrowsing();
    setBoot({ ready: true, token: !!token, guest: !!guestBrowsing });
  }, []);

  useEffect(() => {
    rehydrateSession();
  }, [rehydrateSession]);

  const signIn = useCallback(async () => {
    await rehydrateSession();
  }, [rehydrateSession]);

  const enterGuestMode = useCallback(async () => {
    await setGuestBrowsing(true);
    await ensureGuestBundleInitialized();
    await unlockGuestAchievement('first_login');
    await rehydrateSession();
  }, [rehydrateSession]);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch (_e) {
      /* ignore */
    }
    await logoutUser();
    // После выхода — тот же режим, что у гостя: локальный прогресс, кнопка «Войти» в профиле
    await clearGuestBundle();
    await setGuestBrowsing(true);
    await ensureGuestBundleInitialized();
    await unlockGuestAchievement('first_login');
    await rehydrateSession();
  }, [rehydrateSession]);

  const auth = useMemo(
    () => ({
      signIn,
      signOut,
      enterGuestMode,
      isGuestMode: boot.guest && !boot.token,
      hasToken: boot.token,
    }),
    [signIn, signOut, enterGuestMode, boot.guest, boot.token]
  );

  if (!boot.ready || !fontsReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#4F8CFF' }}>
        <ActivityIndicator size="large" color="#FFD600" />
      </View>
    );
  }

  const stackKey = `${boot.token}-${boot.guest}`;
  const initialRoute = boot.token || boot.guest ? 'MainMenu' : 'Login';

  return (
    <AuthContext.Provider value={auth}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            key={stackKey}
            initialRouteName={initialRoute}
            screenOptions={{ headerShown: false }}
          >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="MainMenu" component={MainMenuScreen} />
          <Stack.Screen name="LessonsList" component={LessonsListScreen} />
          <Stack.Screen name="Sandbox" component={SandboxScreen} />
          <Stack.Screen name="Challenges" component={ChallengesScreen} />
          <Stack.Screen name="Gallery" component={GalleryScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="LessonPlayer" component={LessonPlayerScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="TeacherLogin" component={TeacherLoginScreen} />
          <Stack.Screen name="TeacherRegister" component={TeacherRegisterScreen} />
          <Stack.Screen name="TeacherCabinet" component={TeacherCabinetScreen} />
          <Stack.Screen name="StudentProgress" component={StudentProgressScreen} />
          <Stack.Screen name="StudentRegisterForTeacher" component={StudentRegisterForTeacherScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthContext.Provider>
  );
};

export default App;
