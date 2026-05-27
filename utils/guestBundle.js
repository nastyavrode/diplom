import AsyncStorage from '@react-native-async-storage/async-storage';

const BROWSING_KEY = 'cqk_guest_browsing';
const BUNDLE_KEY = 'cqk_guest_bundle';

export function defaultProgressShape() {
  return {
    completedLessons: [],
    completedChallenges: [],
    stars: 0,
    gallery: [],
    achievements: [],
    lessonStars: {},
    challengeStars: {},
  };
}

export function defaultGuestBundle() {
  return {
    progress: defaultProgressShape(),
    profile: { name: '', avatarUri: null },
  };
}

export async function getGuestBrowsing() {
  return (await AsyncStorage.getItem(BROWSING_KEY)) === '1';
}

export async function setGuestBrowsing(on) {
  if (on) {
    await AsyncStorage.setItem(BROWSING_KEY, '1');
  } else {
    await AsyncStorage.removeItem(BROWSING_KEY);
  }
}

export async function clearGuestBrowsing() {
  await AsyncStorage.removeItem(BROWSING_KEY);
}

export async function getGuestBundle() {
  const raw = await AsyncStorage.getItem(BUNDLE_KEY);
  if (!raw) {
    return defaultGuestBundle();
  }
  try {
    const o = JSON.parse(raw);
    const def = defaultGuestBundle();
    return {
      progress: { ...def.progress, ...(o.progress || {}) },
      profile: { ...def.profile, ...(o.profile || {}) },
    };
  } catch (_e) {
    return defaultGuestBundle();
  }
}

export async function saveGuestBundle(bundle) {
  await AsyncStorage.setItem(BUNDLE_KEY, JSON.stringify(bundle));
}

export async function unlockGuestAchievement(id) {
  const bundle = await getGuestBundle();
  const p = bundle.progress || defaultProgressShape();
  const set = new Set(Array.isArray(p.achievements) ? p.achievements : []);
  if (typeof id === 'string' && id.trim() !== '') {
    set.add(id);
  }
  bundle.progress = {
    ...defaultProgressShape(),
    ...p,
    achievements: Array.from(set),
  };
  await saveGuestBundle(bundle);
}

export async function clearGuestBundle() {
  await AsyncStorage.removeItem(BUNDLE_KEY);
}

export async function ensureGuestBundleInitialized() {
  const raw = await AsyncStorage.getItem(BUNDLE_KEY);
  if (!raw) {
    await saveGuestBundle(defaultGuestBundle());
  }
}

export function guestProgressHasData(progress) {
  const p = progress || {};
  return (
    (Array.isArray(p.completedLessons) && p.completedLessons.length > 0) ||
    (Array.isArray(p.completedChallenges) && p.completedChallenges.length > 0) ||
    (Array.isArray(p.gallery) && p.gallery.length > 0)
  );
}
