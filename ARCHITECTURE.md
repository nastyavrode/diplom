# 🏗️ АРХИТЕКТУРА СИСТЕМЫ КАБИНЕТА УЧИТЕЛЯ

## 📊 Диаграмма взаимодействия компонентов

```
┌─────────────────────────────────────────────────────────────┐
│                      ФРОНТЕНД (React Native)                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐           │
│  │  WelcomeScreen   │──────→  │  TeacherLogin    │           │
│  │  (выбор входа)   │         │     Screen       │           │
│  └──────────────────┘         └────────┬─────────┘           │
│         │                              │                     │
│         │                    ┌─────────▼─────────┐            │
│         │                    │ Учитель вводит    │            │
│         │                    │ email/password    │            │
│         │                    └─────────┬─────────┘            │
│         │                              │                     │
│  ┌──────▼──────────┐        ┌──────────▼──────────┐           │
│  │  LoginScreen    │        │ POST /login        │           │
│  │ (для студента)  │        │ (проверка role)    │           │
│  └────────────────┘        └──────────┬──────────┘           │
│                                       │                      │
│                              ┌────────▼────────┐             │
│                              │ role === 'teacher'           │
│                              │      ?          │             │
│                              └────┬─────────┬──┘             │
│                              YES  │         │  NO            │
│                     ┌────────────┐│┌───────────────┐         │
│                     │            ▼▼                │         │
│            ┌────────┴──────────────────────────┐   │         │
│            │  TeacherCabinetScreen             │   │         │
│            │  ┌─────────────────────────┐      │   │         │
│            │  │ Приветствие с именем    │      │   │         │
│            │  │ Список учеников класса  │      │   │         │
│            │  │ ┌─────────────────────┐ │      │   │         │
│            │  │ │ Карточка ученика 1  │ │      │   │         │
│            │  │ │ - Имя/Email         │ │      │   │         │
│            │  │ │ - Уроки: 3          │ │      │   │         │
│            │  │ │ - Челленджи: 2      │ │      │   │         │
│            │  │ │ - Звёзды: 18        │ │      │   │         │
│            │  │ └────────┬────────────┘ │      │   │         │
│            │  │          │               │      │   │         │
│            │  │ [Карточка ученика 2]     │      │   │         │
│            │  │ [Карточка ученика 3]     │      │   │         │
│            │  │ [Карточка ученика 4]     │      │   │         │
│            │  └──────────┬────────────────┘      │   │         │
│            │             │                       │   │         │
│            │       Клик на ученика              │   │         │
│            │             │                       │   │         │
│            │    ┌────────▼──────────┐            │   │         │
│            │    │ StudentProgress    │            │   │         │
│            │    │ Screen             │            │   │         │
│            │    │ ┌────────────────┐ │            │   │         │
│            │    │ │ Статистика:    │ │            │   │         │
│            │    │ │ - Звёзды: 18  │ │            │   │         │
│            │    │ │ - Уроки: 3    │ │            │   │         │
│            │    │ │ - Челленджи: 2│ │            │   │         │
│            │    │ │ - Награды: 3  │ │            │   │         │
│            │    │ └────────────────┘ │            │   │         │
│            │    │ Прогресс-бары      │            │   │         │
│            │    │ Звёзды по урокам   │            │   │         │
│            │    │ Звёзды по челленджам           │   │         │
│            │    │ Достижения        │            │   │         │
│            │    │ Работы в галерее  │            │   │         │
│            │    └────────────────────┘            │   │         │
│            └────────────────────────────────────┘   │         │
│                                                     │         │
│                                        ┌────────────▼──┐     │
│                                        │  MainMenu      │     │
│                                        │  (для студента)│     │
│                                        └────────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS
                              │
┌─────────────────────────────▼─────────────────────────────────┐
│                   БЭКЕНД (Node.js/Express)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────┐          │
│  │          API ROUTES (/api/auth)                │          │
│  ├────────────────────────────────────────────────┤          │
│  │ • POST /register (обновлено для role)          │          │
│  │ • POST /login (возвращает role)                │          │
│  │ • GET /teacher/class-students (НОВОЕ)          │          │
│  │ • GET /teacher/student/:id/progress (НОВОЕ)    │          │
│  │ • POST /me/progress/* (для студента)           │          │
│  └────────────────────────────────────────────────┘          │
│                              │                               │
│              ┌───────────────┴───────────────┐                │
│              │                               │                │
│  ┌───────────▼──────────┐      ┌────────────▼─────┐          │
│  │   User Model         │      │  Auth Logic      │          │
│  │ ┌──────────────────┐ │      │ ┌──────────────┐ │          │
│  │ │ _id             │ │      │ │ JWT Token   │ │          │
│  │ │ name            │ │      │ │ bcrypt Hash │ │          │
│  │ │ email           │ │      │ │ Role Check  │ │          │
│  │ │ password (hash) │ │      │ │ Permission  │ │          │
│  │ │ role (NEW)      │ │      │ └──────────────┘ │          │
│  │ │ classId (NEW)   │ │      │                  │          │
│  │ │ progress {...}  │ │      │                  │          │
│  │ │ createdAt       │ │      │                  │          │
│  │ └──────────────────┘ │      └──────────────────┘          │
│  └──────────────┬───────┘                                    │
│                 │                                            │
│         ┌───────▼────────┐                                   │
│         │    MongoDB     │                                   │
│         │  (Database)    │                                   │
│         └────────────────┘                                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Жизненный цикл запроса

### 1. Вход учителя

```
WelcomeScreen
    │ (нажать "Вход для учителей")
    ▼
TeacherLoginScreen
    │ (ввести email и пароль)
    ▼
POST /api/auth/login
    │
    ▼
[Сервер проверяет email/пароль]
    │
    ▼ Успех
    │
    ├─ Проверяет role
    │
    ├─ role === 'teacher' ✓
    │
    ▼
JWT Token + role: 'teacher'
    │
    ▼
[Клиент сохраняет токен]
    │
    ▼
Редирект на TeacherCabinetScreen
```

### 2. Загрузка списка учеников

```
TeacherCabinetScreen
    │ (монтирование компонента)
    ▼
GET /api/auth/teacher/class-students
    │ Authorization: Bearer {token}
    ▼
[Сервер проверяет токен]
    │
    ▼ Токен валиден
    │
    ├─ Извлекает userId из токена
    │
    ├─ Получает пользователя (найдет role=teacher)
    │
    ├─ Получает classId учителя
    │
    ▼
[Поиск всех студентов с этим classId]
    │
    ▼
[Форматирование ответа]
    │
    ▼
JSON: { students: [{...}, {...}, ...] }
    │
    ▼
[Клиент отображает карточки учеников]
```

### 3. Просмотр прогресса ученика

```
Клик на ученика в TeacherCabinetScreen
    │ (studentId передан в параметре)
    ▼
StudentProgressScreen
    │ (монтирование компонента)
    ▼
GET /api/auth/teacher/student/:studentId/progress
    │ Authorization: Bearer {token}
    ▼
[Сервер проверяет токен]
    │
    ▼ Токен валиден
    │
    ├─ Извлекает userId учителя из токена
    │
    ├─ Получает пользователя (проверяет role=teacher)
    │
    ├─ Получает classId учителя
    │
    ├─ Получает студента по studentId
    │
    ├─ Проверяет: student.classId === teacher.classId
    │
    ▼ Проверка пройдена
    │
    ▼
[Нормализация progress данных]
    │
    ▼
JSON: { student: {...}, progress: {...} }
    │
    ▼
[Клиент отображает детальный прогресс]
```

## 📦 Структура данных

### Request: POST /api/auth/register

```javascript
{
  "name": "Иван Петров",
  "email": "teacher@example.com",
  "password": "securePassword123",
  "role": "teacher"  // ← НОВОЕ
}
```

### Response: 201 Created

```javascript
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "507f1f77bcf86cd799439011",
  "email": "teacher@example.com",
  "name": "Иван Петров",
  "role": "teacher"  // ← НОВОЕ
}
```

### Request: GET /api/auth/teacher/class-students

```
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response: 200 OK

```javascript
{
  "students": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Мария Сидорова",
      "email": "student1@test.com",
      "progress": {
        "completedLessons": ["lesson-1", "lesson-2", "lesson-3"],
        "completedChallenges": ["challenge-1", "challenge-2"],
        "stars": 18,
        "gallery": [...],
        "achievements": ["first_login", "five_lessons", "sandbox"],
        "lessonStars": { "lesson-1": 3, "lesson-2": 3, "lesson-3": 2 },
        "challengeStars": { "challenge-1": 1, "challenge-2": 1 }
      }
    },
    // ... другие ученики
  ]
}
```

## 🔐 Безопасность

### Иерархия проверок

```
1. Базовая валидация
   ├─ Email формат
   ├─ Пароль длина
   └─ Параметры обязательны

2. Проверка токена
   ├─ Токен присутствует
   ├─ Токен валиден
   └─ Токен не истек

3. Проверка роли
   ├─ user.role === 'teacher'
   └─ user !== null

4. Проверка доступа
   ├─ Студент в том же классе
   └─ Класс совпадает

5. Проверка данных
   ├─ Студент существует
   └─ Progress валиден
```

## 🔌 Интеграция компонентов

### Frontend

```
AuthContext (глобальное состояние)
    │
    ├─ signIn() - сохранить токен, определить role
    ├─ signOut() - удалить токен
    └─ enterGuestMode() - режим гостя

    ▼

React Navigation Stack
    │
    ├─ Login Routes
    │  ├─ WelcomeScreen
    │  ├─ LoginScreen
    │  ├─ RegisterScreen
    │  ├─ TeacherLoginScreen (NEW)
    │  └─ TeacherRegisterScreen (NEW)
    │
    └─ App Routes
       ├─ MainMenuScreen (студент)
       ├─ TeacherCabinetScreen (NEW - учитель)
       └─ StudentProgressScreen (NEW)
```

### Backend

```
app.js (Express)
    │
    ├─ CORS middleware
    ├─ JSON middleware
    └─ Routes

        ▼

routes/auth.js
    │
    ├─ POST /register
    ├─ POST /login
    ├─ POST /forgot-password
    ├─ POST /change-password
    ├─ GET /me/progress
    ├─ GET /teacher/class-students (NEW)
    └─ GET /teacher/student/:id/progress (NEW)

        ▼

models/User.js
    │
    ├─ Schema validation
    ├─ Pre-save hooks (bcrypt)
    └─ Methods (comparePassword)

        ▼

MongoDB
```

## 🚀 Поток развертывания

```
1. Обновить User.js
   └─ Добавить role и classId

2. Обновить auth.js
   ├─ Обновить register endpoint
   ├─ Обновить login endpoint
   └─ Добавить teacher endpoints

3. Создать новые экраны
   ├─ TeacherLoginScreen
   ├─ TeacherRegisterScreen
   ├─ TeacherCabinetScreen
   └─ StudentProgressScreen

4. Обновить существующие экраны
   ├─ LoginScreen
   ├─ RegisterScreen
   └─ WelcomeScreen

5. Обновить API функции
   └─ utils/api.js

6. Обновить навигацию
   └─ App.js

7. Создать скрипт инициализации
   └─ seedTeacher.js

8. Протестировать
   └─ Все функции работают
```

---

**Архитектура полностью задокументирована и готова к использованию! 🎉**
