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
echo -e "${BLUE}[2/3] Running build...${NC}"
bash scripts/build.sh

# Ask about translation setup
echo ""
echo -e "${BLUE}[3/3] Translation setup (optional)${NC}"
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
read -p "Enter choice [1-5] (default: 1): " choice
choice=${choice:-1}

case $choice in
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
