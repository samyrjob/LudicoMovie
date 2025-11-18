#!/bin/bash
set -e

echo "=== Setting up VisualIA ==="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Initialize git submodules
echo -e "${BLUE}[1/3] Initializing git submodules...${NC}"
git submodule update --init --recursive

echo -e "${GREEN}✓ Submodules initialized${NC}"

# Run build
echo -e "${BLUE}[2/4] Running build...${NC}"
bash scripts/build.sh

# Ask about Whisper model setup
echo ""
echo -e "${BLUE}[3/4] Whisper model setup${NC}"
echo -e "${YELLOW}Which Whisper model size would you like to download?${NC}"
echo "Whisper is used for speech recognition (99 languages)."
echo ""
echo "Options:"
echo "  1) whisper-base      (~141MB, recommended - good quality, fast)"
echo "  2) whisper-small     (~466MB, better quality)"
echo "  3) whisper-medium    (~769MB, great quality)"
echo "  4) whisper-large-v3  (~1.5GB, best quality)"
echo "  5) Skip (download manually later)"
echo ""
read -p "Enter choice [1-5] (default: 1): " whisper_choice
whisper_choice=${whisper_choice:-1}

MODELS_DIR="models"
mkdir -p "$MODELS_DIR"

case $whisper_choice in
    1)
        echo -e "${BLUE}Downloading whisper-base.gguf...${NC}"
        wget -P "$MODELS_DIR" https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
        mv "$MODELS_DIR/ggml-base.bin" "$MODELS_DIR/whisper-base.gguf"
        echo -e "${GREEN}✓ whisper-base.gguf installed${NC}"
        ;;
    2)
        echo -e "${BLUE}Downloading whisper-small.gguf...${NC}"
        wget -P "$MODELS_DIR" https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin
        mv "$MODELS_DIR/ggml-small.bin" "$MODELS_DIR/whisper-small.gguf"
        echo -e "${GREEN}✓ whisper-small.gguf installed${NC}"
        ;;
    3)
        echo -e "${BLUE}Downloading whisper-medium.gguf...${NC}"
        wget -P "$MODELS_DIR" https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin
        mv "$MODELS_DIR/ggml-medium.bin" "$MODELS_DIR/whisper-medium.gguf"
        echo -e "${GREEN}✓ whisper-medium.gguf installed${NC}"
        ;;
    4)
        echo -e "${BLUE}Downloading whisper-large-v3.gguf...${NC}"
        wget -P "$MODELS_DIR" https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin
        mv "$MODELS_DIR/ggml-large-v3.bin" "$MODELS_DIR/whisper-large-v3.gguf"
        echo -e "${GREEN}✓ whisper-large-v3.gguf installed${NC}"
        ;;
    *)
        echo -e "${YELLOW}Skipping Whisper model download. You can download manually:${NC}"
        echo "  wget -P models https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin"
        echo "  mv models/ggml-base.bin models/whisper-base.gguf"
        ;;
esac

# Ask about translation setup
echo ""
echo -e "${BLUE}[4/4] Translation setup (optional)${NC}"
echo -e "${YELLOW}Do you want to set up live translation with MT5 models?${NC}"
echo "This enables real-time translation between 15+ languages."
echo ""
echo "Options:"
echo "  1) Skip (transcription only)"
echo "  2) Install mt5-small  (~300MB, recommended)"
echo "  3) Install mt5-base   (~580MB, better quality)"
echo "  4) Install mt5-large  (~1.2GB, best quality)"
echo "  5) Install all sizes"
echo ""
read -p "Enter choice [1-5] (default: 1): " mt5_choice
mt5_choice=${mt5_choice:-1}

case $mt5_choice in
    2)
        echo -e "${BLUE}Installing mt5-small...${NC}"
        bash scripts/setup_t5_translation.sh google/mt5-small
        ;;
    3)
        echo -e "${BLUE}Installing mt5-base...${NC}"
        bash scripts/setup_t5_translation.sh google/mt5-base
        ;;
    4)
        echo -e "${BLUE}Installing mt5-large...${NC}"
        bash scripts/setup_t5_translation.sh google/mt5-large
        ;;
    5)
        echo -e "${BLUE}Installing all MT5 model sizes...${NC}"
        bash scripts/setup_t5_translation.sh google/mt5-small
        bash scripts/setup_t5_translation.sh google/mt5-base
        bash scripts/setup_t5_translation.sh google/mt5-large
        ;;
    *)
        echo -e "${YELLOW}Skipping translation setup. You can run it later with:${NC}"
        echo "  bash scripts/setup_t5_translation.sh"
        ;;
esac

echo ""
echo -e "${GREEN}=== Setup complete! ===${NC}"
echo ""
echo "To run VisualIA:"
echo "  cd frontend && npm start"
echo ""
