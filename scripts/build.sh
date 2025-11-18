#!/bin/bash
set -e

echo "=== Building VisualIA ==="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Build backend
echo -e "${BLUE}[1/3] Building C backend...${NC}"
cd "$PROJECT_ROOT"
mkdir -p build
cd build
cmake ..
cmake --build . -j$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
cd "$PROJECT_ROOT"

echo -e "${GREEN}✓ Backend built successfully${NC}"

# Install frontend dependencies
echo -e "${BLUE}[2/3] Installing frontend dependencies...${NC}"
cd "$PROJECT_ROOT/frontend"
npm install
cd "$PROJECT_ROOT"

echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# Check for models
echo -e "${BLUE}[3/3] Checking for AI models...${NC}"
MODEL_DIR="$PROJECT_ROOT/models"
mkdir -p "$MODEL_DIR"

# Check for Whisper models
WHISPER_MODELS=$(ls -1 "$MODEL_DIR"/whisper-*.gguf 2>/dev/null || true)
if [ -z "$WHISPER_MODELS" ]; then
    echo "⚠️  No Whisper models found."
    echo "Please download from: https://huggingface.co/ggerganov/whisper.cpp/tree/main"
    echo ""
    echo "Recommended: whisper-base.gguf (141MB)"
    echo "  wget -P models https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin"
    echo "  mv models/ggml-base.bin models/whisper-base.gguf"
else
    echo -e "${GREEN}✓ Whisper models found:${NC}"
    ls -1h "$MODEL_DIR"/whisper-*.gguf | sed 's/^/  /'
fi

# Check for translation models
MT5_MODELS=$(ls -1 "$MODEL_DIR"/mt5-*.gguf 2>/dev/null || true)
if [ -z "$MT5_MODELS" ]; then
    echo ""
    echo "ℹ️  No translation models found (optional)"
    echo "To enable translation, run:"
    echo "  bash scripts/setup_t5_translation.sh"
else
    echo ""
    echo -e "${GREEN}✓ Translation models found:${NC}"
    ls -1h "$MODEL_DIR"/mt5-*.gguf | sed 's/^/  /'
fi

echo ""
echo -e "${GREEN}=== Build complete! ===${NC}"
echo ""
echo "To run:"
echo "  npm start --prefix frontend"
echo ""
