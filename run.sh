#!/bin/bash

# Kareerist Studio — Local Development Launcher (Linux/WSL only)
# Starts Redis, Backend (FastAPI), and Frontend (Vite) in the correct order
#
# ⚠️  PRODUCTION DEPLOYMENT (Render):
#     Do NOT use this script in production. Set the Render start command to:
#       uvicorn app.main:app --host 0.0.0.0 --port $PORT
#     Working directory: backend/
#
# ⚠️  This script uses WSL-specific commands (hostname -I, setsid) and will
#     not work in standard Docker containers or macOS.
#
# ⚠️  CSRF TESTING (May 2026):
#     In development, SameSite=Lax is used (CSRF middleware is disabled).
#     To test CSRF protection locally:
#       1. Set ENVIRONMENT=production in backend/app/.env
#       2. Set COOKIE_SECURE=true in backend/app/.env
#       3. Set COOKIE_SAMESITE=none in backend/app/.env
#       4. Restart the backend (Ctrl+C and run this script again)
#       5. The CSRF middleware will now enforce double-submit validation
#     See TESTING_WORKFLOW.md for more details.

# Colors for better output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   KAREERIST STUDIO — Starting All Services    ${NC}"
echo -e "${BLUE}================================================${NC}"

# Function to kill background processes on exit
cleanup() {
    echo -e "\n${RED}Stopping all services...${NC}"
    kill $(jobs -p) 2>/dev/null

    # Stop the Redis instance we started (if any)
    if [ -n "$REDIS_PID" ]; then
        echo -e "${YELLOW}   [redis] Shutting down Redis (PID $REDIS_PID)...${NC}"
        kill "$REDIS_PID" 2>/dev/null
    fi
    exit
}

trap cleanup SIGINT SIGTERM EXIT

# Get the directory where the script is located
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── 0. Redis ─────────────────────────────────────────────────────────────────
echo -e "\n${GREEN}[0/3] Checking Redis...${NC}"

if ! command -v redis-server &>/dev/null; then
    echo -e "   ${YELLOW}[setup] redis-server not found. Installing via apt...${NC}"
    sudo apt-get install -y redis-server
fi

# Check if Redis is already running on port 6379
if redis-cli ping &>/dev/null; then
    echo -e "   ${GREEN}[ok] Redis is already running on port 6379.${NC}"
else
    echo -e "   [ok] Starting Redis server..."
    redis-server --daemonize no --port 6379 &
    REDIS_PID=$!
    sleep 1  # Give Redis a moment to start

    if redis-cli ping &>/dev/null; then
        echo -e "   ${GREEN}[ok] Redis started (PID $REDIS_PID) — responding to PING.${NC}"
    else
        echo -e "   ${RED}[error] Redis failed to start! Interview sessions will NOT work.${NC}"
    fi
fi

# ─── 1. Backend Setup & Start ─────────────────────────────────────────────────
echo -e "\n${GREEN}[1/3] Starting Backend (http://localhost:8000)${NC}"
cd "$ROOT_DIR/backend"

if [ ! -d ".venv" ]; then
    echo "   [setup] Creating virtual environment..."
    if ! python3 -m venv .venv; then
        echo -e "   ${RED}[error] Virtual environment creation failed.${NC}"
        echo -e "   ${YELLOW}Please follow the instructions above (e.g., run 'sudo apt install python3-venv').${NC}"
        rm -rf .venv
        exit 1
    fi
    echo "   [setup] Installing dependencies..."
    if ! .venv/bin/pip install -r requirements.txt -q; then
        echo -e "   ${RED}[error] Failed to install backend dependencies.${NC}"
        exit 1
    fi
else
    # Ensure redis Python package is installed in the venv
    if ! .venv/bin/python3 -c "import redis" &>/dev/null; then
        echo "   [setup] Installing redis Python package..."
        .venv/bin/pip install "redis>=5.0.0" -q
    fi
fi

# Check CSRF testing mode
CSRF_MODE="disabled (development mode)"
if grep -q "ENVIRONMENT=production" app/.env 2>/dev/null; then
    CSRF_MODE="enabled (production mode)"
fi

echo "   [ok] Starting FastAPI server..."
echo "   [info] CSRF protection: $CSRF_MODE"
# setsid creates a new process group so the backend survives shell transitions on WSL.
# --no-reload is already the default (no flag needed); output to backend.log for post-mortem.
setsid .venv/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!

# Give the backend enough time to fully initialise (Supabase + Redis client setup can take a few seconds)
echo "   [wait] Waiting for backend to initialise (up to 20 s)..."
READY=0
for i in $(seq 1 10); do
    sleep 2
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "   ${RED}[error] Backend process died! Last 15 lines of backend.log:${NC}"
        tail -n 15 backend.log
        exit 1
    fi
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        READY=1
        break
    fi
    echo "   [wait] Not ready yet (attempt $i/10)..."
done

if [ "$READY" -eq 1 ]; then
    echo -e "   ${GREEN}[ok] Backend is healthy on http://localhost:8000${NC}"
else
    echo -e "   ${YELLOW}[warn] Backend took too long to respond. It may still be starting. Check backend.log.${NC}"
fi

# ─── 2. Frontend Setup & Start ────────────────────────────────────────────────
sleep 2

echo -e "\n${GREEN}[2/3] Starting Frontend (http://localhost:8080)${NC}"
cd "$ROOT_DIR/FRONTEND"

if [ ! -d "node_modules" ]; then
    echo "   [setup] Installing npm packages..."
    npm install
fi

# Fix WSL2 localhost port forwarding issue when Vite runs via Windows Node executable
echo "   [setup] Configuring proxy IP for WSL2 networking..."
WSL_IP=$(hostname -I | awk '{print $1}')

# Write .env.local — preserves any existing VITE_SUPABASE_* vars already in the file,
# only updates VITE_WSL_IP and VITE_API_BASE.
ENV_FILE=".env.local"

# Start fresh with the dynamic values
{
  echo "VITE_WSL_IP=$WSL_IP"
  # Leave VITE_API_BASE empty — Vite proxy handles /api → http://$WSL_IP:8000
  echo "VITE_API_BASE="
  # Carry over VITE_SUPABASE_* from the existing file if present
  if [ -f "$ENV_FILE" ]; then
    grep "^VITE_SUPABASE_" "$ENV_FILE" || true
  fi
} > "${ENV_FILE}.tmp" && mv "${ENV_FILE}.tmp" "$ENV_FILE"

# If Supabase vars are still missing, warn the user
if ! grep -q "VITE_SUPABASE_URL" "$ENV_FILE"; then
  echo -e "   ${YELLOW}[warn] VITE_SUPABASE_URL not set in FRONTEND/.env.local — Google OAuth will not work.${NC}"
  echo -e "   ${YELLOW}       Add these lines to FRONTEND/.env.local:${NC}"
  echo -e "   ${YELLOW}       VITE_SUPABASE_URL=https://<your-project>.supabase.co${NC}"
  echo -e "   ${YELLOW}       VITE_SUPABASE_ANON_KEY=<your-anon-key>${NC}"
fi

echo "   [info] Backend proxy target: http://$WSL_IP:8000"
echo "   [info] All /api requests will be proxied to the local backend"

echo "   [ok] Starting Vite dev server..."
npm run dev &

echo -e "\n${BLUE}================================================${NC}"
echo -e "${GREEN}  All services are running!${NC}"
echo -e "  Redis:    redis://localhost:6379"
echo -e "  Backend:  http://localhost:8000"
echo -e "  Frontend: http://localhost:8080"
echo -e "${BLUE}================================================${NC}"
echo -e "\n${YELLOW}CSRF Testing:${NC}"
echo -e "  Current mode: $CSRF_MODE"
echo -e "  To test CSRF protection locally:"
echo -e "    1. Edit backend/app/.env and set:"
echo -e "       ENVIRONMENT=production"
echo -e "       COOKIE_SECURE=true"
echo -e "       COOKIE_SAMESITE=none"
echo -e "    2. Restart this script (Ctrl+C and run again)"
echo -e "    3. CSRF middleware will now enforce double-submit validation"
echo -e "\n${BLUE}================================================${NC}"
echo -e "Press ${RED}Ctrl+C${NC} to stop all services.\n"

# Keep the script running
wait