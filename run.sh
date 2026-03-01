#!/bin/bash

BOLD="\033[1m"
DIM="\033[2m"
RESET="\033[0m"
CYAN="\033[36m"
GREEN="\033[32m"
RED="\033[31m"
YELLOW="\033[33m"
BLUE="\033[34m"
WHITE="\033[97m"
BG_NAVY="\033[48;2;15;23;42m"
BG_BLUE="\033[44m"

clear

echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                            ║"
echo "║   ██████╗ ███╗   ███╗    ██╗    ██╗███████╗██████╗                          ║"
echo "║   ██╔══██╗████╗ ████║    ██║    ██║██╔════╝██╔══██╗                         ║"
echo "║   ██████╔╝██╔████╔██║    ██║ █╗ ██║█████╗  ██████╔╝                         ║"
echo "║   ██╔═══╝ ██║╚██╔╝██║    ██║███╗██║██╔══╝  ██╔══██╗                         ║"
echo "║   ██║     ██║ ╚═╝ ██║    ╚███╔███╔╝███████╗██████╔╝                         ║"
echo "║   ╚═╝     ╚═╝     ╚═╝     ╚══╝╚══╝ ╚══════╝╚═════╝                          ║"
echo "║                                                                            ║"
echo "║              ██████╗ ██╗     ██╗   ██╗████████╗██╗ ██████╗ ███╗   ██╗      ║"
echo "║             ██╔════╝ ██║     ██║   ██║╚══██╔══╝██║██╔═══██╗████╗  ██║      ║"
echo "║             ╚█████╗  ██║     ██║   ██║   ██║   ██║██║   ██║██╔██╗ ██║      ║"
echo "║              ╚═══██╗ ██║     ██║   ██║   ██║   ██║██║   ██║██║╚██╗██║      ║"
echo "║             ██████╔╝ ███████╗╚██████╔╝   ██║   ██║╚██████╔╝██║ ╚████║      ║"
echo "║             ╚═════╝  ╚══════╝ ╚═════╝    ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝      ║"
echo "║                                                                            ║"
echo "╠════════════════════════════════════════════════════════════════════════════╣"
echo "║                                                                            ║"
echo "║                     P M   W E B   S O L U T I O N S                        ║"
echo "║                                                                            ║"
echo "║           Suvidha City Chemist / Suvidha Pharmacy Pro v1.0.0               ║"
echo "║                                                                            ║"
echo "╠════════════════════════════════════════════════════════════════════════════╣"
echo "║                                                                            ║"
echo "║                       ॥ श्री राम ॥  ║  Shri Ram  ║                         ║"
echo "║                                                                            ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo -e "${RESET}"
echo ""

print_status() {
    local status=$1
    local label=$2
    local value=$3
    case $status in
        ok)    echo -e "  │  ${GREEN}[✓]${RESET}  $label : ${GREEN}$value${RESET}" ;;
        fail)  echo -e "  │  ${RED}[✗]${RESET}  $label : ${RED}$value${RESET}" ;;
        warn)  echo -e "  │  ${YELLOW}[!]${RESET}  $label : ${YELLOW}$value${RESET}" ;;
        info)  echo -e "  │  ${CYAN}[~]${RESET}  $label : ${CYAN}$value${RESET}" ;;
    esac
}

echo -e "${WHITE}${BOLD}  ┌─ PHASE 1: Environment Verification ─────────────────────────────────────┐${RESET}"
echo "  │                                                                         │"

if command -v node &> /dev/null; then
    NODE_VER=$(node --version)
    print_status "ok" "Node.js           " "$NODE_VER"
else
    print_status "fail" "Node.js           " "NOT FOUND - Please install Node.js 18+"
    echo "  └─────────────────────────────────────────────────────────────────────────┘"
    echo -e "\n  ${RED}FATAL: Node.js is required.${RESET}"
    exit 1
fi

if command -v npm &> /dev/null; then
    NPM_VER=$(npm --version)
    print_status "ok" "npm               " "v$NPM_VER"
else
    print_status "fail" "npm               " "NOT FOUND"
    echo "  └─────────────────────────────────────────────────────────────────────────┘"
    exit 1
fi

PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
fi

if [ -n "$PYTHON_CMD" ]; then
    PY_VER=$($PYTHON_CMD --version 2>&1)
    print_status "ok" "Python            " "$PY_VER"
else
    print_status "warn" "Python            " "NOT FOUND - AI Service unavailable"
fi

PIP_CMD=""
if command -v pip3 &> /dev/null; then
    PIP_CMD="pip3"
elif command -v pip &> /dev/null; then
    PIP_CMD="pip"
fi

if [ -n "$PIP_CMD" ]; then
    print_status "ok" "pip               " "Installed"
else
    print_status "warn" "pip               " "NOT FOUND"
fi

echo "  │                                                                         │"
echo -e "${WHITE}${BOLD}  └─────────────────────────────────────────────────────────────────────────┘${RESET}"
echo ""

echo -e "${WHITE}${BOLD}  ┌─ PHASE 2: Dependency Check & Installation ──────────────────────────────┐${RESET}"
echo "  │                                                                         │"

if [ -d "node_modules" ]; then
    print_status "ok" "Node modules      " "Found ($(ls node_modules | wc -l) packages)"
else
    print_status "info" "Node modules      " "Not found - Installing..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "ok" "Node modules      " "Installed successfully"
    else
        print_status "fail" "Node modules      " "Installation FAILED"
        exit 1
    fi
fi

if [ -f "ai-service/requirements.txt" ] && [ -n "$PIP_CMD" ]; then
    MISSING=0
    while IFS= read -r line; do
        pkg=$(echo "$line" | cut -d'=' -f1 | tr '-' '_')
        $PYTHON_CMD -c "import $pkg" 2>/dev/null || MISSING=1
    done < <(grep -v '^#' ai-service/requirements.txt | grep -v '^$' | head -3)

    if [ $MISSING -eq 0 ]; then
        print_status "ok" "AI Service deps   " "All packages found"
    else
        print_status "info" "AI Service deps   " "Installing..."
        $PIP_CMD install -r ai-service/requirements.txt -q 2>/dev/null
        if [ $? -eq 0 ]; then
            print_status "ok" "AI Service deps   " "Installed successfully"
        else
            print_status "warn" "AI Service deps   " "Some packages failed (non-critical)"
        fi
    fi
else
    print_status "warn" "AI Service deps   " "Skipped (Python/pip not available)"
fi

echo "  │                                                                         │"
echo -e "${WHITE}${BOLD}  └─────────────────────────────────────────────────────────────────────────┘${RESET}"
echo ""

echo -e "${WHITE}${BOLD}  ┌─ PHASE 3: Database Setup ───────────────────────────────────────────────┐${RESET}"
echo "  │                                                                         │"

if [ -n "$DATABASE_URL" ]; then
    print_status "ok" "DATABASE_URL      " "Configured"
    print_status "info" "Schema sync       " "Pushing schema..."
    npx drizzle-kit push > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_status "ok" "Schema sync       " "Complete"
    else
        print_status "warn" "Schema sync       " "Check database connection"
    fi
else
    print_status "warn" "DATABASE_URL      " "NOT SET - Database features disabled"
fi

echo "  │                                                                         │"
echo -e "${WHITE}${BOLD}  └─────────────────────────────────────────────────────────────────────────┘${RESET}"
echo ""

echo -e "${WHITE}${BOLD}  ┌─ PHASE 4: Starting Services ────────────────────────────────────────────┐${RESET}"
echo "  │                                                                         │"

AI_STATUS="${RED}● OFFLINE${RESET}"
if [ -f "ai-service/app.py" ] && [ -n "$PYTHON_CMD" ]; then
    print_status "info" "AI Service        " "Starting on port 8000..."
    cd ai-service && $PYTHON_CMD app.py &
    AI_PID=$!
    cd ..
    sleep 3

    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        print_status "ok" "AI Service        " "RUNNING (PID: $AI_PID, port 8000)"
        AI_STATUS="${GREEN}● RUNNING${RESET}"
    else
        print_status "warn" "AI Service        " "Started (PID: $AI_PID) - warming up..."
        AI_STATUS="${YELLOW}● STARTING${RESET}"
    fi
else
    print_status "warn" "AI Service        " "Skipped"
fi

print_status "info" "Backend + Frontend" "Launching on port 5000..."

echo "  │                                                                         │"
echo -e "${WHITE}${BOLD}  └─────────────────────────────────────────────────────────────────────────┘${RESET}"
echo ""

echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                            ║"
echo "║           ███████╗████████╗ █████╗ ████████╗██╗   ██╗███████╗              ║"
echo "║           ██╔════╝╚══██╔══╝██╔══██╗╚══██╔══╝██║   ██║██╔════╝              ║"
echo "║           ███████╗   ██║   ███████║   ██║   ██║   ██║███████╗              ║"
echo "║           ╚════██║   ██║   ██╔══██║   ██║   ██║   ██║╚════██║              ║"
echo "║           ███████║   ██║   ██║  ██║   ██║   ╚██████╔╝███████║              ║"
echo "║           ╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚══════╝              ║"
echo "║                                                                            ║"
echo "╠════════════════════════════════════════════════════════════════════════════╣"
echo -e "║                                                                            ║${RESET}"
echo -e "║   ${BOLD}SERVICE              PORT       STATUS${RESET}                                   ║"
echo "║   ─────────────────────────────────────────────                             ║"
echo -e "║   AI Microservice       8000       $AI_STATUS                     ║"
echo -e "║   Backend (Express)     5000       ${GREEN}● LAUNCHING${RESET}                           ║"
echo -e "║   Frontend (Vite)       5000       ${GREEN}● LAUNCHING${RESET}                           ║"
echo "║                                                                            ║"
echo -e "${CYAN}${BOLD}╠════════════════════════════════════════════════════════════════════════════╣${RESET}"
echo "║                                                                            ║"
echo -e "║   ${BOLD}ACCESS URLS:${RESET}                                                             ║"
echo -e "║   ${GREEN}●${RESET} App:        ${CYAN}http://localhost:5000${RESET}                                      ║"
echo -e "║   ${GREEN}●${RESET} AI Health:  ${CYAN}http://localhost:8000/health${RESET}                               ║"
echo "║                                                                            ║"
echo -e "║   ${BOLD}DEFAULT CREDENTIALS:${RESET}                                                    ║"
echo -e "║   ${GREEN}●${RESET} Admin:    admin / password123                                          ║"
echo -e "║   ${GREEN}●${RESET} Manager:  manager1 / password123                                       ║"
echo -e "║   ${GREEN}●${RESET} Cashier:  cashier1 / password123                                       ║"
echo "║                                                                            ║"
echo -e "${CYAN}${BOLD}╠════════════════════════════════════════════════════════════════════════════╣${RESET}"
echo "║                                                                            ║"
echo -e "║              ${BOLD}Powered by PM Web Solutions │ ॥ श्री राम ॥${RESET}                     ║"
echo -e "║          ${DIM}Suvidha Pharmacy Pro v1.0.0 │ All Rights Reserved${RESET}                 ║"
echo "║                                                                            ║"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${DIM}Press Ctrl+C to stop all services${RESET}"
echo ""

cleanup() {
    echo ""
    echo -e "${YELLOW}${BOLD}  Shutting down services...${RESET}"
    if [ -n "$AI_PID" ]; then
        kill $AI_PID 2>/dev/null
        echo -e "  ${GREEN}[✓]${RESET}  AI Service stopped"
    fi
    echo -e "  ${GREEN}[✓]${RESET}  All services stopped"
    echo -e "\n  ${CYAN}${BOLD}Thank you for using Suvidha Pharmacy Pro | PM Web Solutions${RESET}\n"
    exit 0
}

trap cleanup SIGINT SIGTERM

npm run dev
