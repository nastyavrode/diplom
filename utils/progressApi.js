import { getToken } from './authStorage';
import { API_AUTH_BASE } from './apiBase';
import { fetchWithTimeout } from './httpFetch';

async function authFetch(path, options = {}) {
  const token = await getToken();
  if (!token) {
    throw new Error('Нет токена авторизации');
  }
  const res = await fetchWithTimeout(`${API_AUTH_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Ошибка сервера (${res.status})`);
  }
  return data;
}

export async function fetchServerProgress() {
  const data = await authFetch('/me/progress', { method: 'GET' });
  return data.progress;
}

export async function completeLessonOnServer(lessonId, starsEarned = 3) {
  const data = await authFetch('/me/progress/complete-lesson', {
    method: 'POST',
    body: JSON.stringify({ lessonId, starsEarned }),
  });
  return data.progress;
}

export async function completeChallengeOnServer(challengeId, starsEarned = 1) {
  const data = await authFetch('/me/progress/complete-challenge', {
    method: 'POST',
    body: JSON.stringify({ challengeId, starsEarned }),
  });
  return data.progress;
}

export async function saveGalleryItemOnServer(item) {
  const data = await authFetch('/me/progress/gallery', {
    method: 'POST',
    body: JSON.stringify(item),
  });
  return data.progress;
}

export async function updateGalleryItemOnServer(id, item) {
  const data = await authFetch(`/me/progress/gallery/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  });
  return data;
}

export async function mergeServerProgress(guestProgress) {
  const data = await authFetch('/me/progress/merge', {
    method: 'POST',
    body: JSON.stringify({ progress: guestProgress }),
  });
  return data.progress;
}

export async function patchServerProfile({ name, email }) {
  return authFetch('/me', {
    method: 'PATCH',
    body: JSON.stringify({ name, email }),
  });
}
