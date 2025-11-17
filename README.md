# VisualIA

Real-time AI assistant with screen understanding, live subtitles, translation, and contextual information.

## Features

- **Live Subtitles**: Real-time speech transcription using Whisper
- **Screen Understanding**: Visual context with LLaVA (coming soon)
- **Translation**: Real-time language translation (coming soon)
- **Context-Aware**: Definitions, pronunciation, and information on demand (coming soon)

## Architecture

- **Backend**: C-based audio processing with whisper.cpp and llama.cpp
- **Frontend**: Electron overlay for transparent subtitle display
- **IPC**: JSON-RPC communication between backend and frontend

## Prerequisites

- CMake 3.15+
- C compiler (GCC/Clang/MSVC)
- Node.js 18+
- Git

## Building

### 1. Clone with submodules
```bash
git submodule update --init --recursive
```

### 2. Build backend
```bash
mkdir build && cd build
cmake ..
cmake --build .
```

### 3. Install frontend dependencies
```bash
cd frontend
npm install
```

### 4. Download models
Place Whisper models in `models/` directory:
- Recommended: `whisper-small.en.gguf` or `whisper-base.en.gguf`
- Download from: https://huggingface.co/ggerganov/whisper.cpp

## Quick Start

### Option 1: Automated Setup
```bash
bash scripts/setup.sh
```

### Option 2: Manual Setup
```bash
# 1. Initialize submodules
git submodule update --init --recursive

# 2. Build
bash scripts/build.sh

# 3. Download Whisper model
# Get from: https://huggingface.co/ggerganov/whisper.cpp/tree/main
# Place in models/whisper-base.en.gguf
```

## Usage

### Start the application
```bash
# Start frontend (automatically launches backend with auto-detect)
cd frontend
npm start

# Specify language
VISUALIA_LANG=fr npm start  # French
VISUALIA_LANG=es npm start  # Spanish
VISUALIA_LANG=ja npm start  # Japanese
```

### Standalone Backend Testing
```bash
# Auto-detect language (default)
./build/visualia

# Specific language
./build/visualia -l fr      # French
./build/visualia -l es      # Spanish
./build/visualia -l en      # English

# Custom model
./build/visualia -m models/whisper-small.gguf -l auto

# Show help
./build/visualia -h
```

### Language Support
VisualIA supports **99 languages** including:
- English, French, Spanish, German, Italian, Portuguese
- Chinese, Japanese, Korean
- Arabic, Hindi, Russian
- And many more!

See [LANGUAGES.md](LANGUAGES.md) for the complete list and usage details.

## Development Status

- [x] Project structure
- [ ] Audio capture (cross-platform)
- [ ] Whisper integration
- [ ] IPC layer
- [ ] Electron overlay
- [ ] Live subtitle display
- [ ] Screen capture
- [ ] LLaVA integration
- [ ] Translation
- [ ] Context features

## License

MIT
