const { ipcRenderer } = require('electron');

// DOM elements
const subtitleBox = document.getElementById('subtitle-box');
const originalText = document.getElementById('original-text');
const translationText = document.getElementById('translation-text');
const translationRow = document.getElementById('translation-row');
const statusElement = document.getElementById('status');
const statusText = document.getElementById('status-text');

// Control elements
const modelSelect = document.getElementById('model-select');
const sourceLangSelect = document.getElementById('source-lang-select');
const targetLangSelect = document.getElementById('target-lang-select');
const translationToggle = document.getElementById('translation-toggle');
const targetLangGroup = document.getElementById('target-lang-group');
const translationModelSelect = document.getElementById('translation-model-select');
const translationModelGroup = document.getElementById('translation-model-group');
const controls = document.getElementById('controls');

// State
let hideTimeout = null;
let currentSettings = {
    model: 'base',
    sourceLang: 'auto',
    targetLang: 'en',
    translationEnabled: false,
    translationModel: 'mt5-small'
};

// Translation cache
const translationCache = new Map();

// Load saved settings
function loadSettings() {
    const saved = localStorage.getItem('visualia-settings');
    if (saved) {
        try {
            currentSettings = JSON.parse(saved);
            modelSelect.value = currentSettings.model;
            sourceLangSelect.value = currentSettings.sourceLang;
            targetLangSelect.value = currentSettings.targetLang;
            translationToggle.checked = currentSettings.translationEnabled || false;
            translationModelSelect.value = currentSettings.translationModel || 'mt5-small';

            // Show/hide target language dropdown based on toggle
            targetLangGroup.style.display = translationToggle.checked ? 'flex' : 'none';
            translationModelGroup.style.display = translationToggle.checked ? 'flex' : 'none';
        } catch (e) {
            console.error('[Renderer] Failed to load settings:', e);
        }
    }
}

// Save settings
function saveSettings() {
    localStorage.setItem('visualia-settings', JSON.stringify(currentSettings));
}

// Translation is now handled by the backend via T5 model
// Translations will arrive via IPC 'translation' events
// This function is kept for cache management only
function getCachedTranslation(text, targetLang) {
    const cacheKey = `${text}:${targetLang}`;
    return translationCache.get(cacheKey);
}

function cacheTranslation(text, targetLang, translation) {
    const cacheKey = `${text}:${targetLang}`;
    translationCache.set(cacheKey, translation);

    // Limit cache size
    if (translationCache.size > 100) {
        const firstKey = translationCache.keys().next().value;
        translationCache.delete(firstKey);
    }
}

// Update subtitle display
function showSubtitle(text) {
    originalText.textContent = text;
    subtitleBox.classList.remove('hidden');
    subtitleBox.classList.add('fade-in');

    // Show translation row if enabled (translation will come via IPC)
    if (currentSettings.translationEnabled && currentSettings.targetLang !== 'none') {
        translationRow.style.display = 'flex';
        translationText.textContent = 'Translating...';
    } else {
        translationRow.style.display = 'none';
    }

    // Clear existing timeout
    if (hideTimeout) {
        clearTimeout(hideTimeout);
    }

    // Hide after 5 seconds of no new text
    hideTimeout = setTimeout(() => {
        subtitleBox.classList.add('hidden');
    }, 5000);
}

// Update status
function updateStatus(message, isError = false) {
    statusText.textContent = message;
    if (isError) {
        statusElement.classList.add('error');
    } else {
        statusElement.classList.remove('error');
    }
}

// Handle model change
modelSelect.addEventListener('change', (e) => {
    currentSettings.model = e.target.value;
    saveSettings();
    updateStatus(`Switching to ${e.target.options[e.target.selectedIndex].text}...`);

    // Send message to main process to restart backend with new model
    ipcRenderer.send('change-model', currentSettings.model);
});

// Handle source language change
sourceLangSelect.addEventListener('change', (e) => {
    currentSettings.sourceLang = e.target.value;
    saveSettings();
    updateStatus(`Source language: ${e.target.options[e.target.selectedIndex].text}`);

    // Send message to main process to restart backend with new language
    ipcRenderer.send('change-source-lang', currentSettings.sourceLang);
});

// Handle translation toggle
translationToggle.addEventListener('change', (e) => {
    currentSettings.translationEnabled = e.target.checked;
    saveSettings();

    if (e.target.checked) {
        targetLangGroup.style.display = 'flex';
        translationModelGroup.style.display = 'flex';
        updateStatus(`Translation enabled - ${targetLangSelect.options[targetLangSelect.selectedIndex].text}`);

        // Enable translation in backend
        ipcRenderer.send('change-translation', {
            enabled: true,
            targetLang: currentSettings.targetLang,
            translationModel: currentSettings.translationModel
        });
    } else {
        targetLangGroup.style.display = 'none';
        translationModelGroup.style.display = 'none';
        translationRow.style.display = 'none';
        updateStatus('Translation disabled');

        // Disable translation in backend
        ipcRenderer.send('change-translation', {
            enabled: false,
            targetLang: null,
            translationModel: null
        });
    }
});

// Handle target language change
targetLangSelect.addEventListener('change', (e) => {
    currentSettings.targetLang = e.target.value;
    saveSettings();
    updateStatus(`Translating to ${e.target.options[e.target.selectedIndex].text}`);

    // Update translation target in backend if translation is enabled
    if (currentSettings.translationEnabled) {
        ipcRenderer.send('change-translation', {
            enabled: true,
            targetLang: currentSettings.targetLang,
            translationModel: currentSettings.translationModel
        });
    }
});

// Handle translation model change
translationModelSelect.addEventListener('change', (e) => {
    currentSettings.translationModel = e.target.value;
    saveSettings();
    updateStatus(`Switching to ${e.target.options[e.target.selectedIndex].text}...`);

    // Update translation model in backend if translation is enabled
    if (currentSettings.translationEnabled) {
        ipcRenderer.send('change-translation', {
            enabled: true,
            targetLang: currentSettings.targetLang,
            translationModel: currentSettings.translationModel
        });
    }
});

// Fix click-through: Enable mouse events when hovering over controls
controls.addEventListener('mouseenter', () => {
    ipcRenderer.send('toggle-click-through', false);
});

controls.addEventListener('mouseleave', () => {
    ipcRenderer.send('toggle-click-through', true);
});

// Handle transcription from backend
ipcRenderer.on('transcription', (event, data) => {
    console.log('[Renderer] Transcription:', data.text);
    showSubtitle(data.text);
});

// Handle translation from backend (T5 model)
ipcRenderer.on('translation', (event, data) => {
    console.log('[Renderer] Translation:', data.original, '→', data.text);

    // Update translation display
    if (translationRow.style.display === 'flex') {
        translationText.textContent = data.text;

        // Cache the translation
        if (currentSettings.targetLang) {
            cacheTranslation(data.original, currentSettings.targetLang, data.text);
        }
    }
});

// Handle status updates
ipcRenderer.on('status', (event, data) => {
    console.log('[Renderer] Status:', data.message);
    updateStatus(data.message);
});

// Handle errors
ipcRenderer.on('error', (event, data) => {
    console.error('[Renderer] Error:', data.message);
    updateStatus(data.message, true);
});

// Handle language detection
ipcRenderer.on('language_detected', (event, data) => {
    console.log('[Renderer] Language detected:', data.language);
    updateStatus(`Detected language: ${data.language} - Switching model...`);
});

// Initialize
console.log('[Renderer] VisualIA overlay ready');
loadSettings();
updateStatus('Connecting to backend...');
