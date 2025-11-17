# Language Support

VisualIA supports **99 languages** using the multilingual Whisper model.

## Supported Languages

### Common Languages
- **en** - English
- **fr** - French
- **es** - Spanish
- **de** - German
- **it** - Italian
- **pt** - Portuguese
- **nl** - Dutch
- **pl** - Polish
- **ru** - Russian
- **zh** - Chinese
- **ja** - Japanese
- **ko** - Korean
- **ar** - Arabic
- **hi** - Hindi
- **tr** - Turkish
- **sv** - Swedish
- **no** - Norwegian
- **da** - Danish
- **fi** - Finnish
- **cs** - Czech
- **ro** - Romanian
- **el** - Greek
- **he** - Hebrew
- **th** - Thai
- **vi** - Vietnamese
- **id** - Indonesian
- **ms** - Malay
- **uk** - Ukrainian

And 71+ more languages...

## Usage

### Backend (C)

```bash
# Auto-detect language (recommended)
./build/visualia

# Specific language
./build/visualia -l fr      # French
./build/visualia -l es      # Spanish
./build/visualia -l de      # German
./build/visualia -l auto    # Auto-detect (explicit)
```

### Frontend (Electron)

```bash
# Auto-detect (default)
npm start --prefix frontend

# French
VISUALIA_LANG=fr npm start --prefix frontend

# Spanish
VISUALIA_LANG=es npm start --prefix frontend

# Japanese
VISUALIA_LANG=ja npm start --prefix frontend
```

## Model Comparison

| Model | Size | Languages | Speed | Accuracy |
|-------|------|-----------|-------|----------|
| whisper-base.en.gguf | 141MB | English only | Faster | Good for English |
| whisper-base.gguf | 141MB | 99 languages | Same | Good for all |
| whisper-small.en.gguf | 466MB | English only | Medium | Better |
| whisper-small.gguf | 466MB | 99 languages | Medium | Better |

## Recommendations

### For English Only
Use `whisper-base.en.gguf` with explicit `-l en`:
```bash
./build/visualia -m models/whisper-base.en.gguf -l en
```

### For Multilingual
Use `whisper-base.gguf` (default) with auto-detect:
```bash
./build/visualia -m models/whisper-base.gguf -l auto
```

### For Mixed Language Environments
Use auto-detect mode. Whisper will automatically identify the spoken language:
```bash
./build/visualia  # Auto-detect enabled by default
```

## Performance Notes

- **GPU Acceleration**: Enabled by default on Apple Silicon (Metal)
- **Latency**: ~3 second processing window
- **Auto-detect**: Adds minimal overhead (<100ms)
- **Language Lock**: Specifying a language can improve accuracy for that language

## Future Enhancements

- [ ] Dynamic language switching during runtime
- [ ] Language probability display
- [ ] Multi-language mode (detect code-switching)
- [ ] Translation to target language
- [ ] Language-specific pronunciation guides
