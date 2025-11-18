const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const BackendIPC = require('./backend-ipc');

let mainWindow = null;
let backendProcess = null;
let backendIPC = null;

function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width: width,
        height: height,  // Full screen height to show controls
        x: 0,
        y: 0,  // Position at top of screen
        transparent: true,
        backgroundColor: '#00000000',  // Fully transparent background
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        hasShadow: false,  // Disable window shadow
        vibrancy: null,  // Disable macOS vibrancy effects
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Make window click-through (non-interactive)
    mainWindow.setIgnoreMouseEvents(true);

    // Load the overlay UI
    mainWindow.loadFile(path.join(__dirname, 'overlay.html'));

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    console.log('[Electron] Window created');
}

function startBackend() {
    // Path to the C backend executable
    const backendPath = path.join(__dirname, '../../build/visualia');
    const modelFile = process.env.VISUALIA_MODEL || 'whisper-base.gguf';
    const modelPath = path.join(__dirname, '../../models', modelFile);
    const language = process.env.VISUALIA_LANG || 'auto';  // Default to auto-detect
    const targetLang = process.env.VISUALIA_TARGET_LANG || null;  // Translation target
    const translationModel = process.env.VISUALIA_TRANSLATION_MODEL || 'mt5-small';  // Translation model

    console.log('[Electron] Starting backend:', backendPath);
    console.log('[Electron] Model:', modelPath);
    console.log('[Electron] Language:', language);

    // Build backend arguments
    const args = ['-m', modelPath, '-l', language];

    // Add translation if enabled
    if (targetLang) {
        const translationModelPath = path.join(__dirname, '../../models', `${translationModel}.gguf`);
        console.log('[Electron] Translation enabled:', language, '→', targetLang);
        console.log('[Electron] Translation model:', translationModelPath);
        args.push('-t', targetLang);
        args.push('-T', translationModelPath);
    }

    backendProcess = spawn(backendPath, args, {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    // Initialize IPC handler
    backendIPC = new BackendIPC(backendProcess);

    // Handle messages from backend
    backendIPC.on('transcription', (data) => {
        if (mainWindow) {
            mainWindow.webContents.send('transcription', data);
        }
    });

    backendIPC.on('translation', (data) => {
        if (mainWindow) {
            mainWindow.webContents.send('translation', data);
        }
    });

    backendIPC.on('status', (data) => {
        console.log('[Backend Status]', data.message);
        if (mainWindow) {
            mainWindow.webContents.send('status', data);
        }
    });

    backendIPC.on('error', (data) => {
        console.error('[Backend Error]', data.message);
        if (mainWindow) {
            mainWindow.webContents.send('error', data);
        }
    });

    backendIPC.on('language_detected', (data) => {
        console.log('[Backend] Language detected:', data.language);
        if (mainWindow) {
            mainWindow.webContents.send('language_detected', data);
        }

        // Auto-switch to language-specific model if in auto mode
        const currentLang = process.env.VISUALIA_LANG || 'auto';
        if (currentLang === 'auto' && data.language) {
            console.log('[Electron] Auto-switching to language:', data.language);
            stopBackend();
            process.env.VISUALIA_LANG = data.language;
            setTimeout(() => {
                startBackend();
            }, 1000);
        }
    });

    // Handle backend process exit
    backendProcess.on('exit', (code) => {
        console.log(`[Electron] Backend exited with code ${code}`);
        backendIPC = null;
        backendProcess = null;
    });

    // Log backend stderr
    backendProcess.stderr.on('data', (data) => {
        console.log('[Backend]', data.toString().trim());
    });
}

function stopBackend() {
    if (backendProcess) {
        console.log('[Electron] Stopping backend...');
        backendProcess.kill('SIGTERM');
        backendProcess = null;
    }
    if (backendIPC) {
        backendIPC.cleanup();
        backendIPC = null;
    }
}

// App lifecycle
app.whenReady().then(() => {
    createWindow();
    startBackend();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    stopBackend();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopBackend();
});

// IPC handlers
ipcMain.on('toggle-click-through', (event, enabled) => {
    if (mainWindow) {
        mainWindow.setIgnoreMouseEvents(enabled);
    }
});

// Handle model change requests
ipcMain.on('change-model', (event, model) => {
    console.log('[Electron] Changing model to:', model);
    stopBackend();

    // Update model path based on selection
    const modelFiles = {
        'base': 'whisper-base.gguf',
        'small': 'whisper-small.gguf',
        'medium': 'whisper-medium.gguf',
        'large-v3': 'whisper-large-v3.gguf'
    };

    process.env.VISUALIA_MODEL = modelFiles[model] || 'whisper-base.gguf';

    setTimeout(() => {
        startBackend();
    }, 1000);
});

// Handle source language change requests
ipcMain.on('change-source-lang', (event, lang) => {
    console.log('[Electron] Changing source language to:', lang);
    stopBackend();

    process.env.VISUALIA_LANG = lang;

    setTimeout(() => {
        startBackend();
    }, 1000);
});

// Handle translation enable/disable and target language change
ipcMain.on('change-translation', (event, config) => {
    console.log('[Electron] Translation settings:', config);
    stopBackend();

    if (config.enabled && config.targetLang && config.targetLang !== 'none') {
        process.env.VISUALIA_TARGET_LANG = config.targetLang;
        process.env.VISUALIA_TRANSLATION_MODEL = config.translationModel || 'mt5-small';
    } else {
        delete process.env.VISUALIA_TARGET_LANG;
        delete process.env.VISUALIA_TRANSLATION_MODEL;
    }

    setTimeout(() => {
        startBackend();
    }, 1000);
});
