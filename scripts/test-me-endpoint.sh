#!/bin/bash

# Тест endpoint GET /api/auth/me
# Убедитесь, что сервер запущен на http://localhost:5000

BASE_URL="http://localhost:5000/api/auth"
EMAIL="test@example.com"
PASSWORD="testpassword123"

echo "=== Тест endpoint /api/auth/me ==="
echo ""

# 1. Регистрация нового пользователя
echo "1. Регистрация пользователя..."
REGISTER_RESPONSE=$(curl -s -c cookies.txt -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"firstName\":\"Test\",\"lastName\":\"User\"}")

echo "Ответ регистрации:"
echo "$REGISTER_RESPONSE" | jq '.'
echo ""

# 2. Логин (если пользователь уже существует)
echo "2. Логин пользователя..."
LOGIN_RESPONSE=$(curl -s -c cookies.txt -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "Ответ логина:"
echo "$LOGIN_RESPONSE" | jq '.'
echo ""

# 3. Проверка endpoint /me с cookie
echo "3. Запрос GET /api/auth/me (с cookie)..."
ME_RESPONSE=$(curl -s -b cookies.txt -X GET "$BASE_URL/me")

echo "Ответ /me:"
echo "$ME_RESPONSE" | jq '.'
echo ""

# 4. Проверка endpoint /me без токена (ожидаем 401)
echo "4. Запрос GET /api/auth/me (без токена)..."
UNAUTHORIZED_RESPONSE=$(curl -s -w "\nHTTP Status: %{http_code}" -X GET "$BASE_URL/me")

echo "Ответ (ожидается 401):"
echo "$UNAUTHORIZED_RESPONSE"
echo ""

# Очистка
rm -f cookies.txt

echo "=== Тест завершен ==="
