import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Dimensions
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { fetchStudentProgress } from '../utils/api';

export default function StudentProgressScreen({ route, navigation }) {
  const { studentId, studentName } = route.params;
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const { width: SCREEN_WIDTH } = Dimensions.get('window');

  useEffect(() => {
    loadStudentProgress();
  }, [studentId]);

  const loadStudentProgress = async () => {
    try {
      setLoading(true);
      const data = await fetchStudentProgress(studentId);
      setProgress(data.progress);
    } catch (error) {
      console.error('Error loading student progress:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось загрузить прогресс');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4F8CFF" />
      </SafeAreaView>
    );
  }

  if (!progress) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Не удалось загрузить данные</Text>
      </SafeAreaView>
    );
  }

  const completionPercentage = {
    lessons: Math.round((progress.completedLessons.length / 10) * 100),
    challenges: Math.round((progress.completedChallenges.length / 20) * 100),
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path
              d="M15 6l-6 6 6 6"
              stroke="#4F8CFF"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{studentName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Статистика */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{progress.stars}</Text>
            <Text style={styles.statLabel}>Звёзд</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{progress.completedLessons.length}</Text>
            <Text style={styles.statLabel}>Уроков</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{progress.completedChallenges.length}</Text>
            <Text style={styles.statLabel}>Челленджей</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{progress.achievements.length}</Text>
            <Text style={styles.statLabel}>Наград</Text>
          </View>
        </View>

        {/* Прогресс по урокам */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Прогресс по урокам</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${completionPercentage.lessons}%`,
                  backgroundColor: '#4CAF50',
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {progress.completedLessons.length} из ~10 уроков
          </Text>
          {progress.completedLessons.length > 0 && (
            <Text style={styles.lessonList}>
              Завершённые уроки: {progress.completedLessons.join(', ')}
            </Text>
          )}
        </View>

        {/* Прогресс по челленджам */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Прогресс по челленджам</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${completionPercentage.challenges}%`,
                  backgroundColor: '#FFA726',
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {progress.completedChallenges.length} из ~20 челленджей
          </Text>
          {progress.completedChallenges.length > 0 && (
            <Text style={styles.lessonList}>
              Завершённые челленджи: {progress.completedChallenges.join(', ')}
            </Text>
          )}
        </View>

        {/* Звёзды по урокам */}
        {Object.keys(progress.lessonStars).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Звёзды по урокам</Text>
            {Object.entries(progress.lessonStars).map(([lessonId, stars]) => (
              <View key={lessonId} style={styles.starRow}>
                <Text style={styles.starLabel}>Урок {lessonId}</Text>
                <Text style={styles.starValue}>{'★'.repeat(stars)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Звёзды по челленджам */}
        {Object.keys(progress.challengeStars).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Звёзды по челленджам</Text>
            {Object.entries(progress.challengeStars).map(([challengeId, stars]) => (
              <View key={challengeId} style={styles.starRow}>
                <Text style={styles.starLabel}>Челлендж {challengeId}</Text>
                <Text style={styles.starValue}>{'★'.repeat(stars)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Достижения */}
        {progress.achievements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Достижения</Text>
            {progress.achievements.map((achievement) => (
              <View key={achievement} style={styles.achievementBadge}>
                <Svg width={20} height={20} viewBox="0 0 24 24" style={{ marginRight: 8 }}>
                  <Path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    fill="#FFD600"
                  />
                </Svg>
                <Text style={styles.achievementText}>{getAchievementName(achievement)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Рисунки из галереи */}
        {progress.gallery.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Работы в галерее ({progress.gallery.length})</Text>
            <Text style={styles.galleryInfo}>Ученик создал {progress.gallery.length} работ в песочнице</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={loadStudentProgress}
      >
        <Svg width={24} height={24} viewBox="0 0 24 24">
          <Path
            d="M4 12a8 8 0 018-8v4m0-4a8 8 0 100 16v-4m0 4a8 8 0 00-8-8"
            stroke="#fff"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function getAchievementName(id) {
  const names = {
    first_login: 'Первый вход',
    five_lessons: 'Пять уроков пройдено',
    sandbox: 'Первое творение',
    first_challenge: 'Первый челлендж',
    first_algorithm: 'Первый алгоритм',
  };
  return names[id] || id;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 80,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4F8CFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  lessonList: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  starLabel: {
    fontSize: 13,
    color: '#333',
  },
  starValue: {
    fontSize: 16,
    color: '#FFD600',
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffef0',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD600',
  },
  achievementText: {
    fontSize: 13,
    color: '#333',
  },
  galleryInfo: {
    fontSize: 13,
    color: '#666',
  },
  refreshButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F8CFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  errorText: {
    fontSize: 16,
    color: '#333',
  },
});
