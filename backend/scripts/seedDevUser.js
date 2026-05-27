/**
 * Однократно создаёт тестового пользователя (удобно после пустой MongoDB).
 * Запуск из папки backend: npm run seed:dev
 *
 * Логин по умолчанию: student@test.dev / test123456
 * Переопределение: DEV_SEED_EMAIL, DEV_SEED_PASSWORD, DEV_SEED_NAME в .env
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Задайте MONGODB_URI в backend/.env');
    process.exit(1);
  }

  const email = (process.env.DEV_SEED_EMAIL || 'student@test.dev').trim().toLowerCase();
  const password = process.env.DEV_SEED_PASSWORD || 'test123456';
  const name = (process.env.DEV_SEED_NAME || 'Студент').trim();

  await mongoose.connect(uri);
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Уже есть пользователь ${email} — пропуск.`);
    await mongoose.disconnect();
    return;
  }

  await new User({ name, email, password }).save();
  console.log(`Создан пользователь:\n  email: ${email}\n  пароль: ${password}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
