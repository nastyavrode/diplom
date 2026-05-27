import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

/**
 * Переход на заданный экран стека (без goBack — без «петель» навигации).
 * @param {string} target — имя маршрута React Navigation, например 'MainMenu' | 'LessonsList'
 * @param {object} [params] — опциональные параметры для navigate
 * @param {'inline'|'overlay'|'embed'} [variant] — inline: строка во всю ширину; overlay: абсолютное позиционирование; embed: только кнопка (вставка в flex-row)
 */
export default function ScreenBackButton({
  navigation,
  target,
  params,
  variant = 'inline',
  overlayStyle,
  style,
}) {
  if (!navigation || !target) return null;

  const go = () => navigation.navigate(target, params);

  const button = (
    <TouchableOpacity
      style={[styles.btn, variant === 'embed' ? style : null]}
      onPress={go}
      accessibilityLabel="Назад"
      accessibilityRole="button"
    >
      <Text style={styles.glyph}>ᐸ</Text>
    </TouchableOpacity>
  );

  if (variant === 'overlay') {
    return (
      <View style={[styles.overlayWrap, overlayStyle]} pointerEvents="box-none">
        {button}
      </View>
    );
  }

  if (variant === 'embed') {
    return button;
  }

  return <View style={[styles.inlineWrap, style]}>{button}</View>;
}

const styles = StyleSheet.create({
  btn: {
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
  glyph: {
    fontSize: 22,
    color: '#333',
    fontWeight: '700',
    marginTop: -1,
  },
  inlineWrap: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 8,
  },
  overlayWrap: {
    position: 'absolute',
    zIndex: 20,
  },
});
