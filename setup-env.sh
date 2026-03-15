#!/bin/bash
# Creates .env files for local development if they don't exist yet.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Frontend .env ────────────────────────────────────────────────────
ENV_FILE="$SCRIPT_DIR/atelier-app/.env"
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<'EOF'
VITE_API_URL=http://localhost:3001
EOF
  echo "✅ Created $ENV_FILE"
else
  echo "⏭️  $ENV_FILE already exists — skipped"
fi

# ── Backend .env (from .env.example if available) ────────────────────
BACKEND_ENV="$SCRIPT_DIR/atelier-backend/.env"
BACKEND_EXAMPLE="$SCRIPT_DIR/atelier-backend/.env.example"
if [ ! -f "$BACKEND_ENV" ] && [ -f "$BACKEND_EXAMPLE" ]; then
  cp "$BACKEND_EXAMPLE" "$BACKEND_ENV"
  echo "✅ Created $BACKEND_ENV (from .env.example — please edit secrets!)"
elif [ ! -f "$BACKEND_ENV" ]; then
  echo "⚠️  No $BACKEND_EXAMPLE found — create $BACKEND_ENV manually"
else
  echo "⏭️  $BACKEND_ENV already exists — skipped"
fi

echo ""
echo "Done. Run 'cd atelier-app && npm run build && npx cap sync ios' to rebuild."
