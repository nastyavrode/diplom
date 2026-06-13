import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ScrollView } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import ScreenBackButton from '../components/ScreenBackButton';
import { getCurrentProgress } from '../utils/storage';
import { getLessonSections } from '../utils/lessons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CLOUD_WIDTH = SCREEN_WIDTH * 0.7;
const CLOUD_HEIGHT = CLOUD_WIDTH * 218 / 270;

export default function LessonsListScreen({ navigation }) {
  const [openSections, setOpenSections] = useState(() => ({}));
  const [completedLessons, setCompletedLessons] = useState([]);

  const sections = getLessonSections();

  const toggleSection = (id) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev?.[id] }));
  };

  const openLesson = (lessonId) => {
    navigation.navigate('LessonPlayer', { lessonId });
  };

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
      const progress = await getCurrentProgress();
      setCompletedLessons(progress.completedLessons || []);
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.container}>
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenBackButton navigation={navigation} target="MainMenu" style={{ marginTop: 8 }} />
        <Text style={styles.title}>Выбери урок</Text>
        {sections.map((section, idx) => {
          const isOpen = !!openSections?.[section.id];
          const lessons = Array.isArray(section.lessons) ? section.lessons : [];
          return (
            <View key={section.id} style={{ width: '100%' }}>
              <TouchableOpacity
                style={[styles.sectionTitleBtnBg, styles.sectionTitleBtn]}
                onPress={() => toggleSection(section.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Svg
                  width={24}
                  height={24}
                  viewBox="0 0 24 24"
                  style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
                >
                  <Path d="M8 5v14l11-7z" fill="#fff" />
                </Svg>
              </TouchableOpacity>

              {isOpen && (
                <>
                  {lessons.map((lesson, lessonIdx) => (
                    <TouchableOpacity
                      key={lesson.id}
                      style={[styles.lessonBtn, lessonIdx === 0 ? styles.firstLessonBtn : null]}
                      onPress={() => openLesson(lesson.id)}
                    >
                      <Text style={styles.lessonText}>
                        {lesson.title} {completedLessons.includes(lesson.id) ? '✅' : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {idx < sections.length - 1 && <View style={{ height: 16 }} />}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4F8CFF',
    justifyContent: 'flex-start',
    paddingTop: 32,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 32,
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 32,
    color: '#FFD600',
    fontWeight: 'bold',
    fontFamily: 'aMavickFont',
    marginBottom: 24,
    textAlign: 'center',
  },
  lessonBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 40,
    marginBottom: 18,
    elevation: 2,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  lessonText: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'aMavickFont',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 26,
    color: '#333',
    fontWeight: 'bold',
    fontFamily: 'aMavickFont',
    marginBottom: 0,
    marginTop: 0,
    textAlign: 'left',
    alignSelf: 'flex-start',
    paddingRight: 32,
    flex: 1,
  },
  sectionTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 0,
    marginTop: 0,
    fontFamily: 'aMavickFont',
  },
  sectionTitleBtnBg: {
    backgroundColor: '#FFD600',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginBottom: 12,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    fontFamily: 'aMavickFont',
  },
  firstLessonBtn: {
    marginTop: 14,
  },
  cloud: {
    position: 'absolute',
    zIndex: 0,
  },
}); 