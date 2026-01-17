#!/bin/bash

# Тестирование API получения шагов проекта
# Usage: ./scripts/test-project-steps.sh <project_id> <access_token>

PROJECT_ID="${1:-}"
ACCESS_TOKEN="${2:-}"

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Не указан PROJECT_ID"
  echo "Usage: $0 <project_id> [access_token]"
  exit 1
fi

BASE_URL="http://localhost:5001"

echo "🔍 Testing Project Steps API"
echo "================================"
echo "Project ID: $PROJECT_ID"
echo ""

# Если токен не передан, пытаемся получить его из сохранённого файла
if [ -z "$ACCESS_TOKEN" ]; then
  TOKEN_FILE=".test-token"
  if [ -f "$TOKEN_FILE" ]; then
    ACCESS_TOKEN=$(cat "$TOKEN_FILE")
    echo "📝 Using token from $TOKEN_FILE"
  else
    echo "⚠️  No access token provided and no saved token found"
    echo "Please provide token as second argument or save it to $TOKEN_FILE"
    exit 1
  fi
fi

echo ""
echo "📊 GET /api/projects/$PROJECT_ID/steps"
echo "-----------------------------------"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Cookie: access_token=$ACCESS_TOKEN" \
  "$BASE_URL/api/projects/$PROJECT_ID/steps")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Success!"
  echo ""
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  
  echo ""
  echo "📋 Steps Summary:"
  echo "$BODY" | jq -r '.[] | "  Step \(.stepNumber): \(if .completedAt then "✓ completed" else "○ pending" end) \(if .skipReason then "⏭ skipped: \(.skipReason)" else "" end)"' 2>/dev/null || echo "Unable to parse steps"
  
  echo ""
  echo "🔍 Step 3 data (script for Stage 4):"
  echo "$BODY" | jq '.[] | select(.stepNumber == 3) | {stepNumber, hasData: (.data != null), dataKeys: (.data | keys), hasFinalScript: (.data.finalScript != null), hasScenes: (.data.scenes != null)}' 2>/dev/null || echo "Unable to find step 3"
  
else
  echo "❌ Error!"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

echo ""
echo "================================"
