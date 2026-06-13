const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/authenticate');
const { normalizeProgress } = require('../utils/progress');

const router = express.Router();

async function getTeacherOr403(req, res) {
  const userId = req.user?.userId;
  const teacher = await User.findById(userId).lean();
  if (!teacher || teacher.role !== 'teacher') {
    res.status(403).json({ error: 'Доступ только для учителей' });
    return null;
  }
  return teacher;
}

function formatStudentResponse(student) {
  return {
    _id: student._id,
    name: student.name || '',
    email: student.email,
    role: student.role,
    teacherId: student.teacherId,
    progress: normalizeProgress(student.progress),
  };
}

router.post('/', authenticateToken, async (req, res) => {
  try {
    const teacher = await getTeacherOr403(req, res);
    if (!teacher) return;

    const { name, email, password } = req.body;
    const nameTrim = (name || '').trim();

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

    const emailNorm = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: emailNorm });
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const student = new User({
      name: nameTrim,
      email: emailNorm,
      password,
      role: 'student',
      teacherId: teacher._id,
      classId: teacher.classId || 'default-class',
    });
    await student.save();

    res.status(201).json({
      student: formatStudentResponse(student.toObject()),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }
    res.status(500).json({ error: 'Ошибка при создании ученика' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const teacher = await getTeacherOr403(req, res);
    if (!teacher) return;

    const students = await User.find({
      role: 'student',
      teacherId: teacher._id,
    }).lean();

    res.json({
      students: students.map(formatStudentResponse),
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении списка учеников' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const teacher = await getTeacherOr403(req, res);
    if (!teacher) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Некорректный идентификатор ученика' });
    }

    const student = await User.findOne({
      _id: id,
      role: 'student',
      teacherId: teacher._id,
    }).lean();

    if (!student) {
      return res.status(404).json({ error: 'Ученик не найден' });
    }

    res.json({ student: formatStudentResponse(student) });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении ученика' });
  }
});

module.exports = router;
