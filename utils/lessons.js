import lessonsData from '../assets/lessons.json';

function normalizeSections(data) {
  const sections = Array.isArray(data?.sections) ? data.sections : [];
  return sections
    .filter((s) => s && typeof s === 'object')
    .map((s) => ({
      id: String(s.id || ''),
      title: String(s.title || ''),
      lessons: Array.isArray(s.lessons) ? s.lessons : [],
    }))
    .filter((s) => s.id && s.title);
}

export function getLessonSections() {
  return normalizeSections(lessonsData);
}

export function getAllLessonsFlat() {
  const sections = getLessonSections();
  return sections.flatMap((s) => (Array.isArray(s.lessons) ? s.lessons : []));
}

export function getLessonById(lessonId) {
  const id = String(lessonId || '');
  if (!id) return null;
  const lessons = getAllLessonsFlat();
  return lessons.find((l) => l && typeof l === 'object' && String(l.id || '') === id) || null;
}

