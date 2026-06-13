import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import ScreenBackButton from '../components/ScreenBackButton';
import { getCurrentProgress } from '../utils/storage';

export default function GalleryScreen({ navigation }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      const progress = await getCurrentProgress();
      setItems(progress.gallery || []);
    });
    return unsubscribe;
  }, [navigation]);

  const openProject = (item) => {
    if (!item?.id) {
      return;
    }
    navigation.navigate('Sandbox', { projectId: String(item.id) });
  };

  return (
    <View style={[styles.container, { position: 'relative' }]}>
      <ScreenBackButton
        navigation={navigation}
        target="MainMenu"
        variant="overlay"
        overlayStyle={{ top: 48, left: 16 }}
      />
      <Text style={styles.title}>Галерея</Text>
      <Text style={styles.subtitle}>Сохраненные работы из песочницы</Text>

      <ScrollView contentContainerStyle={styles.grid}>
        {items.length === 0 ? (
          <Text style={styles.empty}>Пока пусто. Сохрани любую работу из песочницы.</Text>
        ) : (
          items.map((item) => {
            const stamp = item.updatedAt || item.createdAt;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => openProject(item)}
              >
                <Text style={styles.cardTitle}>{item.title || 'Работа'}</Text>
                <Text style={styles.cardText}>Поле: {item.size}x{item.size}</Text>
                <Text style={styles.cardText}>Команд: {item.commandsCount}</Text>
                <Text style={styles.cardText}>Препятствий: {item.obstaclesCount}</Text>
                <Text style={styles.cardDate}>
                  {stamp
                    ? `${new Date(stamp).toLocaleDateString()} ${new Date(stamp).toLocaleTimeString()}`
                    : '—'}
                </Text>
                {!Array.isArray(item.program) ? (
                  <Text style={styles.cardLegacy}>Только просмотр метаданных (старый формат)</Text>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4F8CFF',
    paddingTop: 92,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 34,
    color: '#FFD600',
    fontFamily: 'aMavickFont',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    color: '#fff',
    fontFamily: 'aMavickFont',
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 18,
  },
  grid: {
    paddingBottom: 20,
    gap: 10,
  },
  empty: {
    color: '#fff',
    fontFamily: 'aMavickFont',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    backgroundColor: '#fffbe8',
    borderRadius: 16,
    padding: 14,
  },
  cardTitle: {
    fontFamily: 'aMavickFont',
    color: '#333',
    fontSize: 20,
    marginBottom: 6,
  },
  cardText: {
    fontFamily: 'aMavickFont',
    color: '#555',
    fontSize: 16,
  },
  cardDate: {
    marginTop: 6,
    fontFamily: 'aMavickFont',
    color: '#777',
    fontSize: 14,
  },
  cardLegacy: {
    marginTop: 8,
    fontFamily: 'aMavickFont',
    color: '#E53935',
    fontSize: 14,
  },
});
