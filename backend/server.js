require('dotenv').config();
const os = require('os');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const studentsRoutes = require('./routes/students');

const app = express();
// 5000 на macOS часто занят «Приёмом AirPlay» — ответ без CORS, клиент ломается.
const PORT = process.env.PORT || 5050;

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// Routes
// Подключаем маршруты аутентификации
app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Подключено к MongoDB'))
  .catch((err) => {
    console.error('❌ Ошибка подключения к MongoDB:', err.message || err);
    console.error(
      '\n→ Убедитесь, что MongoDB запущена на порту 27017. Варианты:\n' +
        '  1) Из корня проекта: docker compose up -d\n' +
        '  2) Homebrew: brew services start mongodb-community (или mongodb-community@7)\n' +
        '  3) Проверка: nc -zv 127.0.0.1 27017\n' +
        `  Текущий MONGODB_URI: ${process.env.MONGODB_URI || '(не задан)'}\n`
    );
  });

function collectLanIPv4s() {
  const out = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      const v4 = net.family === 'IPv4' || net.family === 4;
      if (v4 && !net.internal) out.push(net.address);
    }
  }
  return out;
}

// 0.0.0.0 — чтобы телефон в той же Wi‑Fi сети мог подключиться по IP ПК (не только localhost).
const HOST = process.env.HOST || '0.0.0.0';

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Сервер слушает http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT} (и сеть LAN)`);
  const ips = collectLanIPv4s();
  if (ips.length) {
    console.log('→ Для Expo на телефоне добавьте в корень проекта (рядом с package.json) в .env строку:');
    for (const ip of ips) {
      console.log(`   EXPO_PUBLIC_API_URL=http://${ip}:${PORT}/api/auth`);
    }
  }
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `❌ Порт ${PORT} уже занят (возможно, второй запуск бэкенда). Остановите процесс: lsof -i :${PORT}  затем kill <PID>, либо задайте другой PORT в .env`
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});