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

# No Prisma in app layer
check_forbidden "from \"@/lib/prisma\"" "apps/web/src/app" "No Prisma import in app layer"
check_forbidden "prisma\." "apps/web/src/app" "No prisma usage in app layer"

# No Prisma in components
check_forbidden "from \"@/lib/prisma\"" "apps/web/src/components" "No Prisma import in components"
check_forbidden "prisma\." "apps/web/src/components" "No prisma usage in components"

# No 'as any' in API or services
check_forbidden "as any" "apps/web/src/app/api" "No 'as any' in API routes"
check_forbidden "as any" "apps/web/src/server/services" "No 'as any' in services"
check_forbidden "as any" "apps/web/src/server/routers" "No 'as any' in routers"

if [ $FAIL -eq 1 ]; then
  echo ""
  echo "❌ Stabilization checks failed."
  exit 1
fi

echo ""
echo "✅ All stabilization checks passed."
exit 0