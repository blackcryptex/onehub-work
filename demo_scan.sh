#!/usr/bin/env bash
set -euo pipefail

OUT="DEMO_SCAN_REPORT.md"
BASE="apps/web/src"
APP="apps/web/src/app"
PRISMA="apps/web/prisma/schema.prisma"

# Prefer rg if available (much faster). Fallback to grep.
has_rg() { command -v rg >/dev/null 2>&1; }
search() {
  local pattern="$1"
  local path="$2"
  local title="$3"
  echo -e "\n## ${title}\n" >> "$OUT"
  if has_rg; then
    rg -n --hidden --no-ignore-vcs "$pattern" "$path" | head -n 80 >> "$OUT" || true
  else
    grep -RIn "$pattern" "$path" | head -n 80 >> "$OUT" || true
  fi
}

echo "# OneHub Demo Scan Report" > "$OUT"
echo "" >> "$OUT"
echo "**Generated:** $(date)" >> "$OUT"
echo "" >> "$OUT"

echo "## Repo layout" >> "$OUT"
ls >> "$OUT"
echo "" >> "$OUT"

echo "## Vault-related pages" >> "$OUT"
find "$APP" -type f -name "page.tsx" | grep -i vault | head -n 200 >> "$OUT" || true
echo "" >> "$OUT"

echo "## Event Vault core file (if present)" >> "$OUT"
if [ -f "apps/web/src/app/(app)/vault/[eventSlug]/page.tsx" ]; then
  echo "apps/web/src/app/(app)/vault/[eventSlug]/page.tsx" >> "$OUT"
else
  echo "NOT FOUND at expected path (apps/web/src/app/(app)/vault/[eventSlug]/page.tsx)" >> "$OUT"
fi
echo "" >> "$OUT"

# Key code searches
search "GenerateProposalButton" "$BASE" "Where proposal generation is wired"
search "shortlistItems" "$BASE" "Shortlist usage"
search "prisma\\.shortlistItem\\.(create|upsert|delete|deleteMany)" "$BASE" "Shortlist DB mutations"
search "Add Vendor" "$BASE" "Add Vendor UI text"
search "event\\.vendors|vendors\\s*\\)|vendors\\s*:" "$BASE" "Where vendorsseist is rendered/consumed"
search "getVaultBasePath" "$BASE" "Vault base-path routing helper"
search "contract.*generate|Generate Contract|AI contract" "$BASE" "AI contract generation references"
search "milestone" "$BASE" "Milestones/payment tracking references"
search "stripe" "$BASE" "Stripe integration references"

# Prisma excerpts for Listing + ShortlistItem
echo -e "\n## Prisma: ShortlistItem + Listing models (excerpt)\n" >> "$OUT"
if [ -f "$PRISMA" ]; then
  echo "### ShortlistItem block" >> "$OUT"
  awk 'NR>=295 && NR<=355 {print NR ":" $0}' "$PRISMA" >> "$OUT" || true
  echo -e "\n### Listing block" >> "$OUT"
  awk 'NR>=515 && NR<=595 {print NR ":" $0}' "$PRISMA" >> "$OUT" || true
else
  echo "Prisma schema not found at $PRISMA" >> "$OUT"
fi

# Show key sections of the Vault page (imports + event query + shortlist/proposals area)
VAULT="apps/web/src/app/(app)/vault/[eventSlug]/page.tsx"
echo -e "\n## Vault Page Key Sections (excerpt)\n" >> "$OUT"
if [ -f "$VAULT" ]; then
  echo "### Imports + top of file" >> "$OUT"
  awk 'NR>=1 && NR<=80 {print NR ":" $0}' "$VAULT" >> "$OUT" || true

  echo -e "\n### Event query include block (approx lines 80-220)" >> "$OUT"
  awk 'NR>=80 && NR<=220 {print NR ":" $0}' "$VAULT" >> "$OUT" || true

  echo -e "\n### Shortlist + proposals section (approx lines 580-740)" >> "$OUT"
  awk 'NR>=580 && NR<=740 {print NR ":" $0}' "$VAULT" >> "$OUT" || true
else
  echo "Vault page not found at $VAULT" >> "$OUT"
fi

echo -e "\n---\nReport saved to: $OUT\n" >> "$OUT"
echo "Done. Report saved to $OUT"
