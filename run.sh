#!/bin/bash

# Kareerist Studio — Linux Launcher
# Starts Redis, Backend (FastAPI), and Frontend (Vite) in the correct order

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
    python3 -m venv .venv
    echo "   [setup] Installing dependencies..."
    .venv/bin/pip install -r requirements.txt -q
else
    # Ensure redis Python package is installed in the venv
    if ! .venv/bin/python3 -c "import redis" &>/dev/null; then
        echo "   [setup] Installing redis Python package..."
        .venv/bin/pip install "redis>=5.0.0" -q
    fi
fi

echo "   [ok] Starting FastAPI server..."
.venv/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &

# ─── 2. Frontend Setup & Start ────────────────────────────────────────────────
sleep 2

echo -e "\n${GREEN}[2/3] Starting Frontend (http://localhost:8080)${NC}"
cd "$ROOT_DIR/FRONTEND"

if [ ! -d "node_modules" ]; then
    echo "   [setup] Installing npm packages..."
    npm install
fi

echo "   [ok] Starting Vite dev server..."
npm run dev &

echo -e "\n${BLUE}================================================${NC}"
echo -e "${GREEN}  All services are running!${NC}"
echo -e "  Redis:    redis://localhost:6379"
echo -e "  Backend:  http://localhost:8000"
echo -e "  Frontend: http://localhost:8080"
echo -e "${BLUE}================================================${NC}"
echo -e "Press ${RED}Ctrl+C${NC} to stop all services.\n"

# Keep the script running
wait

