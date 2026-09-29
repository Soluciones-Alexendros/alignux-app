#!/usr/bin/env bash
set -euo pipefail

DIST="${1:-dist}"

fail() {
  echo "FAIL: $1"
  exit 1
}

[ -d "$DIST" ] || fail "dist/ not found (build must run first)"

CSS_FILES=$(ls "$DIST"/_astro/*.css 2>/dev/null || true)
[ -n "$CSS_FILES" ] || fail "no CSS found in dist/_astro"

# Third-party fonts
if grep -rqi "fonts.gstatic.com" "$DIST"; then
  fail "third-party font host found (fonts.gstatic.com)"
fi

# Third-party analytics
if grep -rqE "window\.va|vercel-insights|vercel-analytics" "$DIST"; then
  fail "third-party analytics found"
fi

# Reduced-motion gate
grep -qi "prefers-reduced-motion" $CSS_FILES || fail "missing prefers-reduced-motion gate"

# Dual theme-color metas
grep -Eq 'theme-color[^>]*#f6f8fc[^>]*prefers-color-scheme[^>]*light' "$DIST/index.html" \
  || fail "missing light theme-color meta"
grep -Eq 'theme-color[^>]*#0a1224[^>]*prefers-color-scheme[^>]*dark' "$DIST/index.html" \
  || fail "missing dark theme-color meta"

# Self-hosted fonts only
if grep -rqi "Space Grotesk" $CSS_FILES; then
  fail "Space Grotesk font present"
fi
grep -q "font-family:Inter" $CSS_FILES || fail "Inter font-family missing"
grep -q "font-family:JetBrains Mono" $CSS_FILES || fail "JetBrains Mono font-family missing"

# Theme bootstrap survives in the document
grep -Eq "localStorage.getItem[^)]*alignux-theme" "$DIST/index.html" || fail "theme bootstrap missing"

# Tokens / scheme invariants
grep -q "color-scheme:dark" $CSS_FILES || fail "color-scheme:dark missing"
grep -qiE "#00ff41|var\(--matrix\)" $CSS_FILES || fail "matrix brand token missing"
grep -qE "color-mix[^;]*var\(--brand\)" $CSS_FILES || fail "color-mix brand usage missing"

# P0 regressions
[ -f "$DIST/status.json" ] || fail "status.json is not copied into dist/ (must live in public/)"
[ ! -d "$DIST/scripts" ] || fail "verbatim public/scripts/ copied into dist/ (P0-c regression)"

# NOTE: OKLCH is intentional (token layer is authored in OKLCH). Unlike the
# legacy parent gate, this check does not reject oklch color functions.

echo "=== FRONTEND CHECKS PASSED ==="
