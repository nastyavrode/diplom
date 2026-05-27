import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@cqk_auth_profile';

export async function setAuthProfile({ name, email, avatarUri }) {
  const payload = JSON.stringify({
    name: (name || '').trim(),
    email: (email || '').trim().toLowerCase(),
    avatarUri: avatarUri ?? null,
  });
  await AsyncStorage.setItem(KEY, payload);
}

export async function getAuthProfile() {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return null;
  }
}

export async function clearAuthProfile() {
  await AsyncStorage.removeItem(KEY);
}
