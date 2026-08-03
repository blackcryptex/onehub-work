#!/usr/bin/env bash
set -e

echo "Running OneHub Stabilization Checks..."

FAIL=0

check_forbidden() {
  PATTERN=$1
  PATH_TO_CHECK=$2
  MESSAGE=$3

  if grep -R "$PATTERN" "$PATH_TO_CHECK" >/dev/null 2>&1; then
    echo "❌ $MESSAGE"
    FAIL=1
  else
    echo "✅ $MESSAGE"
  fi
}

warn_forbidden() {
  PATTERN=$1
  PATH_TO_CHECK=$2
  MESSAGE=$3

  if grep -R "$PATTERN" "$PATH_TO_CHECK" >/dev/null 2>&1; then
    echo "⚠️  $MESSAGE"
  else
    echo "✅ $MESSAGE"
  fi
}

# Hard guardrails for client/shared code.
check_forbidden "from \"@/lib/prisma\"" "apps/web/src/components" "No Prisma import in components"
check_forbidden "prisma\." "apps/web/src/components" "No prisma usage in components"
check_forbidden "as any" "apps/web/src/server/services" "No 'as any' in services"

# Legacy architecture debt is reported but not CI-blocking until a dedicated cleanup lane.
warn_forbidden "from \"@/lib/prisma\"" "apps/web/src/app" "Prisma imports remain in app/server route layer (legacy warning)"
warn_forbidden "prisma\." "apps/web/src/app" "Prisma usage remains in app/server route layer (legacy warning)"
warn_forbidden "as any" "apps/web/src/app/api" "'as any' remains in API routes (legacy warning)"
warn_forbidden "as any" "apps/web/src/server/routers" "'as any' remains in routers (legacy warning)"

if [ $FAIL -eq 1 ]; then
  echo ""
  echo "❌ Stabilization checks failed."
  exit 1
fi

echo ""
echo "✅ All blocking stabilization checks passed."
exit 0
