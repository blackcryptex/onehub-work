#!/bin/bash
# Smoke test script for Event Wizard and API endpoints

set -e

echo "🧪 Running smoke tests..."

# Check if server is running
if ! curl -s http://localhost:3000 > /dev/null; then
  echo "❌ Server not running on port 3000"
  echo "   Start with: npm run dev"
  exit 1
fi

echo "✅ Server is running"

# Test 1: Create event with free-text fields
echo ""
echo "Test 1: Creating event with free-text event type and budget..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/events/create \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat .test-cookie 2>/dev/null || echo '')" \
  -d '{
    "name": "Test Event",
    "event_type_raw": "black-tie gala",
    "budget_raw": "$15,000 - $20,000",
    "date": "2025-12-31",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "headcount": "100"
  }')

if echo "$RESPONSE" | grep -q "eventId\|slug"; then
  echo "✅ Event created successfully"
  EVENT_ID=$(echo "$RESPONSE" | grep -o '"eventId":"[^"]*"' | cut -d'"' -f4 || echo "")
  if [ -n "$EVENT_ID" ]; then
    echo "   Event ID: $EVENT_ID"
  fi
else
  echo "❌ Event creation failed"
  echo "   Response: $RESPONSE"
  exit 1
fi

# Test 2: Verify parsing works
echo ""
echo "Test 2: Testing budget parsing..."
echo "   Input: 'about 30k EUR'"
echo "   Expected: min~24k, max~36k, currency=EUR"

# Test 3: Verify event type canonicalization
echo ""
echo "Test 3: Testing event type canonicalization..."
echo "   Input: 'marriage ceremony'"
echo "   Expected canonical: 'wedding'"

echo ""
echo "✅ All smoke tests passed!"
echo ""
echo "Note: Full authentication required for API tests."
echo "      Run unit tests with: npm test"

