import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from './authStorage';
import { setAuthProfile, getAuthProfile } from './authProfile';
import {
  getGuestBrowsing,
  getGuestBundle,
  saveGuestBundle,
  defaultProgressShape,
} from './guestBundle';
import {
  fetchServerProgress,
  completeLessonOnServer,
  completeChallengeOnServer,
  saveGalleryItemOnServer,
  patchServerProfile,
} from './progressApi';

const USERS_KEY = 'cqk_users_db';
const SESSION_KEY = 'cqk_session';

const defaultProgress = () => defaultProgressShape();

function computeAchievementsFromProgress(progress) {
  const p = progress && typeof progress === 'object' ? progress : {};
  const completedLessons = Array.isArray(p.completedLessons) ? p.completedLessons : [];
  const completedChallenges = Array.isArray(p.completedChallenges) ? p.completedChallenges : [];
  const gallery = Array.isArray(p.gallery) ? p.gallery : [];

  const set = new Set(
    Array.isArray(p.achievements) ? p.achievements.filter((x) => typeof x === 'string') : []
  );

  if (completedLessons.length >= 5) set.add('five_lessons');
  if (completedChallenges.length >= 1) set.add('first_challenge');
  if (gallery.length >= 1) set.add('sandbox');
  if (
    gallery.some(
      (g) => g && typeof g === 'object' && typeof g.commandsCount === 'number' && g.commandsCount > 0
    )
  ) {
    set.add('first_algorithm');
  }

  return Array.from(set);
}

function computeTotalStarsFromMaps(progress) {
  const p = progress && typeof progress === 'object' ? progress : {};
  const rawStars = typeof p.stars === 'number' && !Number.isNaN(p.stars) ? p.stars : 0;

  const lessonStarsObj = p.lessonStars && typeof p.lessonStars === 'object' ? p.lessonStars : {};
  const challengeStarsObj = p.challengeStars && typeof p.challengeStars === 'object' ? p.challengeStars : {};

  const lessonStarsSum = Object.values(lessonStarsObj).reduce((sum, v) => {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return sum + v;
    return sum;
  }, 0);
  const challengeStarsSum = Object.values(challengeStarsObj).reduce((sum, v) => {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return sum + v;
    return sum;
  }, 0);

  return lessonStarsSum > 0 || challengeStarsSum > 0 ? lessonStarsSum + challengeStarsSum : rawStars;
}

async function readUsers() {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch (_err) {
    return {};
  }
}

async function writeUsers(users) {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function registerUser({ name, email, password }) {
  const users = await readUsers();
  const normalizedEmail = email.trim().toLowerCase();
  if (users[normalizedEmail]) {
    throw new Error('Пользователь с таким email уже существует');
  }

  users[normalizedEmail] = {
    name: name.trim(),
    email: normalizedEmail,
    password,
    avatarUri: null,
    progress: defaultProgress(),
  };

  await writeUsers(users);
  await AsyncStorage.setItem(SESSION_KEY, normalizedEmail);
  return users[normalizedEmail];
}

export async function loginUser({ email, password }) {
  const users = await readUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users[normalizedEmail];

  if (!user || user.password !== password) {
    throw new Error('Неверный email или пароль');
  }

  await AsyncStorage.setItem(SESSION_KEY, normalizedEmail);
  return user;
}

export async function logoutUser() {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function getCurrentUser() {
  const token = await getToken();
  if (token) {
    const auth = await getAuthProfile();
    if (!auth?.email) {
      return null;
    }
    return {
      name: auth.name || '',
      email: auth.email,
      avatarUri: auth.avatarUri ?? null,
    };
  }

  if (await getGuestBrowsing()) {
    const b = await getGuestBundle();
    return {
      name: (b.profile?.name || '').trim(),
      email: '',
      avatarUri: b.profile?.avatarUri ?? null,
    };
  }

  const sessionEmail = await AsyncStorage.getItem(SESSION_KEY);
  if (!sessionEmail) {
    return null;
  }
  const users = await readUsers();
  return users[sessionEmail] || null;
}

export async function isLoggedIn() {
  const user = await getCurrentUser();
  return Boolean(user);
}

export async function updateCurrentUserProfile({ name, email, avatarUri }) {
  const token = await getToken();
  if (token) {
    const updated = await patchServerProfile({
      name: name.trim(),
      email: email.trim().toLowerCase(),
    });
    const prev = await getAuthProfile();
    await setAuthProfile({
      name: updated.name,
      email: updated.email,
      avatarUri: avatarUri ?? prev?.avatarUri ?? null,
    });
    return {
      name: updated.name,
      email: updated.email,
      avatarUri: avatarUri ?? prev?.avatarUri ?? null,
    };
  }

  if (await getGuestBrowsing()) {
    const b = await getGuestBundle();
    b.profile = {
      name: name.trim(),
      avatarUri: avatarUri ?? b.profile?.avatarUri ?? null,
    };
    await saveGuestBundle(b);
    return {
      name: b.profile.name,
      email: '',
      avatarUri: b.profile.avatarUri,
    };
  }

  const sessionEmail = await AsyncStorage.getItem(SESSION_KEY);
  if (!sessionEmail) {
    throw new Error('Сессия не найдена');
  }

  const users = await readUsers();
  const currentUser = users[sessionEmail];
  if (!currentUser) {
    throw new Error('Пользователь не найден');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== sessionEmail && users[normalizedEmail]) {
    throw new Error('Email уже занят другим пользователем');
  }

  const updatedUser = {
    ...currentUser,
    name: name.trim(),
    email: normalizedEmail,
    avatarUri: avatarUri ?? currentUser.avatarUri ?? null,
  };

  if (normalizedEmail !== sessionEmail) {
    delete users[sessionEmail];
    users[normalizedEmail] = updatedUser;
    await AsyncStorage.setItem(SESSION_KEY, normalizedEmail);
  } else {
    users[sessionEmail] = updatedUser;
  }

  await writeUsers(users);
  return updatedUser;
}

export async function completeLesson(lessonId, starsEarned = 3) {
  const token = await getToken();
  const safeStars = Math.max(1, Math.min(3, Number(starsEarned) || 3));
  if (token) {
    try {
      await completeLessonOnServer(lessonId, safeStars);
    } catch (_e) {
      /* офлайн: тихо пропускаем или можно залогировать */
    }
    return;
  }

  if (await getGuestBrowsing()) {
    const b = await getGuestBundle();
    const completed = new Set(b.progress?.completedLessons || []);
    const lessonStars = b.progress?.lessonStars && typeof b.progress.lessonStars === 'object' ? b.progress.lessonStars : {};
    const hadLesson = completed.has(lessonId);
    completed.add(lessonId);
    const prevStars = typeof lessonStars[lessonId] === 'number' ? lessonStars[lessonId] : 0;
    const nextStars = hadLesson ? Math.max(prevStars, safeStars) : safeStars;
    const delta = hadLesson ? Math.max(0, nextStars - prevStars) : nextStars;
    const next = {
      ...defaultProgress(),
      ...b.progress,
      completedLessons: Array.from(completed),
      stars: (b.progress?.stars || 0) + delta,
      lessonStars: {
        ...lessonStars,
        [lessonId]: nextStars,
      },
    };
    next.achievements = computeAchievementsFromProgress(next);
    b.progress = next;
    await saveGuestBundle(b);
  }
}

export async function completeChallenge(challengeId, starsEarned = 1) {
  const token = await getToken();
  const safeStars = Math.max(1, Math.min(3, Number(starsEarned) || 1));
  if (token) {
    try {
      await completeChallengeOnServer(challengeId, safeStars);
    } catch (_e) {
      /* офлайн */
    }
    return;
  }

  if (await getGuestBrowsing()) {
    const b = await getGuestBundle();
    const completed = new Set(b.progress?.completedChallenges || []);
    const hadChallenge = completed.has(challengeId);
    const challengeStars =
      b.progress?.challengeStars && typeof b.progress.challengeStars === 'object' ? b.progress.challengeStars : {};
    const prevStars =
      typeof challengeStars[challengeId] === 'number'
        ? challengeStars[challengeId]
        : hadChallenge
          ? 1 // совместимость со старой логикой (+1 за первый успех)
          : 0;
    completed.add(challengeId);
    const nextStars = hadChallenge ? Math.max(prevStars, safeStars) : safeStars;
    const delta = hadChallenge ? Math.max(0, nextStars - prevStars) : nextStars;
    const next = {
      ...defaultProgress(),
      ...b.progress,
      completedChallenges: Array.from(completed),
      stars: (b.progress?.stars || 0) + delta,
      challengeStars: {
        ...challengeStars,
        [challengeId]: nextStars,
      },
    };
    next.achievements = computeAchievementsFromProgress(next);
    b.progress = next;
    await saveGuestBundle(b);
  }
}

export async function saveGalleryItem(item) {
  const token = await getToken();
  if (token) {
    try {
      await saveGalleryItemOnServer(item);
    } catch (_e) {
      /* офлайн */
    }
    return;
  }

  if (await getGuestBrowsing()) {
    const b = await getGuestBundle();
    const gallery = b.progress?.gallery || [];
    const nextGallery = [
      {
        id: `${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...item,
      },
      ...gallery,
    ].slice(0, 40);
    const next = {
      ...defaultProgress(),
      ...b.progress,
      gallery: nextGallery,
    };
    next.achievements = computeAchievementsFromProgress(next);
    b.progress = next;
    await saveGuestBundle(b);
  }
}

export async function getCurrentProgress() {
  const token = await getToken();
  if (token) {
    try {
      const p = await fetchServerProgress();
      const merged = { ...defaultProgress(), ...p };
      const stars = computeTotalStarsFromMaps(merged);
      return { ...merged, stars, achievements: computeAchievementsFromProgress(merged) };
    } catch (_e) {
      return defaultProgress();
    }
  }

  if (await getGuestBrowsing()) {
    const b = await getGuestBundle();
    const merged = { ...defaultProgress(), ...b.progress };
    const stars = computeTotalStarsFromMaps(merged);
    return { ...merged, stars, achievements: computeAchievementsFromProgress(merged) };
  }

  const user = await getCurrentUser();
  if (user?.progress) {
    const merged = { ...defaultProgress(), ...user.progress };
    const stars = computeTotalStarsFromMaps(merged);
    return { ...merged, stars, achievements: computeAchievementsFromProgress(merged) };
  }

  return defaultProgress();
}
