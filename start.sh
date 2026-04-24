#!/bin/bash

# ============================================
# AI Forestry & Timber Management - Start Script
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${GREEN}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   AI Forestry & Timber Management        ║"
echo "  ║   Starting Application...                ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Clean up used ports (3001 for backend, 5173 for frontend)
echo -e "${YELLOW}[1/6] Cleaning up ports...${NC}"
lsof -ti:3001 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:5173 2>/dev/null | xargs kill -9 2>/dev/null || true
echo -e "${GREEN}  ✓ Ports 3001 and 5173 cleared${NC}"

# Install dependencies
echo -e "${YELLOW}[2/6] Installing backend dependencies...${NC}"
cd "$(dirname "$0")"
npm install --silent 2>&1 | tail -1
echo -e "${GREEN}  ✓ Backend dependencies installed${NC}"

echo -e "${YELLOW}[3/6] Installing frontend dependencies...${NC}"
cd client
npm install --silent 2>&1 | tail -1
cd ..
echo -e "${GREEN}  ✓ Frontend dependencies installed${NC}"

# Check PostgreSQL
echo -e "${YELLOW}[4/6] Checking PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    echo -e "${RED}  ✗ PostgreSQL not found. Please install PostgreSQL.${NC}"
    exit 1
fi

# Create database if not exists
psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'forestry_management'" 2>/dev/null | grep -q 1 || \
    psql -U postgres -c "CREATE DATABASE forestry_management" 2>/dev/null || \
    createdb forestry_management 2>/dev/null || true
echo -e "${GREEN}  ✓ PostgreSQL ready${NC}"

# Seed database
echo -e "${YELLOW}[5/6] Seeding database...${NC}"
node server/seed.js
echo -e "${GREEN}  ✓ Database seeded${NC}"

# Start application with hot reload
echo -e "${YELLOW}[6/6] Starting application with hot reload...${NC}"
echo ""
echo -e "${CYAN}  Backend:  http://localhost:3001${NC}"
echo -e "${CYAN}  Frontend: http://localhost:5173${NC}"
echo -e "${CYAN}  Login:    admin@forestry.com / admin123${NC}"
echo ""
echo -e "${GREEN}  Press Ctrl+C to stop all services${NC}"
echo ""

# Trap to kill background processes on exit
trap 'kill $(jobs -p) 2>/dev/null; exit 0' SIGINT SIGTERM EXIT

# Start backend with nodemon (hot reload)
npx nodemon server/index.js --watch server &

# Start frontend with Vite (hot reload built-in)
cd client && npm run dev &

# Wait for all background processes
wait
