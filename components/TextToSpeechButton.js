import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useTextToSpeech } from '../hooks/useTextToSpeech';

export default function TextToSpeechButton({ text, style }) {
  const { speak, isPlaying, toggle } = useTextToSpeech(text || '');

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.button, isPlaying && styles.buttonActive, style]}
      onPress={toggle}
      activeOpacity={0.7}
      accessibilityLabel={isPlaying ? 'Остановить озвучивание' : 'Озвучить текст'}
      accessibilityRole="button"
    >
      <Text style={[styles.icon, isPlaying && styles.iconActive]}>
        {isPlaying ? '⏹' : '🔊'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  buttonActive: {
    backgroundColor: '#FFD600',
  },
  icon: {
    fontSize: 20,
    lineHeight: 20,
  },
  iconActive: {
    fontSize: 18,
    lineHeight: 18,
  },
});
