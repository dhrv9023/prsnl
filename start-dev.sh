#!/bin/bash

# Kareerist Development Startup Script
# This script starts both backend and frontend servers

set -e

echo "🚀 Starting Kareerist Development Environment"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if backend is already running
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${RED}⚠️  Backend is already running on port 8000${NC}"
    echo "   Kill it with: kill \$(lsof -ti:8000)"
    echo ""
else
    echo -e "${BLUE}📦 Starting Backend Server...${NC}"
    cd backend
    uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    cd ..
    echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
    echo ""
fi

# Wait a bit for backend to start
sleep 2

# Check if frontend is already running
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${RED}⚠️  Frontend is already running on port 5173${NC}"
    echo "   Kill it with: kill \$(lsof -ti:5173)"
    echo ""
else
    echo -e "${BLUE}⚛️  Starting Frontend Server...${NC}"
    cd FRONTEND
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
    echo ""
fi

echo "=============================================="
echo -e "${GREEN}✓ Development environment is ready!${NC}"
echo ""
echo "📍 Backend:  http://localhost:8000"
echo "📍 Frontend: http://localhost:5173"
echo "📍 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "=============================================="

# Wait for Ctrl+C
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
