import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ScrollView, Platform } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { getCurrentUser } from '../utils/storage';
import { useAuth } from '../context/AuthContext';
import { getAuthProfile } from '../utils/authProfile';

export default function MainMenuScreen({ navigation }) {
  const { signOut, isGuestMode } = useAuth();
  const [userName, setUserName] = React.useState('');
  // Получаем размеры экрана
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const CLOUD_WIDTH = SCREEN_WIDTH * 0.7;
  const CLOUD_HEIGHT = CLOUD_WIDTH * 218 / 270;

  // Анимация для облаков
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

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      const auth = await getAuthProfile();
      const user = await getCurrentUser();
      const name = (auth?.name || user?.name || '').trim();
      setUserName(name || (isGuestMode ? 'Гость' : ''));
    });
    return unsubscribe;
  }, [navigation, isGuestMode]);

  // Динамический отступ сверху
  const dynamicPaddingTop = SCREEN_HEIGHT < 700 ? 24 : 48;
  // Динамический размер заголовка
  const dynamicTitleFontSize = SCREEN_HEIGHT < 700 ? 34 : 50;
  const dynamicTitleLineHeight = SCREEN_HEIGHT < 700 ? 38 : 54;

  return (
    <View style={{ flex: 1, backgroundColor: '#4F8CFF' }}>
      {/* Анимированные облака */}
      <Animated.View style={[styles.cloud, { top: 100, left: 0, opacity: 0.4, width: CLOUD_WIDTH, height: CLOUD_HEIGHT, transform: [{ translateX: cloud1 }] }]}> 
        <Svg width="100%" height="100%" viewBox="0 0 270 218">
          <Path opacity={0.2} d="M215.238 91.1967C211.571 75.7343 201.566 61.8108 186.931 51.8045C172.297 41.7982 153.942 36.3298 135 36.3333C103.451 36.3333 76.05 51.23 62.4042 73.03C46.3592 74.4727 31.521 80.7982 20.7406 90.7908C9.96018 100.784 3.99813 113.739 4 127.167C4 157.233 33.3658 181.667 69.5 181.667H211.417C241.547 181.667 266 161.32 266 136.25C266 112.27 243.621 92.8317 215.238 91.1967Z" fill="#fff" />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.cloud, { top: 300, left: 0, opacity: 0.5, width: CLOUD_WIDTH, height: CLOUD_HEIGHT, transform: [{ translateX: cloud2 }] }]}> 
        <Svg width="100%" height="100%" viewBox="0 0 270 218">
          <Path opacity={0.2} d="M262 128.425C262.001 120.796 258.648 113.388 252.478 107.387C246.309 101.386 237.68 97.1384 227.973 95.325C227.571 83.2037 220.984 71.6815 209.614 63.2146C198.244 54.7477 182.991 50.0059 167.107 50C157.898 49.995 148.809 51.588 140.525 54.6587C132.242 57.7294 124.981 62.1974 119.292 67.725C114.662 63.1859 108.199 59.9403 100.906 58.4917C93.6127 57.0432 85.8971 57.4727 78.9563 59.7137C72.0156 61.9547 66.2379 65.8818 62.5198 70.8856C58.8017 75.8894 57.3512 81.6901 58.3933 87.3875C51.2498 86.4011 43.9098 86.6241 36.8916 88.0407C29.8735 89.4573 23.3484 92.0331 17.7774 95.5859C12.2063 99.1388 7.7252 103.582 4.65056 108.602C1.57593 113.622 -0.017232 119.096 -0.0163723 124.638C-0.0120396 134.674 5.21054 144.299 14.5043 151.398C23.7981 158.497 36.4031 162.49 49.5508 162.5H217.46C229.28 162.48 240.607 158.881 248.955 152.492C257.302 146.104 262.004 137.448 262 128.425Z" fill="#fff" />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.cloud, { bottom: 100, left: 0, opacity: 0.3, width: CLOUD_WIDTH, height: CLOUD_HEIGHT, transform: [{ translateX: cloud3 }] }]}> 
        <Svg width="100%" height="100%" viewBox="0 0 270 218">
          <Path opacity={0.2} d="M215.238 91.1967C211.571 75.7343 201.566 61.8108 186.931 51.8045C172.297 41.7982 153.942 36.3298 135 36.3333C103.451 36.3333 76.05 51.23 62.4042 73.03C46.3592 74.4727 31.521 80.7982 20.7406 90.7908C9.96018 100.784 3.99813 113.739 4 127.167C4 157.233 33.3658 181.667 69.5 181.667H211.417C241.547 181.667 266 161.32 266 136.25C266 112.27 243.621 92.8317 215.238 91.1967Z" fill="#fff" />
        </Svg>
      </Animated.View>
      <ScrollView contentContainerStyle={[styles.scrollContent, {paddingTop: dynamicPaddingTop, paddingHorizontal: 16, alignItems: 'center'}]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { fontSize: dynamicTitleFontSize, lineHeight: dynamicTitleLineHeight }]}>CODEQUEST{"\n"}KIDS</Text>
        {userName ? <Text style={styles.greeting}>Привет, {userName}!</Text> : null}
        <TouchableOpacity style={styles.lessonButton} onPress={() => navigation.navigate('LessonsList')}>
          <Svg width={32} height={32} viewBox="0 0 32 32" style={{ marginRight: 12 }}>
            <Path d="M28.5453 12.4707C29.1857 12.8112 29.7214 13.3196 30.0949 13.9413C30.4685 14.563 30.6658 15.2747 30.6658 16C30.6658 16.7253 30.4685 17.437 30.0949 18.0587C29.7214 18.6804 29.1857 19.1888 28.5453 19.5293L11.4627 28.8187C8.71199 30.316 5.33333 28.3693 5.33333 25.2907V6.71067C5.33333 3.63067 8.71199 1.68534 11.4627 3.18L28.5453 12.4707Z" fill="white"/>
          </Svg>
          <Text style={styles.buttonText}>Уроки</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sandboxButton} onPress={() => navigation.navigate('Sandbox')}>
          <Svg width={32} height={32} viewBox="0 0 32 32" style={{ marginRight: 12 }}>
            <Path d="M25.226 2.516C25.8165 2.12044 26.526 1.94202 27.2334 2.01119C27.9407 2.08036 28.6022 2.39283 29.1049 2.89529C29.6076 3.39775 29.9204 4.05907 29.9899 4.76641C30.0594 5.47376 29.8813 6.18331 29.486 6.774L25.676 12.486C23.9318 15.1024 21.4554 17.1469 18.556 18.364C18.158 17.2271 17.5091 16.1944 16.6573 15.3427C15.8056 14.4909 14.7729 13.842 13.636 13.444C14.8537 10.5444 16.8989 8.06787 19.516 6.324L25.226 2.516ZM11 16C9.67392 16 8.40215 16.5268 7.46447 17.4645C6.52679 18.4021 6.00001 19.6739 6.00001 21C6.00025 21.1662 5.95909 21.3298 5.88023 21.476C5.80137 21.6223 5.68731 21.7466 5.54835 21.8377C5.40939 21.9289 5.24992 21.9839 5.08434 21.9979C4.91876 22.0119 4.7523 21.9845 4.60001 21.918C4.32143 21.7957 4.01223 21.7609 3.71345 21.8184C3.41467 21.8759 3.14044 22.0229 2.92714 22.2399C2.71385 22.4568 2.57159 22.7336 2.51923 23.0333C2.46688 23.333 2.50691 23.6416 2.63401 23.918C3.29869 25.3716 4.44082 26.5539 5.87054 27.2685C7.30027 27.9831 8.93148 28.1868 10.493 27.8459C12.0546 27.505 13.4525 26.6399 14.4543 25.3945C15.4562 24.1491 16.0016 22.5983 16 21C16 19.6739 15.4732 18.4021 14.5355 17.4645C13.5979 16.5268 12.3261 16 11 16Z" fill="white"/>
          </Svg>
          <Text style={styles.buttonText}>Песочница</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.challengeButton} onPress={() => navigation.navigate('Challenges')}>
          <Svg width={32} height={32} viewBox="0 0 32 32" style={{ marginRight: 12 }}>
            <Path d="M16 4L20 12L28 13L22 19L23.5 27L16 23L8.5 27L10 19L4 13L12 12L16 4Z" fill="#fff" />
          </Svg>
          <Text style={styles.buttonText}>Челленджи</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.galleryButton} onPress={() => navigation.navigate('Gallery')}>
          <Svg width={32} height={32} viewBox="0 0 32 32" style={{ marginRight: 12 }}>
            <Path d="M11.7507 15.4827C12.36 14.976 12.9747 14.976 13.5987 15.4973L13.7427 15.628L20.3907 22.276L20.516 22.3867C20.7726 22.5855 21.0928 22.684 21.4168 22.6635C21.7408 22.6431 22.0461 22.5052 22.2757 22.2756C22.5052 22.0461 22.6431 21.7407 22.6635 21.4168C22.684 21.0928 22.5855 20.7725 22.3867 20.516L22.276 20.3907L20.5533 18.6667L20.9427 18.276L21.084 18.1493C21.6933 17.6427 22.308 17.6427 22.932 18.164L23.076 18.2947L29.308 24.528C29.1818 25.7977 28.6045 26.9801 27.681 27.8605C26.7575 28.741 25.5489 29.2611 24.2747 29.3267L24 29.3333H8C6.67722 29.3332 5.40166 28.8416 4.42102 27.9538C3.44037 27.0661 2.82463 25.8456 2.69334 24.5293L11.6093 15.6093L11.7507 15.4827ZM24 2.66666C25.3683 2.66666 26.6843 3.19257 27.6758 4.13562C28.6672 5.07867 29.2583 6.36671 29.3267 7.73332L29.3333 7.99999V20.78L24.9427 16.3907L24.7427 16.208C23.068 14.748 20.9427 14.7453 19.2813 16.1853L19.076 16.372L18.6667 16.78L15.6093 13.724L15.4093 13.5413C13.7347 12.0813 11.6093 12.0787 9.948 13.5187L9.74267 13.7053L2.66667 20.78V7.99999C2.66667 6.63167 3.19259 5.31569 4.13564 4.32424C5.07869 3.3328 6.36673 2.74174 7.73334 2.67332L8 2.66666H24ZM20.0133 9.33332L19.844 9.34266C19.5199 9.3812 19.2213 9.53726 19.0046 9.78128C18.7878 10.0253 18.6682 10.3403 18.6682 10.6667C18.6682 10.993 18.7878 11.308 19.0046 11.552C19.2213 11.796 19.5199 11.9521 19.844 11.9907L20 12L20.1693 11.9907C20.4934 11.9521 20.7921 11.796 21.0088 11.552C21.2255 11.308 21.3452 10.993 21.3452 10.6667C21.3452 10.3403 21.2255 10.0253 21.0088 9.78128C20.7921 9.53726 20.4934 9.3812 20.1693 9.34266L20.0133 9.33332Z" fill="white"/>
          </Svg>
          <Text style={styles.buttonText}>Галерея</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
          <Svg width={32} height={32} viewBox="0 0 32 32" style={{ marginRight: 12 }}>
            <Path d="M16 16c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6 2.686 6 6 6zm0 2c-4.418 0-8 2.239-8 5v3h16v-3c0-2.761-3.582-5-8-5z" fill="#fff" />
          </Svg>
          <Text style={styles.buttonText}>Профиль</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={isGuestMode ? styles.loginButton : styles.exitButton}
          onPress={
            isGuestMode
              ? () => navigation.navigate('Login')
              : async () => {
                  await signOut();
                }
          }
        >
          <Svg
            width={32}
            height={32}
            viewBox="0 0 32 32"
            style={[{ marginRight: 12 }, isGuestMode ? { transform: [{ scaleX: -1 }] } : null]}
          >
            <Path d="M10.6667 4C11.0065 4.00038 11.3334 4.13051 11.5805 4.3638C11.8276 4.59709 11.9763 4.91594 11.9962 5.25519C12.0161 5.59445 11.9058 5.92851 11.6876 6.18911C11.4695 6.44971 11.1601 6.6172 10.8227 6.65733L10.6667 6.66667H3.99998C3.67341 6.66671 3.3582 6.78661 3.11416 7.00362C2.87011 7.22063 2.71419 7.51967 2.67598 7.844L2.66665 8V24C2.66669 24.3266 2.78659 24.6418 3.0036 24.8858C3.22062 25.1299 3.51965 25.2858 3.84398 25.324L3.99998 25.3333H9.99999C10.3398 25.3337 10.6667 25.4638 10.9138 25.6971C11.1609 25.9304 11.3096 26.2493 11.3295 26.5885C11.3495 26.9278 11.2391 27.2618 11.021 27.5224C10.8028 27.783 10.4934 27.9505 10.156 27.9907L9.99999 28H3.99998C2.9797 28.0001 1.99796 27.6102 1.25564 26.9103C0.513309 26.2103 0.0665081 25.2532 0.00665157 24.2347L-1.52526e-05 24V8C-7.20878e-05 6.97972 0.389752 5.99798 1.0897 5.25565C1.78964 4.51332 2.74679 4.06652 3.76532 4.00667L3.99998 4H10.6667ZM18.276 11.2853L22.0467 15.0573C22.2966 15.3074 22.437 15.6464 22.437 16C22.437 16.3536 22.2966 16.6926 22.0467 16.9427L18.276 20.7147C18.0258 20.9647 17.6865 21.1051 17.3328 21.1049C16.9792 21.1048 16.64 20.9642 16.39 20.714C16.14 20.4638 15.9996 20.1246 15.9997 19.7709C15.9998 19.4172 16.1405 19.078 16.3907 18.828L17.8853 17.3333H10.6667C10.313 17.3333 9.97389 17.1929 9.72384 16.9428C9.47379 16.6928 9.33332 16.3536 9.33332 16C9.33332 15.6464 9.47379 15.3072 9.72384 15.0572C9.97389 14.8071 10.313 14.6667 10.6667 14.6667H17.8853L16.3907 13.172C16.1405 12.922 15.9998 12.5828 15.9997 12.2291C15.9996 11.8754 16.14 11.5362 16.39 11.286C16.64 11.0358 16.9792 10.8952 17.3328 10.8951C17.6865 10.8949 18.0258 11.0353 18.276 11.2853Z" fill="white"/>
          </Svg>
          <Text style={styles.buttonText}>{isGuestMode ? 'Войти' : 'Выйти'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  scrollContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
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
    fontSize: 20,
    fontFamily: 'aMavickFont',
    marginBottom: 8,
  },
  lessonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    width: '100%',
    maxWidth: 320,
    borderRadius: 28,
    paddingVertical: 20,
    marginBottom: 16,
    marginTop: 8,
    elevation: 2,
  },
  sandboxButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A3E635',
    width: '100%',
    maxWidth: 320,
    borderRadius: 28,
    paddingVertical: 20,
    marginBottom: 16,
    marginTop: 8,
    elevation: 2,
  },
  challengeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFA726',
    width: '100%',
    maxWidth: 320,
    borderRadius: 28,
    paddingVertical: 20,
    marginBottom: 16,
    marginTop: 8,
    elevation: 2,
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C4DFF',
    width: '100%',
    maxWidth: 320,
    borderRadius: 28,
    paddingVertical: 20,
    marginBottom: 16,
    marginTop: 8,
    elevation: 2,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B8D4',
    width: '100%',
    maxWidth: 320,
    borderRadius: 28,
    paddingVertical: 20,
    marginBottom: 16,
    marginTop: 8,
    elevation: 2,
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
    marginBottom: 16,
    marginTop: 8,
    elevation: 2,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976D2',
    width: '100%',
    maxWidth: 320,
    borderRadius: 28,
    paddingVertical: 20,
    marginBottom: 16,
    marginTop: 8,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    fontFamily: 'aMavickFont',
  },
  cloud: {
    position: 'absolute',
    zIndex: 0,
  },
}); 