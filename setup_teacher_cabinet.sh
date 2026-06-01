#!/bin/bash
# Скрипт для быстрого запуска системы кабинета учителя

echo "🚀 Запуск системы кабинета учителя"
echo "=================================="
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для красивого вывода
print_step() {
    echo -e "${YELLOW}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

# Проверка наличия Node.js
print_step "Проверка Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Пожалуйста, установите Node.js"
    exit 1
fi
print_success "Node.js версия: $(node -v)"

# Проверка наличия MongoDB
print_step "Проверка MongoDB..."
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB не найдена. Убедитесь, что она запущена:"
    echo "   macOS: brew services start mongodb-community"
    echo "   или используйте Docker: docker compose up -d"
fi

echo ""
print_step "Переход в папку backend..."
cd backend || exit

# Проверка зависимостей
if [ ! -d "node_modules" ]; then
    print_step "Установка зависимостей backend..."
    npm install
    print_success "Зависимости backend установлены"
fi

echo ""
print_step "Создание тестовых данных..."
echo "Это создаст учителя и 4 учеников в классе"
echo ""
node scripts/seedTeacher.js

if [ $? -eq 0 ]; then
    print_success "Тестовые данные созданы успешно!"
else
    echo "❌ Ошибка при создании тестовых данных"
    echo "Убедитесь, что MongoDB запущена"
    exit 1
fi

echo ""
echo "=================================="
echo "✅ Предварительная подготовка завершена!"
echo ""
echo "Теперь запустите приложение:"
echo "  npx expo start"
echo ""
echo "Тестовые учетные данные:"
echo "  Email: teacher@test.com"
echo "  Пароль: password123"
echo ""
echo "Затем выберите 'Вход для учителей' на главном экране"
echo "=================================="
