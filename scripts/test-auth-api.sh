#!/bin/bash

# Authentication API Test Script
# Tests the complete auth flow via HTTP endpoints

set -e

echo "🧪 Testing Authentication API Endpoints"
echo "========================================"
echo ""

# Configuration
BASE_URL="${BASE_URL:-http://localhost:5000}"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="SecurePassword123!"
TEST_FIRST_NAME="Test"
TEST_LAST_NAME="User"

echo "📋 Test Configuration:"
echo "   BASE_URL: $BASE_URL"
echo "   TEST_EMAIL: $TEST_EMAIL"
echo ""

# Test 1: Registration
echo "1️⃣  Testing User Registration..."
echo "   POST /api/auth/register"

REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"firstName\": \"$TEST_FIRST_NAME\",
    \"lastName\": \"$TEST_LAST_NAME\"
  }")

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$REGISTER_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 201 ]; then
  echo "   ✅ Registration successful (201)"
  TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
  USER_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*' | sed 's/"id":"//')
  echo "   Token: ${TOKEN:0:40}..."
  echo "   User ID: $USER_ID"
else
  echo "   ❌ Registration failed (HTTP $HTTP_CODE)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 2: Duplicate Registration (should fail)
echo "2️⃣  Testing Duplicate Registration (should fail)..."
echo "   POST /api/auth/register (same email)"

DUPLICATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

HTTP_CODE=$(echo "$DUPLICATE_RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" -eq 409 ]; then
  echo "   ✅ Duplicate registration correctly rejected (409)"
else
  echo "   ❌ Duplicate registration should return 409, got HTTP $HTTP_CODE"
  exit 1
fi

echo ""

# Test 3: Login with correct credentials
echo "3️⃣  Testing Login with Correct Credentials..."
echo "   POST /api/auth/login"

LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "   ✅ Login successful (200)"
  LOGIN_TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
  echo "   Token: ${LOGIN_TOKEN:0:40}..."
else
  echo "   ❌ Login failed (HTTP $HTTP_CODE)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 4: Login with wrong password
echo "4️⃣  Testing Login with Wrong Password (should fail)..."
echo "   POST /api/auth/login (wrong password)"

WRONG_PASSWORD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"WrongPassword123\"
  }")

HTTP_CODE=$(echo "$WRONG_PASSWORD_RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" -eq 401 ]; then
  echo "   ✅ Wrong password correctly rejected (401)"
else
  echo "   ❌ Wrong password should return 401, got HTTP $HTTP_CODE"
  exit 1
fi

echo ""

# Test 5: Access protected endpoint with token
echo "5️⃣  Testing Protected Endpoint with Valid Token..."
echo "   GET /api/auth/me"

ME_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$ME_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$ME_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "   ✅ Protected endpoint accessible with token (200)"
  EMAIL=$(echo "$RESPONSE_BODY" | grep -o '"email":"[^"]*' | sed 's/"email":"//')
  echo "   User email: $EMAIL"
else
  echo "   ❌ Protected endpoint access failed (HTTP $HTTP_CODE)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 6: Access protected endpoint without token
echo "6️⃣  Testing Protected Endpoint without Token (should fail)..."
echo "   GET /api/auth/me (no token)"

NO_TOKEN_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/auth/me")

HTTP_CODE=$(echo "$NO_TOKEN_RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" -eq 401 ]; then
  echo "   ✅ Access correctly denied without token (401)"
else
  echo "   ❌ Should return 401 without token, got HTTP $HTTP_CODE"
  exit 1
fi

echo ""

# Test 7: Access protected endpoint with invalid token
echo "7️⃣  Testing Protected Endpoint with Invalid Token (should fail)..."
echo "   GET /api/auth/me (invalid token)"

INVALID_TOKEN_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer invalid.token.here")

HTTP_CODE=$(echo "$INVALID_TOKEN_RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" -eq 401 ]; then
  echo "   ✅ Invalid token correctly rejected (401)"
else
  echo "   ❌ Should return 401 for invalid token, got HTTP $HTTP_CODE"
  exit 1
fi

echo ""
echo "========================================"
echo "✅ All API authentication tests passed!"
echo ""
echo "Summary:"
echo "  - User registration: ✅"
echo "  - Duplicate prevention: ✅"
echo "  - Login with correct credentials: ✅"
echo "  - Login with wrong password: ✅"
echo "  - Protected endpoint with token: ✅"
echo "  - Protected endpoint without token: ✅"
echo "  - Protected endpoint with invalid token: ✅"
echo ""
echo "Test user created:"
echo "  Email: $TEST_EMAIL"
echo "  Password: $TEST_PASSWORD"
