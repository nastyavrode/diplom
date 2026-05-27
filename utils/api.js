// utils/api.js
import { storeToken, getToken, removeToken } from './authStorage';
import { API_AUTH_BASE } from './apiBase';
import { fetchWithTimeout } from './httpFetch';
import { setAuthProfile, clearAuthProfile } from './authProfile';
import {
  getGuestBundle,
  clearGuestBundle,
  clearGuestBrowsing,
  guestProgressHasData,
} from './guestBundle';
import { mergeServerProgress } from './progressApi';

const API_URL = API_AUTH_BASE;

function isUnreachableServerError(err) {
  const msg = (err && err.message) || String(err);
  return (
    err?.name === 'AbortError' ||
    msg.includes('Failed to fetch') ||
    msg.includes('Network request failed') ||
    msg.includes('timed out') ||
    msg.includes('TIMEOUT') ||
    msg.includes('Превышено время') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ENOTFOUND')
  );
}

function wrapNetworkError(err) {
  if (isUnreachableServerError(err)) {
    return new Error(
      'Сервер недоступен.\n' +
        '• Запустите бэкенд (порт 5050).\n' +
        '• В корне Expo (рядом с package.json) в файле .env должна быть одна строка с адресом ПК в Wi‑Fi (часто 192.168…). Не дублируйте переменную — иначе сработает последняя строка. Не используйте IP VPN (например 198.18…), если телефон в обычной сети.\n' +
        '• Перезапустите Expo: npx expo start -c'
    );
  }
  return err instanceof Error ? err : new Error(String(err));
}

async function persistAuthSession(data, { password: _password } = {}) {
  const emailNorm = (data.email || '').trim().toLowerCase();
  const serverName =
    data.name != null && String(data.name).trim() !== '' ? String(data.name).trim() : '';

  await setAuthProfile({
    name: serverName,
    email: emailNorm || '',
  });
}

async function mergeGuestProgressIfAny() {
  await clearGuestBrowsing();
  const bundle = await getGuestBundle();
  const p = bundle.progress;
  if (!guestProgressHasData(p)) {
    await clearGuestBundle();
    return;
  }
  try {
    await mergeServerProgress(p);
    await clearGuestBundle();
  } catch (e) {
    console.warn('Merge guest progress failed:', e);
  }
}

function kickMergeGuestProgress() {
  void mergeGuestProgressIfAny().catch((err) =>
    console.warn('[mergeGuestProgressIfAny]', err)
  );
}

export const login = async (email, password) => {
  try {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[api] login →', `${API_URL}/login`);
    }
    const response = await fetchWithTimeout(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Ошибка входа');
    }

    const data = await response.json();
    const saved = await storeToken(data.token);
    if (!saved) {
      throw new Error('Не удалось сохранить сессию на устройстве.');
    }
    await persistAuthSession(data);
    kickMergeGuestProgress();
    return data;
  } catch (error) {
    throw wrapNetworkError(error);
  }
};

export const register = async ({ name, email, password, role = 'student' }) => {
  try {
    const response = await fetchWithTimeout(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Ошибка регистрации');
    }

    const data = await response.json();
    const saved = await storeToken(data.token);
    if (!saved) {
      throw new Error('Не удалось сохранить сессию на устройстве.');
    }
    await persistAuthSession(data, { password });
    kickMergeGuestProgress();
    return data;
  } catch (error) {
    throw wrapNetworkError(error);
  }
};

export const getAuthToken = async () => {
  return await getToken();
};

export const logout = async () => {
  await removeToken();
  await clearAuthProfile();
};

// --- Teacher API Functions ---

export const fetchTeacherClassStudents = async () => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error('Нет токена авторизации');
    }
    const response = await fetchWithTimeout(`${API_URL}/teacher/class-students`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Ошибка получения списка учеников');
    }

    const data = await response.json();
    return data.students || [];
  } catch (error) {
    throw wrapNetworkError(error);
  }
};

export const fetchStudentProgress = async (studentId) => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error('Нет токена авторизации');
    }
    const response = await fetchWithTimeout(`${API_URL}/teacher/student/${studentId}/progress`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Ошибка получения прогресса');
    }

    return await response.json();
  } catch (error) {
    throw wrapNetworkError(error);
  }
};
