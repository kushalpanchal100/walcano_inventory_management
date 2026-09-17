#!/usr/bin/env bash

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Find uvicorn executable (prefer conda env if present)
CONDA_UVICORN="/home/kushal/miniconda3/envs/inventory_management/bin/uvicorn"
if [ -x "$CONDA_UVICORN" ]; then
    UVICORN_BIN="$CONDA_UVICORN"
elif command -v uvicorn >/dev/null 2>&1; then
    UVICORN_BIN="uvicorn"
else
    UVICORN_BIN="python3 -m uvicorn"
fi

check_and_free_port() {
    local port=$1
    local name=$2
    if fuser "${port}/tcp" >/dev/null 2>&1; then
        echo "⚠️  Port $port ($name) is currently in use. Freeing port..."
        fuser -k -15 "${port}/tcp" >/dev/null 2>&1 || true
        sleep 1
    elif lsof -ti:"$port" >/dev/null 2>&1; then
        echo "⚠️  Port $port ($name) is currently in use. Freeing port..."
        kill -15 $(lsof -ti:"$port") 2>/dev/null || true
        sleep 1
    fi
}

start_backend() {
    check_and_free_port 8000 "Backend"
    echo "=========================================="
    echo "🚀 Starting Walcano Backend (FastAPI)..."
    echo "   URL:  http://localhost:8000"
    echo "   Docs: http://localhost:8000/docs"
    echo "=========================================="
    cd "$BACKEND_DIR"
    export PYTHONPATH="$BACKEND_DIR"
    exec "$UVICORN_BIN" app.main:application --host 0.0.0.0 --port 8000 --reload
}

start_frontend() {
    check_and_free_port 3000 "Frontend"
    echo "=========================================="
    echo "🌐 Starting Walcano Frontend (Next.js)..."
    echo "   URL: http://localhost:3000"
    echo "=========================================="
    cd "$FRONTEND_DIR"
    exec npm run dev -- -p 3000
}

start_both() {
    check_and_free_port 8000 "Backend"
    check_and_free_port 3000 "Frontend"

    echo "=========================================="
    echo "🚀 Starting Walcano Full Stack..."
    echo "   Backend:  http://localhost:8000 (docs at /docs)"
    echo "   Frontend: http://localhost:3000"
    echo "=========================================="

    cleanup() {
        # Unset trap to prevent recursive loop
        trap - SIGINT SIGTERM
        echo -e "\n🛑 Stopping all services..."
        if [ -n "$BACKEND_PID" ]; then
            kill "$BACKEND_PID" 2>/dev/null || true
        fi
        if [ -n "$FRONTEND_PID" ]; then
            kill "$FRONTEND_PID" 2>/dev/null || true
        fi
        wait 2>/dev/null || true
        exit 0
    }

    trap cleanup SIGINT SIGTERM

    # Start backend
    cd "$BACKEND_DIR"
    export PYTHONPATH="$BACKEND_DIR"
    "$UVICORN_BIN" app.main:application --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!

    # Start frontend
    cd "$FRONTEND_DIR"
    npm run dev -- -p 3000 &
    FRONTEND_PID=$!

    # Keep waiting for processes
    wait
}

MODE="${1:-backend}"

case "$MODE" in
    backend|server|api)
        start_backend
        ;;
    frontend|web|client)
        start_frontend
        ;;
    all|both|full)
        start_both
        ;;
    *)
        echo "Usage: ./run.sh [backend|frontend|both]"
        echo "  ./run.sh          - Starts FastAPI backend on :8000 (default)"
        echo "  ./run.sh frontend - Starts Next.js frontend on :3000"
        echo "  ./run.sh both     - Starts both backend & frontend together"
        exit 1
        ;;
esac
