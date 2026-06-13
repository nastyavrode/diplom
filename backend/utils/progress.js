function defaultProgress() {
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

function normalizeProgress(p) {
  const base = defaultProgress();
  if (!p || typeof p !== 'object') return base;

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

  const stars = lessonStarsSum > 0 || challengeStarsSum > 0 ? lessonStarsSum + challengeStarsSum : rawStars;
  return {
    completedLessons: Array.isArray(p.completedLessons) ? p.completedLessons : [],
    completedChallenges: Array.isArray(p.completedChallenges) ? p.completedChallenges : [],
    stars,
    gallery: Array.isArray(p.gallery) ? p.gallery : [],
    achievements: Array.isArray(p.achievements) ? p.achievements.filter((x) => typeof x === 'string') : [],
    lessonStars: lessonStarsObj,
    challengeStars: challengeStarsObj,
  };
}

module.exports = { defaultProgress, normalizeProgress };
