# 🔌 API Endpoints - Примеры запросов

## 🔐 Аутентификация

### Регистрация ученика
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "Иван Петров",
  "email": "ivan@example.com",
  "password": "password123",
  "role": "student"
}

# Ответ:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "507f1f77bcf86cd799439011",
  "email": "ivan@example.com",
  "name": "Иван Петров",
  "role": "student"
}
```

### Регистрация учителя
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "Мария Сидорова",
  "email": "maria@example.com",
  "password": "password123",
  "role": "teacher"
}

# Ответ:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "507f1f77bcf86cd799439012",
  "email": "maria@example.com",
  "name": "Мария Сидорова",
  "role": "teacher"
}
```

### Вход (универсально для студента и учителя)
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "maria@example.com",
  "password": "password123"
}

# Ответ:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "507f1f77bcf86cd799439012",
  "email": "maria@example.com",
  "name": "Мария Сидорова",
  "role": "teacher"  # ← определяет, куда редиректить (MainMenu для student, TeacherCabinet для teacher)
}
```

## 👨‍🏫 Endpoints для учителей

### Получить список учеников класса
```bash
GET /api/auth/teacher/class-students
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Ответ:
{
  "students": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Мария Сидорова",
      "email": "student1@test.com",
      "progress": {
        "completedLessons": ["lesson-1", "lesson-2", "lesson-3"],
        "completedChallenges": ["challenge-1", "challenge-2"],
        "stars": 18,
        "gallery": [
          {
            "id": "art-1",
            "name": "My First Drawing",
            "commandsCount": 12
          },
          {
            "id": "art-2",
            "name": "Spiral Pattern",
            "commandsCount": 25
          }
        ],
        "achievements": ["first_login", "five_lessons", "sandbox"],
        "lessonStars": {
          "lesson-1": 3,
          "lesson-2": 3,
          "lesson-3": 2
        },
        "challengeStars": {
          "challenge-1": 1,
          "challenge-2": 1
        }
      }
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Алексей Иванов",
      "email": "student2@test.com",
      "progress": {
        "completedLessons": ["lesson-1", "lesson-2"],
        "completedChallenges": ["challenge-1"],
        "stars": 7,
        "gallery": [
          {
            "id": "art-3",
            "name": "Simple Square",
            "commandsCount": 4
          }
        ],
        "achievements": ["first_login"],
        "lessonStars": {
          "lesson-1": 3,
          "lesson-2": 2
        },
        "challengeStars": {
          "challenge-1": 1
        }
      }
    }
  ]
}
```

### Получить прогресс конкретного ученика
```bash
GET /api/auth/teacher/student/507f1f77bcf86cd799439011/progress
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Ответ:
{
  "student": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Мария Сидорова",
    "email": "student1@test.com"
  },
  "progress": {
    "completedLessons": ["lesson-1", "lesson-2", "lesson-3"],
    "completedChallenges": ["challenge-1", "challenge-2"],
    "stars": 18,
    "gallery": [
      {
        "id": "art-1",
        "name": "My First Drawing",
        "commandsCount": 12
      },
      {
        "id": "art-2",
        "name": "Spiral Pattern",
        "commandsCount": 25
      }
    ],
    "achievements": ["first_login", "five_lessons", "sandbox"],
    "lessonStars": {
      "lesson-1": 3,
      "lesson-2": 3,
      "lesson-3": 2
    },
    "challengeStars": {
      "challenge-1": 1,
      "challenge-2": 1
    }
  }
}
```

## 📊 Структура данных прогресса

```javascript
{
  "completedLessons": [
    "lesson-1",    // ID пройденного урока
    "lesson-2",
    "lesson-3"
  ],
  
  "completedChallenges": [
    "challenge-1",  // ID пройденного челленджа
    "challenge-2"
  ],
  
  "stars": 18,  // Общее количество звёзд
  
  "gallery": [
    {
      "id": "art-1",
      "name": "My First Drawing",
      "commandsCount": 12  // Количество команд в коде
    }
  ],
  
  "achievements": [
    "first_login",      // Первый вход
    "five_lessons",     // 5 уроков пройдено
    "sandbox",          // Первое творение в песочнице
    "first_challenge",  // Первый челлендж выполнен
    "first_algorithm"   // Первый алгоритм с командами
  ],
  
  "lessonStars": {
    "lesson-1": 3,  // 3 звезды за урок 1
    "lesson-2": 3,
    "lesson-3": 2
  },
  
  "challengeStars": {
    "challenge-1": 1,  // 1 звезда за челлендж 1
    "challenge-2": 1
  }
}
```

## 🔑 Ошибки и коды ответов

### 400 Bad Request
```json
{
  "error": "Email и пароль обязательны"
}
```

### 401 Unauthorized
```json
{
  "error": "Неавторизован"
}
```

### 403 Forbidden (не учитель)
```json
{
  "error": "Доступ только для учителей"
}
```

### 404 Not Found
```json
{
  "error": "Пользователь не найден"
}
```

### 500 Internal Server Error
```json
{
  "error": "Ошибка при получении списка учеников"
}
```

## 💻 Примеры на JavaScript (Frontend)

### Получить список учеников
```javascript
import { fetchTeacherClassStudents } from '../utils/api';

try {
  const students = await fetchTeacherClassStudents();
  console.log(students);  // массив учеников
  
  students.forEach(student => {
    console.log(student.name, student.progress.stars);
  });
} catch (error) {
  console.error(error.message);
}
```

### Получить прогресс ученика
```javascript
import { fetchStudentProgress } from '../utils/api';

try {
  const data = await fetchStudentProgress('507f1f77bcf86cd799439011');
  console.log(data.student.name);      // "Мария Сидорова"
  console.log(data.progress.stars);    // 18
  console.log(data.progress.completedLessons);  // ["lesson-1", "lesson-2", "lesson-3"]
} catch (error) {
  console.error(error.message);
}
```

## 🔄 Классы (classId)

На текущий момент используется единственный класс:
- `classId: "default-class"` - класс по умолчанию

Все студенты и учителя автоматически присваиваются к этому классу при регистрации.

**Возможность создания реальных классов** планируется в будущих версиях.

---

**Примеры готовы к использованию! 📝**
