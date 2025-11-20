const { ipcRenderer } = require('electron');

// DOM elements
const subtitleBox = document.getElementById('subtitle-box');
const originalText = document.getElementById('original-text');
const translationText = document.getElementById('translation-text');
const translationRow = document.getElementById('translation-row');
const statusElement = document.getElementById('status');
const statusText = document.getElementById('status-text');
const statusDot = document.getElementById('status-dot');

// Control elements
const modelSelect = document.getElementById('model-select');
const sourceLangSelect = document.getElementById('source-lang-select');
const targetLangSelect = document.getElementById('target-lang-select');
const translationToggle = document.getElementById('translation-toggle');
const targetLangGroup = document.getElementById('target-lang-group');
const translationModelSelect = document.getElementById('translation-model-select');
const translationModelGroup = document.getElementById('translation-model-group');
const soundCaptionsToggle = document.getElementById('sound-captions-toggle');
const controls = document.getElementById('controls');
const closeSettingsBtn = document.getElementById('close-settings');

// Helper function to get smart default target language
function getSmartTargetLang(sourceLang = 'auto') {
    // Get system locale (e.g., 'en-US', 'fr-FR')
    const systemLang = navigator.language.split('-')[0]; // Get 'en' from 'en-US'

    // If source is English or system is English, choose a common alternative
    if (sourceLang === 'en' || systemLang === 'en') {
        return systemLang !== 'en' ? systemLang : 'fr'; // Use system lang if not English, else French
    }

    // If source is known and not English, translate to English
    if (sourceLang !== 'auto') {
        return 'en';
    }

    // Default: if auto-detect, prefer English unless system is already English
    return systemLang !== 'en' ? 'en' : 'fr';
}

// State
let hideTimeout = null;
let currentSettings = {
    model: 'base',
    sourceLang: 'auto',
    targetLang: getSmartTargetLang('auto'),
    translationEnabled: false,
    translationModel: 'madlad400-10b-mt',
    showSoundCaptions: true
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
            translationModelSelect.value = currentSettings.translationModel || 'madlad400-10b-mt';
            soundCaptionsToggle.checked = currentSettings.showSoundCaptions !== false;

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

// Update status with fade transition
function updateStatus(message, isError = false) {
    // Skip if currently showing hint
    if (isShowingHint) {
        currentStatusMessage = message;
        return;
    }

    // Fade out
    statusText.classList.add('fade-out');

    setTimeout(() => {
        statusText.textContent = message;
        if (isError) {
            statusElement.classList.add('error');
        } else {
            statusElement.classList.remove('error');
        }

        // Fade in
        statusText.classList.remove('fade-out');
    }, 200);
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
    const newTargetLang = e.target.value;

    // Prevent same-language translation
    if (newTargetLang === currentSettings.sourceLang && currentSettings.sourceLang !== 'auto') {
        updateStatus(`Warning: Source and target are both ${currentSettings.sourceLang.toUpperCase()}`, true);
        console.warn('[Renderer] Same-language translation selected:', currentSettings.sourceLang);
    }

    currentSettings.targetLang = newTargetLang;
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

// Handle sound captions toggle
soundCaptionsToggle.addEventListener('change', (e) => {
    currentSettings.showSoundCaptions = e.target.checked;
    saveSettings();
    updateStatus(e.target.checked ? 'Sound captions enabled' : 'Sound captions disabled');
});

// Close settings button
closeSettingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    controls.classList.add('hidden');
});

// Status element reveals settings on hover
statusElement.addEventListener('mouseenter', () => {
    controls.classList.remove('hidden');
    controls.classList.add('show');
});

// Controls stay visible when hovering over them
controls.addEventListener('mouseenter', () => {
    controls.classList.remove('hidden');
    controls.classList.add('show');
    ipcRenderer.send('toggle-click-through', false);
});

controls.addEventListener('mouseleave', () => {
    controls.classList.remove('show');
    ipcRenderer.send('toggle-click-through', true);
});

// Handle transcription from backend
ipcRenderer.on('transcription', (event, data) => {
    console.log('[Renderer] Transcription:', data.text);

    // Check if text is a sound caption (text in brackets, asterisks, or parentheses like [silence], *footsteps*, (door closing), etc.)
    const isSoundCaption = /^(\[.*\]|\*.*\*|\(.*\))$/.test(data.text.trim());

    // Don't show UI if it's a sound caption and the setting is disabled
    if (isSoundCaption && !currentSettings.showSoundCaptions) {
        return;
    }

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

    const detectedLang = data.language;

    // Update source language in UI (switch from auto to detected)
    currentSettings.sourceLang = detectedLang;
    sourceLangSelect.value = detectedLang;

    // Intelligently set target language based on detected source
    const newTargetLang = getSmartTargetLang(detectedLang);

    // Only update target if it would result in same-language translation
    if (currentSettings.targetLang === detectedLang) {
        currentSettings.targetLang = newTargetLang;
        targetLangSelect.value = newTargetLang;
        console.log('[Renderer] Adjusted target language to avoid same-language translation:', newTargetLang);
    } else if (currentSettings.targetLang === 'none' || !currentSettings.targetLang) {
        // If target was "none", set it to smart default
        currentSettings.targetLang = newTargetLang;
        targetLangSelect.value = newTargetLang;
    }

    saveSettings();

    updateStatus(`Detected: ${detectedLang.toUpperCase()} → Target: ${currentSettings.targetLang.toUpperCase()}`);
});

// Track the original status message
let currentStatusMessage = '';
let isShowingHint = false;

// Periodic hint to show users they can hover for settings
function showStatusHint() {
    // Only show if controls are not already visible
    if (!controls.classList.contains('show') && !isShowingHint) {
        isShowingHint = true;
        currentStatusMessage = statusText.textContent;

        // Fade out current status
        statusText.classList.add('fade-out');

        setTimeout(() => {
            // Hide status dot and change to hint mode
            statusDot.classList.add('hidden');
            statusElement.classList.add('hint-mode');
            statusText.textContent = 'Hover here for settings';

            // Fade in hint
            statusText.classList.remove('fade-out');

            // After 3 seconds, restore original status
            setTimeout(() => {
                // Fade out hint
                statusText.classList.add('fade-out');

                setTimeout(() => {
                    // Show status dot and remove hint mode
                    statusDot.classList.remove('hidden');
                    statusElement.classList.remove('hint-mode');
                    statusText.textContent = currentStatusMessage;

                    // Fade in original status
                    statusText.classList.remove('fade-out');
                    isShowingHint = false;
                }, 200);
            }, 3000); // Show hint for 3 seconds
        }, 200);
    }
}

// Show hint every 40 seconds
setInterval(showStatusHint, 40000);

// Initialize
console.log('[Renderer] VisualIA overlay ready');
loadSettings();
updateStatus('Connecting to backend...');
