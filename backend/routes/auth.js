const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const { sendPasswordResetEmail } = require('../utils/mail');
const { authenticateToken } = require('../middleware/authenticate');
const crypto = require('crypto');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

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

const ACHIEVEMENT_IDS = Object.freeze({
  FIRST_LOGIN: 'first_login',
  FIVE_LESSONS: 'five_lessons',
  SANDBOX: 'sandbox',
  FIRST_CHALLENGE: 'first_challenge',
  FIRST_ALGORITHM: 'first_algorithm',
});

function grantAchievements(progress, { event, galleryItem } = {}) {
  const p = normalizeProgress(progress);
  const set = new Set(p.achievements || []);
  const newlyUnlocked = [];

  function unlock(id) {
    if (set.has(id)) return;
    set.add(id);
    newlyUnlocked.push(id);
  }

  if (event === 'login') {
    unlock(ACHIEVEMENT_IDS.FIRST_LOGIN);
  }

  if ((p.completedLessons?.length || 0) >= 5) {
    unlock(ACHIEVEMENT_IDS.FIVE_LESSONS);
  }

  if ((p.completedChallenges?.length || 0) >= 1) {
    unlock(ACHIEVEMENT_IDS.FIRST_CHALLENGE);
  }

  if ((p.gallery?.length || 0) >= 1) {
    unlock(ACHIEVEMENT_IDS.SANDBOX);
  }

  const commandsCount =
    galleryItem && typeof galleryItem === 'object' && typeof galleryItem.commandsCount === 'number'
      ? galleryItem.commandsCount
      : null;
  const galleryHasCommands =
    Array.isArray(p.gallery) &&
    p.gallery.some(
      (g) => g && typeof g === 'object' && typeof g.commandsCount === 'number' && g.commandsCount > 0
    );
  if ((commandsCount != null && commandsCount > 0) || galleryHasCommands) {
    unlock(ACHIEVEMENT_IDS.FIRST_ALGORITHM);
  }

  p.achievements = Array.from(set);
  return { progress: p, newlyUnlocked };
}

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const nameTrim = (name || '').trim();
    const roleTrim = (role || 'student').toLowerCase();

    if (!nameTrim) {
      return res.status(400).json({ error: 'Укажите имя' });
    }
    if (nameTrim.length < 2) {
      return res.status(400).json({ error: 'Имя должно быть не короче 2 символов' });
    }
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Некорректный формат email' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }
    if (!['student', 'teacher'].includes(roleTrim)) {
      return res.status(400).json({ error: 'Неверная роль' });
    }

    const emailNorm = String(email).trim().toLowerCase();

    // Проверка на существующего пользователя
    const existingUser = await User.findOne({ email: emailNorm });
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const user = new User({
      name: nameTrim,
      email: emailNorm,
      password,
      role: roleTrim,
      classId: 'default-class'
    });
    await user.save();

    // На регистрацию не выдаём "первый вход": это именно за логин.
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      userId: user._id,
      email: user.email,
      name: user.name || nameTrim,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при регистрации' });
  }
});

// Вход
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Валидация email и пароля
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Некорректный формат email' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }

    const emailNorm = email.trim().toLowerCase();
    const user = await User.findOne({ email: emailNorm });
    if (!user) {
      return res.status(400).json({ error: 'Неверные учётные данные' });
    }

    // Проверка пароля
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Неверные учётные данные' });
    }

    const plain = typeof user.toObject === 'function' ? user.toObject() : user;
    const displayName = (plain.name && String(plain.name).trim()) || '';

    // Выдача наград за вход (один раз).
    const { progress: nextProgress } = grantAchievements(user.progress, { event: 'login' });
    // Не делаем лишний save, если ничего не изменилось.
    const had = Array.isArray(user.progress?.achievements) ? user.progress.achievements : [];
    const now = Array.isArray(nextProgress.achievements) ? nextProgress.achievements : [];
    if (had.length !== now.length) {
      user.progress = { ...normalizeProgress(user.progress), achievements: now };
      await user.save();
    }

    // Генерация токена
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      userId: user._id,
      email: user.email,
      name: displayName,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при входе' });
  }
});

// Запрос на восстановление пароля
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email обязателен' });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: emailNorm });
    if (!user) {
      // Даже если пользователь не найден — возвращаем успех (для безопасности)
      return res.json({ message: 'Если аккаунт существует, письмо отправлено' });
    }

    // Генерация временного пароля
    const tempPassword = crypto.randomBytes(3).toString('hex'); // 6 символов
    user.password = tempPassword; // pre-save хеширует пароль
    await user.save();

    // Отправка письма с временным паролем
    const mailOptions = {
      from: `"CodeQuest Kids" <${process.env.EMAIL_USER}>`,
      to: emailNorm,
      subject: 'Восстановление доступа к аккаунту',
      html: `<p>Здравствуйте,</p>
             <p>Ваш временный пароль: <strong>${tempPassword}</strong></p>
             <p>Вы можете войти с этим паролем и изменить его в профиле.</p>`
    };
    await sendPasswordResetEmail(emailNorm, null, mailOptions);

    res.json({ message: 'Если аккаунт существует, письмо отправлено' });
  } catch (error) {
    console.error('Ошибка при отправке письма:', error);
    res.status(500).json({ error: 'Не удалось обработать запрос' });
  }
});

// Страница сброса пароля
// Удаление маршрутов reset-password, так как они больше не нужны
// GET /reset-password — удаляем
// POST /reset-password — удаляем


// Смена пароля
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Текущий и новый пароли обязательны' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Новый пароль должен быть не менее 6 символов' });
    }

    // Получаем userId из JWT (предполагается, что пользователь авторизован)
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Неавторизован' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Проверка текущего пароля
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Неверный текущий пароль' });
    }

    // Устанавливаем новый пароль (хешируется в pre-save)
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Пароль успешно изменён' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при смене пароля' });
  }
});

// --- Профиль и прогресс (только с JWT) ---

router.get('/me/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json({ progress: normalizeProgress(user.progress) });
  } catch (_e) {
    res.status(500).json({ error: 'Не удалось загрузить прогресс' });
  }
});

router.patch('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const { name, email } = req.body;
    if (name != null) {
      const nameTrim = String(name).trim();
      if (nameTrim.length < 2) {
        return res.status(400).json({ error: 'Имя должно быть не короче 2 символов' });
      }
      user.name = nameTrim;
    }
    if (email != null) {
      const emailNorm = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
        return res.status(400).json({ error: 'Некорректный формат email' });
      }
      if (emailNorm !== user.email) {
        const taken = await User.findOne({ email: emailNorm, _id: { $ne: user._id } });
        if (taken) {
          return res.status(400).json({ error: 'Этот email уже занят' });
        }
        user.email = emailNorm;
      }
    }

    await user.save();
    res.json({
      name: user.name || '',
      email: user.email,
    });
  } catch (_e) {
    res.status(500).json({ error: 'Не удалось сохранить профиль' });
  }
});

router.post('/me/progress/complete-lesson', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { lessonId, starsEarned } = req.body;
    if (!lessonId || typeof lessonId !== 'string') {
      return res.status(400).json({ error: 'Укажите lessonId' });
    }
    const safeStars = Number(starsEarned);
    if (!Number.isInteger(safeStars) || safeStars < 1 || safeStars > 3) {
      return res.status(400).json({ error: 'starsEarned должен быть числом 1..3' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    const p = normalizeProgress(user.progress);
    const had = new Set(p.completedLessons).has(lessonId);
    const completed = new Set(p.completedLessons);
    completed.add(lessonId);
    p.completedLessons = Array.from(completed);
    const prevLessonStars =
      p.lessonStars && typeof p.lessonStars === 'object' && typeof p.lessonStars[lessonId] === 'number'
        ? p.lessonStars[lessonId]
        : 0;
    const nextLessonStars = had ? Math.max(prevLessonStars, safeStars) : safeStars;
    const delta = nextLessonStars - prevLessonStars;
    if (delta > 0) {
      p.stars = (p.stars || 0) + delta;
    }
    p.lessonStars = {
      ...(p.lessonStars || {}),
      [lessonId]: nextLessonStars,
    };
    const granted = grantAchievements(p, { event: 'complete_lesson' });
    user.progress = granted.progress;
    await user.save();
    res.json({ progress: user.progress });
  } catch (_e) {
    res.status(500).json({ error: 'Не удалось сохранить урок' });
  }
});

router.post('/me/progress/complete-challenge', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { challengeId, starsEarned } = req.body;
    if (!challengeId || typeof challengeId !== 'string') {
      return res.status(400).json({ error: 'Укажите challengeId' });
    }
    const safeStars = Number(starsEarned);
    if (!Number.isInteger(safeStars) || safeStars < 1 || safeStars > 3) {
      return res.status(400).json({ error: 'starsEarned должен быть числом 1..3' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    const p = normalizeProgress(user.progress);
    const completed = new Set(p.completedChallenges);
    const had = completed.has(challengeId);
    completed.add(challengeId);
    p.completedChallenges = Array.from(completed);
    const prevChallengeStars =
      p.challengeStars && typeof p.challengeStars === 'object' && typeof p.challengeStars[challengeId] === 'number'
        ? p.challengeStars[challengeId]
        : had
          ? 1 // совместимость со старой логикой: раньше +1 за первый успех
          : 0;
    const nextChallengeStars = had ? Math.max(prevChallengeStars, safeStars) : safeStars;
    const delta = nextChallengeStars - prevChallengeStars;
    if (delta > 0) {
      p.stars = (p.stars || 0) + delta;
    }
    p.challengeStars = {
      ...(p.challengeStars || {}),
      [challengeId]: nextChallengeStars,
    };
    const granted = grantAchievements(p, { event: 'complete_challenge' });
    user.progress = granted.progress;
    await user.save();
    res.json({ progress: user.progress });
  } catch (_e) {
    res.status(500).json({ error: 'Не удалось сохранить челлендж' });
  }
});

router.post('/me/progress/gallery', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const item = req.body && typeof req.body === 'object' ? req.body : {};
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    const p = normalizeProgress(user.progress);
    const gallery = p.gallery || [];
    const entry = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...item,
    };
    p.gallery = [entry, ...gallery].slice(0, 40);
    const granted = grantAchievements(p, { event: 'save_gallery', galleryItem: item });
    user.progress = granted.progress;
    await user.save();
    res.json({ progress: user.progress });
  } catch (_e) {
    res.status(500).json({ error: 'Не удалось сохранить в галерею' });
  }
});

router.post('/me/progress/merge', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const guestP = normalizeProgress(req.body?.progress);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    const serverP = normalizeProgress(user.progress);

    const lessons = [...new Set([...serverP.completedLessons, ...guestP.completedLessons])];
    const mergedChallenges = new Set(serverP.completedChallenges);
    for (const id of guestP.completedChallenges) {
      mergedChallenges.add(id);
    }

    const sch = mergedChallenges;

    let stars = serverP.stars || 0;
    const mergedLessonStars = { ...(serverP.lessonStars || {}) };
    const mergedChallengeStars = { ...(serverP.challengeStars || {}) };

    function getLessonStars(p, id) {
      if (p.lessonStars && typeof p.lessonStars === 'object' && typeof p.lessonStars[id] === 'number') {
        return p.lessonStars[id];
      }
      // раньше звёзды за уроки не начислялись
      return 0;
    }

    function getChallengeStars(p, id) {
      if (p.challengeStars && typeof p.challengeStars === 'object' && typeof p.challengeStars[id] === 'number') {
        return p.challengeStars[id];
      }
      // совместимость со старой логикой: +1 за челлендж
      return Array.isArray(p.completedChallenges) && p.completedChallenges.includes(id) ? 1 : 0;
    }

    for (const lessonId of guestP.completedLessons) {
      const serverHad = serverP.completedLessons.includes(lessonId);
      const guestStars = getLessonStars(guestP, lessonId);
      const serverStars = serverHad ? getLessonStars(serverP, lessonId) : 0;
      if (!serverHad) {
        stars += guestStars;
      } else if (guestStars > serverStars) {
        stars += guestStars - serverStars;
      }
      mergedLessonStars[lessonId] = Math.max(serverStars, guestStars);
    }

    for (const challengeId of guestP.completedChallenges) {
      const serverHad = serverP.completedChallenges.includes(challengeId);
      const guestStars = getChallengeStars(guestP, challengeId);
      const serverStars = serverHad ? getChallengeStars(serverP, challengeId) : 0;
      if (!serverHad) {
        stars += guestStars;
      } else if (guestStars > serverStars) {
        stars += guestStars - serverStars;
      }
      mergedChallengeStars[challengeId] = Math.max(serverStars, guestStars);
    }

    const seenGallery = new Set();
    const mergedGallery = [];
    for (const g of [...guestP.gallery, ...serverP.gallery]) {
      if (!g || typeof g !== 'object') continue;
      const gid = g.id != null ? String(g.id) : JSON.stringify(g);
      if (seenGallery.has(gid)) continue;
      seenGallery.add(gid);
      mergedGallery.push(g);
      if (mergedGallery.length >= 40) break;
    }

    const achievements = Array.from(new Set([...(serverP.achievements || []), ...(guestP.achievements || [])]));
    const merged = {
      completedLessons: lessons,
      completedChallenges: Array.from(sch),
      stars,
      gallery: mergedGallery,
      achievements,
      lessonStars: mergedLessonStars,
      challengeStars: mergedChallengeStars,
    };
    const granted = grantAchievements(merged, { event: 'merge' });
    user.progress = granted.progress;
    await user.save();
    res.json({ progress: user.progress });
  } catch (_e) {
    res.status(500).json({ error: 'Не удалось объединить прогресс' });
  }
});

// --- Endpoints для учителей ---

// Получить список учеников класса учителя
router.get('/teacher/class-students', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId).lean();
    
    if (!user || user.role !== 'teacher') {
      return res.status(403).json({ error: 'Доступ только для учителей' });
    }

    const students = await User.find({
      role: 'student',
      classId: user.classId || 'default-class'
    }).lean();

    const studentsList = students.map(s => ({
      _id: s._id,
      name: s.name || '',
      email: s.email,
      progress: normalizeProgress(s.progress),
    }));

    res.json({ students: studentsList });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении списка учеников' });
  }
});

// Получить детальный прогресс конкретного ученика
router.get('/teacher/student/:studentId/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { studentId } = req.params;
    
    const teacher = await User.findById(userId).lean();
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(403).json({ error: 'Доступ только для учителей' });
    }

    const student = await User.findById(studentId).lean();
    if (!student || student.role !== 'student' || student.classId !== (teacher.classId || 'default-class')) {
      return res.status(404).json({ error: 'Ученик не найден' });
    }

    res.json({
      student: {
        _id: student._id,
        name: student.name || '',
        email: student.email,
      },
      progress: normalizeProgress(student.progress),
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении прогресса' });
  }
});

module.exports = router;