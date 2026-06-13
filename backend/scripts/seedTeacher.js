// scripts/seedTeacher.js
// Скрипт для создания тестовых данных: учителя и учеников

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function seedTeacher() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Подключено к MongoDB');

    // Очищаем существующие тестовые данные (опционально)
    // await User.deleteMany({ email: { $regex: 'test' } });

    // Создаём учителя
    const teacher = new User({
      name: 'Иван Петров',
      email: 'teacher@test.com',
      password: 'password123',
      role: 'teacher',
      classId: 'default-class',
    });
    await teacher.save();
    console.log('✅ Создан учитель:', teacher.email);

    // Создаём несколько учеников
    const students = [
      {
        name: 'Мария Сидорова',
        email: 'student1@test.com',
        password: 'password123',
        role: 'student',
        classId: 'default-class',
        progress: {
          completedLessons: ['lesson-1', 'lesson-2', 'lesson-3'],
          completedChallenges: ['challenge-1', 'challenge-2'],
          stars: 18,
          gallery: [
            { id: 'art-1', name: 'My First Drawing', commandsCount: 12 },
            { id: 'art-2', name: 'Spiral Pattern', commandsCount: 25 },
          ],
          achievements: ['first_login', 'five_lessons', 'sandbox'],
          lessonStars: { 'lesson-1': 3, 'lesson-2': 3, 'lesson-3': 2 },
          challengeStars: { 'challenge-1': 1, 'challenge-2': 1 },
        },
      },
      {
        name: 'Алексей Иванов',
        email: 'student2@test.com',
        password: 'password123',
        role: 'student',
        classId: 'default-class',
        progress: {
          completedLessons: ['lesson-1', 'lesson-2'],
          completedChallenges: ['challenge-1'],
          stars: 7,
          gallery: [
            { id: 'art-3', name: 'Simple Square', commandsCount: 4 },
          ],
          achievements: ['first_login'],
          lessonStars: { 'lesson-1': 3, 'lesson-2': 2 },
          challengeStars: { 'challenge-1': 1 },
        },
      },
      {
        name: 'София Петрова',
        email: 'student3@test.com',
        password: 'password123',
        role: 'student',
        classId: 'default-class',
        progress: {
          completedLessons: ['lesson-1', 'lesson-2', 'lesson-3', 'lesson-4'],
          completedChallenges: ['challenge-1', 'challenge-2', 'challenge-3'],
          stars: 25,
          gallery: [
            { id: 'art-4', name: 'Complex Shape', commandsCount: 50 },
            { id: 'art-5', name: 'Tree', commandsCount: 75 },
            { id: 'art-6', name: 'House', commandsCount: 60 },
          ],
          achievements: ['first_login', 'five_lessons', 'sandbox', 'first_challenge', 'first_algorithm'],
          lessonStars: { 'lesson-1': 3, 'lesson-2': 3, 'lesson-3': 3, 'lesson-4': 2 },
          challengeStars: { 'challenge-1': 1, 'challenge-2': 1, 'challenge-3': 1 },
        },
      },
      {
        name: 'Дмитрий Козлов',
        email: 'student4@test.com',
        password: 'password123',
        role: 'student',
        classId: 'default-class',
        progress: {
          completedLessons: ['lesson-1'],
          completedChallenges: [],
          stars: 2,
          gallery: [],
          achievements: ['first_login'],
          lessonStars: { 'lesson-1': 2 },
          challengeStars: {},
        },
      },
    ];

    for (const studentData of students) {
      const student = new User({
        ...studentData,
        teacherId: teacher._id,
      });
      await student.save();
      console.log('✅ Создан ученик:', student.email);
    }

    console.log('\n✅ Тестовые данные созданы успешно!');
    console.log('\nДанные для входа:');
    console.log('Учитель:');
    console.log('  Email: teacher@test.com');
    console.log('  Пароль: password123');
    console.log('\nУченики:');
    console.log('  Email: student1@test.com, Пароль: password123');
    console.log('  Email: student2@test.com, Пароль: password123');
    console.log('  Email: student3@test.com, Пароль: password123');
    console.log('  Email: student4@test.com, Пароль: password123');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

seedTeacher();
