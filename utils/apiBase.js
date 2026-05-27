import { Platform } from 'react-native';

/**
 * Базовый URL auth API (должен оканчиваться на /api/auth).
 *
 * Для реального телефона в той же Wi‑Fi сети задайте в корне проекта .env:
 *   EXPO_PUBLIC_API_URL=http://ВАШ_IP_КОМПЬЮТЕРА:5050/api/auth
 * (узнать IP: ifconfig / ipconfig; на Mac часто en0.)
 *
 * По умолчанию: web и iOS Simulator → 127.0.0.1; эмулятор Android → 10.0.2.2 (хост ПК).
 */
function trimTrailingSlashes(url) {
  return url.replace(/\/+$/, '');
}

function inferDevBase() {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5050/api/auth';
  }
  return 'http://127.0.0.1:5050/api/auth';
}

const fromEnv =
  typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL
    ? String(process.env.EXPO_PUBLIC_API_URL).trim()
    : '';

export const API_AUTH_BASE = trimTrailingSlashes(fromEnv || inferDevBase());

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  // В терминале Metro при старте приложения видно, какой URL реально попал в сборку.
  // eslint-disable-next-line no-console
  console.log('[apiBase]', fromEnv ? 'EXPO_PUBLIC_API_URL из .env' : 'без .env (localhost/эмулятор)', '→', API_AUTH_BASE);
}
