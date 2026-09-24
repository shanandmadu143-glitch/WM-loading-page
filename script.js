// Register Service Worker for 100% Offline App Support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}

// Global Variables & State Tracker
let errorLogs = [];
let lastRenderedHash = '';
let currentFloatingState = '';

// Cached DOM Elements
const splashScreen = document.getElementById('splash-screen');
const progressFill = document.getElementById('progress-fill');
const splashStatus = document.getElementById('splash-status');
const splashPercent = document.getElementById('splash-percent');
const skipSplashBtn = document.getElementById('skip-splash-btn');

const htmlCode = document.getElementById('html-code');
const cssCode = document.getElementById('css-code');
const jsCode = document.getElementById('js-code');
const liveOutput = document.getElementById('live-output');
const btnCode = document.getElementById('btn-code');
const btnPreview = document.getElementById('btn-preview');
const btnOpenFile = document.getElementById('btn-open-file');
const btnSaveFile = document.getElementById('btn-save-file');
const fileInput = document.getElementById('file-input');
const mainArea = document.getElementById('main-area');
const tabBtns = document.querySelectorAll('.tab-btn');
const codeAreas = document.querySelectorAll('.code-area');
const btnSettings = document.getElementById('btn-settings');
const themeCards = document.querySelectorAll('.theme-card');
const editorStatus = document.getElementById('editor-status');
const fontSizeSelect = document.getElementById('font-size-select');
const btnFloatingCopy = document.getElementById('btn-floating-copy');
const btnFloatingDelete = document.getElementById('btn-floating-delete');
const syncDot = document.querySelector('.sync-dot');

// Modal Elements
const modalBtnDownload = document.getElementById('modal-btn-download');
const modalBtnFullscreen = document.getElementById('modal-btn-fullscreen');
const modalBtnErrors = document.getElementById('modal-btn-errors');
const errorBadge = document.getElementById('error-badge');

const modal = document.getElementById('custom-modal');
const modalIcon = document.getElementById('modal-icon');
const modalMessage = document.getElementById('modal-message');
const modalButtons = document.getElementById('modal-buttons');

const downloadModal = document.getElementById('download-modal');
const closeDownloadModal = document.getElementById('close-download-modal');

const settingsModal = document.getElementById('settings-modal');
const closeSettingsModal = document.getElementById('close-settings-modal');

const errorModal = document.getElementById('error-modal');
const closeErrorModal = document.getElementById('close-error-modal');
const errorListContainer = document.getElementById('error-list-container');
const btnClearErrors = document.getElementById('btn-clear-errors');
const btnExportErrors = document.getElementById('btn-export-errors');

const toast = document.getElementById('toast-notification');
const toastText = document.getElementById('toast-text');

// Active Native File Handles
const fileHandles = { html: null, css: null, js: null };

// Virtual File Store
const virtualFiles = {
    html: { name: 'index.html', mime: 'text/html' },
    css: { name: 'style.css', mime: 'text/css' },
    js: { name: 'script.js', mime: 'text/javascript' }
};

// Toast Notification Handler
let toastTimeout;
function showToast(text) {
    toastText.innerText = text;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 2000);
}

// Active Tab Helpers
function getActiveType() {
    const activeBtn = document.querySelector('.tab-btn.active');
    if (!activeBtn) return 'html';
    const target = activeBtn.dataset.target;
    if (target === 'css-code') return 'css';
    if (target === 'js-code') return 'js';
    return 'html';
}

function getActiveTextarea() { return document.querySelector('.code-area.active'); }

// Dynamic Floating Copy/Paste Icon Logic (State Cached to prevent Lag)
function updateFloatingIcon() {
    const activeArea = getActiveTextarea();
    const isEmtpy = activeArea && activeArea.value.trim() === '';
    const newState = isEmtpy ? 'paste' : 'copy';

    if (currentFloatingState === newState) return;
    currentFloatingState = newState;

    if (newState === 'paste') {
        btnFloatingCopy.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>';
        btnFloatingCopy.title = "කේතය Paste කරන්න (Paste)";
        btnFloatingCopy.setAttribute('data-action', 'paste');
    } else {
        btnFloatingCopy.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        btnFloatingCopy.title = "කේතය පිටපත් කරන්න (Copy)";
        btnFloatingCopy.setAttribute('data-action', 'copy');
    }
}

// Error Logger Tracker
function addErrorLog(type, title, message) {
    const time = new Date().toLocaleTimeString();
    if (errorLogs.length > 0 && errorLogs[0].title === title && errorLogs[0].message === message) return;
    
    errorLogs.unshift({ type, title, message, time });
    if (errorLogs.length > 50) errorLogs.pop();
    updateErrorUI();
}

window.addEventListener('error', function(e) {
    addErrorLog('error', 'App Script Error', `${e.message || 'Unknown Error'} (${e.filename ? e.filename.split('/').pop() : 'App'}:${e.lineno || 0})`);
});

window.addEventListener('unhandledrejection', function(e) {
    addErrorLog('error', 'Unhandled Promise Rejection', e.reason ? (e.reason.message || String(e.reason)) : 'Promise Error');
});

function updateErrorUI() {
    const errCount = errorLogs.filter(e => e.type === 'error').length;
    if (errorBadge) {
        errorBadge.innerText = errCount;
        errorBadge.style.display = errCount > 0 ? 'inline-block' : 'none';
    }

    if (!errorListContainer) return;

    if (errorLogs.length === 0) {
        errorListContainer.innerHTML = `
            <div class="error-item ok">
                <div class="error-item-header">
                    <span class="error-item-title">System Status: OK</span>
                </div>
                <div class="error-item-msg">දැනට කිසිදු Error හෝ Bug එකක් වාර්තා වී නොමැත. ඇප් එක නිවැරදිව ක්‍රියාත්මක වේ.</div>
            </div>`;
        return;
    }

    errorListContainer.innerHTML = errorLogs.map(err => `
        <div class="error-item ${err.type}">
            <div class="error-item-header">
                <span class="error-item-title">${err.title}</span>
                <span class="error-item-time">${err.time}</span>
            </div>
            <div class="error-item-msg">${err.message}</div>
        </div>
    `).join('');
}

btnClearErrors.addEventListener('click', () => {
    errorLogs = [];
    updateErrorUI();
    showToast('Error Log එක ရှင်း කරන ලදී');
});

if (btnExportErrors) {
    btnExportErrors.addEventListener('click', () => {
        if (errorLogs.length === 0) {
            showToast('Export කිරීමට Logs නොමැත!');
            return;
        }
        const logText = errorLogs.map(e => `[${e.time}] [${e.type.toUpperCase()}] ${e.title}: ${e.message}`).join('\n');
        executeDownload(logText, 'error_logs_report.txt', 'text/plain');
        showToast('Error Report එක Download විය');
    });
}

modalBtnErrors.addEventListener('click', () => {
    settingsModal.classList.remove('show');
    errorModal.classList.add('show');
});

closeErrorModal.addEventListener('click', () => errorModal.classList.remove('show'));
errorModal.addEventListener('click', (e) => {
    if (e.target === errorModal) errorModal.classList.remove('show');
});

window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'custom_error_log') {
        addErrorLog('error', event.data.title || 'JS Runtime Error', event.data.message);
    }
});

// Fast Splash Screen Manager
let splashProgress = 0;
let splashHidden = false;

function hideSplashScreen() {
    if (splashHidden) return;
    splashHidden = true;
    splashScreen.classList.add('hide');
    setTimeout(() => { splashScreen.style.display = 'none'; }, 300);
}

const splashInterval = setInterval(() => {
    splashProgress += 10;
    if (splashProgress >= 100) {
        splashProgress = 100;
        clearInterval(splashInterval);
        setTimeout(hideSplashScreen, 100);
    }

    progressFill.style.width = splashProgress + '%';
    splashPercent.innerText = splashProgress + '%';
    if (splashProgress > 60) splashStatus.innerText = "සියලු පද්ධති සූදානම්...";
}, 30);

skipSplashBtn.addEventListener('click', () => {
    clearInterval(splashInterval);
    hideSplashScreen();
});

// Fullscreen Handler
function toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        }
        showToast('Full Screen Mode සක්‍රිය විය');
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
        showToast('Full Screen Mode ඉවත් විය');
    }
}

// Custom UI Dialog Manager
const CustomUI = {
    show: function(type, message, onConfirm) {
        modalMessage.innerText = message;
        modalButtons.innerHTML = '';
        
        if (type === 'confirm') {
            modalIcon.className = 'modal-icon confirm';
            modalIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
            
            const btnCancel = document.createElement('button');
            btnCancel.className = 'modal-btn btn-cancel';
            btnCancel.innerText = 'අවලංගු කරන්න';
            btnCancel.onclick = () => this.close();
            
            const btnYes = document.createElement('button');
            btnYes.className = 'modal-btn btn-yes';
            btnYes.innerText = 'ඔව්, මකා දමන්න';
            btnYes.onclick = () => {
                if(onConfirm) onConfirm();
                this.close();
            };
            
            modalButtons.appendChild(btnCancel);
            modalButtons.appendChild(btnYes);
            modal.classList.add('show');
        }
    },
    close: function() {
        modal.classList.remove('show');
    }
};

modal.addEventListener('click', (e) => {
    if (e.target === modal) CustomUI.close();
});

// Theme Selector Manager
function applyTheme(theme) {
    if (theme === 'default') {
        document.body.removeAttribute('data-theme');
    } else {
        document.body.setAttribute('data-theme', theme);
    }
    localStorage.setItem('htmlCodesTheme', theme);
    
    themeCards.forEach(card => {
        if (card.getAttribute('data-theme') === theme) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

btnSettings.addEventListener('click', () => settingsModal.classList.add('show'));
closeSettingsModal.addEventListener('click', () => settingsModal.classList.remove('show'));
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.classList.remove('show');
});

themeCards.forEach(card => {
    card.addEventListener('click', () => applyTheme(card.getAttribute('data-theme')));
});

function applyFontSize(size) {
    codeAreas.forEach(area => area.style.fontSize = size + 'px');
    localStorage.setItem('htmlCodesFontSize', size);
    if (fontSizeSelect) fontSizeSelect.value = size;
}

fontSizeSelect.addEventListener('change', (e) => applyFontSize(e.target.value));

applyTheme(localStorage.getItem('htmlCodesTheme') || 'default');
applyFontSize(localStorage.getItem('htmlCodesFontSize') || '14');

// High-Performance Line & Character Counter
let statusUpdatePending = false;
function updateEditorStatus() {
    if (statusUpdatePending) return;
    statusUpdatePending = true;
    requestAnimationFrame(() => {
        const activeArea = getActiveTextarea();
        if (activeArea) {
            const text = activeArea.value;
            const lines = text ? text.split('\n').length : 1;
            editorStatus.innerText = `Lines: ${lines} | Chars: ${text.length}`;
        }
        statusUpdatePending = false;
    });
}

// Fast Tab Indentation Handler
codeAreas.forEach(area => {
    area.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;

            if (e.shiftKey) {
                if (start === end) {
                    const lineStart = this.value.lastIndexOf('\n', start - 1) + 1;
                    if (this.value.substring(lineStart, lineStart + 2) === '  ') {
                        this.value = this.value.substring(0, lineStart) + this.value.substring(lineStart + 2);
                        this.selectionStart = this.selectionEnd = Math.max(lineStart, start - 2);
                    }
                }
            } else {
                if (start === end) {
                    this.value = this.value.substring(0, start) + "  " + this.value.substring(end);
                    this.selectionStart = this.selectionEnd = start + 2;
                }
            }
            triggerAutoSaveAndRefresh();
        }
    }, { passive: false });
});

// Optimized Offline LocalStorage Saving
function saveCodeToStorage() {
    try {
        localStorage.setItem('savedHTML', htmlCode.value);
        localStorage.setItem('savedCSS', cssCode.value);
        localStorage.setItem('savedJS', jsCode.value);
    } catch(err) {
        addErrorLog('error', 'Storage Full', 'LocalStorage memory limit exceeded');
    }
}

// Safe Live Preview Renderer
function renderPreview() {
    const html = htmlCode.value;
    const css = cssCode.value;
    const js = jsCode.value;

    const safeJS = js.replace(/<\/script>/gi, '<\\/script>');
    const safeCSS = css.replace(/<\/style>/gi, '<\\/style>');

    const bridgeScript = `
        <script>
            window.onerror = function(msg, url, line, col, err) {
                window.parent.postMessage({ 
                    type: 'custom_error_log', 
                    title: 'Live Preview Execution Error', 
                    message: msg + (line ? ' (Line ' + line + ')' : '') 
                }, '*');
                return true;
            };
        <\/script>
    `;

    const fullDoc = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${safeCSS}</style>
            ${bridgeScript}
        </head>
        <body>
            ${html}
            <script>
                try {
                    ${safeJS}
                } catch(err) {
                    window.parent.postMessage({ 
                        type: 'custom_error_log', 
                        title: 'Live Preview Syntax Error', 
                        message: err.message 
                    }, '*');
                }
            <\/script>
        </body>
        </html>
    `;
    
    liveOutput.srcdoc = fullDoc;
}

function getContentHash() {
    return htmlCode.value + '||' + cssCode.value + '||' + jsCode.value;
}

function syncAndRefresh(force = false) {
    const currentHash = getContentHash();
    if (force || currentHash !== lastRenderedHash) {
        if (syncDot) syncDot.classList.add('syncing');
        saveCodeToStorage();
        renderPreview();
        lastRenderedHash = currentHash;
        setTimeout(() => {
            if (syncDot) syncDot.classList.remove('syncing');
        }, 300);
    }
}

// Lag-Free Separated Debouncers
let saveTimeout;
let previewTimeout;

function triggerAutoSaveAndRefresh() {
    updateEditorStatus();
    updateFloatingIcon();
    
    // Quick Save to LocalStorage (200ms)
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveCodeToStorage, 200);

    // Smooth Preview Refresh (350ms)
    clearTimeout(previewTimeout);
    previewTimeout = setTimeout(() => {
        syncAndRefresh(false);
    }, 350);
}

[htmlCode, cssCode, jsCode].forEach(textarea => {
    textarea.addEventListener('input', triggerAutoSaveAndRefresh, { passive: true });
});

// View Switchers
btnCode.addEventListener('click', () => {
    btnCode.classList.add('active'); 
    btnPreview.classList.remove('active');
    mainArea.classList.remove('show-preview');
});

btnPreview.addEventListener('click', () => {
    btnPreview.classList.add('active'); 
    btnCode.classList.remove('active');
    mainArea.classList.add('show-preview');
    syncAndRefresh(true); 
});

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(t => t.classList.remove('active'));
        codeAreas.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
        updateEditorStatus();
        updateFloatingIcon();
    });
});

// File Processor
function processOpenedFile(name, content, handle = null) {
    const ext = name.split('.').pop().toLowerCase();
    let targetType = 'html';
    
    if (ext === 'css') targetType = 'css';
    else if (ext === 'js') targetType = 'js';

    const targetTabBtn = document.querySelector(`.tab-btn[data-target="${targetType}-code"]`);
    if (targetTabBtn) targetTabBtn.click();

    if (targetType === 'html') htmlCode.value = content;
    else if (targetType === 'css') cssCode.value = content;
    else if (targetType === 'js') jsCode.value = content;

    fileHandles[targetType] = handle;
    virtualFiles[targetType].name = name;

    syncAndRefresh(true);
    updateEditorStatus();
    updateFloatingIcon();
    showToast(`"${name}" විවෘත විය!`);
}

async function openFile() {
    if ('showOpenFilePicker' in window) {
        try {
            const handles = await window.showOpenFilePicker({
                types: [{
                    description: 'Web Files (.html, .css, .js)',
                    accept: {
                        'text/html': ['.html', '.htm'],
                        'text/css': ['.css'],
                        'text/javascript': ['.js'],
                        'text/plain': ['.txt']
                    }
                }],
                multiple: true
            });
            for (const handle of handles) {
                const file = await handle.getFile();
                const content = await file.text();
                processOpenedFile(file.name, content, handle);
            }
        } catch (err) {
            if (err.name !== 'AbortError') fileInput.click();
        }
    } else {
        fileInput.click();
    }
}

btnOpenFile.addEventListener('click', openFile);

fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => processOpenedFile(file.name, event.target.result, null);
        reader.readAsText(file);
    });
    fileInput.value = '';
});

// File Save Manager
async function saveActiveFile() {
    const type = getActiveType();
    const activeArea = document.getElementById(`${type}-code`);
    const content = activeArea ? activeArea.value : '';
    const currentHandle = fileHandles[type];
    const defaultName = virtualFiles[type].name;
    const mimeType = virtualFiles[type].mime;

    saveCodeToStorage();

    if (currentHandle && 'createWritable' in currentHandle) {
        try {
            let perm = await currentHandle.queryPermission({ mode: 'readwrite' });
            if (perm !== 'granted') perm = await currentHandle.requestPermission({ mode: 'readwrite' });
            if (perm === 'granted') {
                const writable = await currentHandle.createWritable();
                await writable.write(content);
                await writable.close();
                showToast(`"${virtualFiles[type].name}" ගොනුවට සාර්ථකව Save විය!`);
                return;
            }
        } catch (err) {
            addErrorLog('info', 'Save Fallback', 'Standard file save used');
        }
    }

    executeDownload(content, defaultName, mimeType);
}

btnSaveFile.addEventListener('click', saveActiveFile);

function copyActiveCode() {
    const activeArea = getActiveTextarea();
    if (activeArea && activeArea.value.trim() !== '') {
        navigator.clipboard.writeText(activeArea.value).then(() => {
            showToast('කේතය සාර්ථකව Copy විය!');
        }).catch(() => {
            activeArea.select();
            document.execCommand('copy');
            showToast('කේතය Copy විය!');
        });
    }
}

// Floating Copy / Paste Button Action Handler
btnFloatingCopy.addEventListener('click', async () => {
    if (btnFloatingCopy.getAttribute('data-action') === 'paste') {
        try {
            const text = await navigator.clipboard.readText();
            const activeArea = getActiveTextarea();
            if (activeArea) {
                activeArea.value = text;
                updateFloatingIcon();
                updateEditorStatus();
                syncAndRefresh(true);
                showToast('කේතය Paste කරන ලදී!');
            }
        } catch (err) {
            showToast('Paste කිරීමට කේතය ලියන්න හෝ Clipboard Access ලබා දෙන්න');
        }
    } else {
        copyActiveCode();
    }
});

btnFloatingDelete.addEventListener('click', () => {
    const activeArea = getActiveTextarea();
    const type = getActiveType();
    if (activeArea) {
        CustomUI.show('confirm', `ඔබට මෙම ${type.toUpperCase()} කේතය සම්පූර්ණයෙන්ම මකා දැමීමට අවශ්‍ය බව විශ්වාසද?`, () => {
            activeArea.value = '';
            syncAndRefresh(true);
            updateEditorStatus();
            updateFloatingIcon();
            showToast(`${type.toUpperCase()} කේතය සාර්ථකව මකා දමන ලදී`);
        });
    }
});

// Download Options Handlers
modalBtnDownload.addEventListener('click', () => {
    settingsModal.classList.remove('show');
    downloadModal.classList.add('show');
});

modalBtnFullscreen.addEventListener('click', () => {
    toggleFullscreen();
    settingsModal.classList.remove('show');
});

closeDownloadModal.addEventListener('click', () => downloadModal.classList.remove('show'));
downloadModal.addEventListener('click', (e) => {
    if (e.target === downloadModal) downloadModal.classList.remove('show');
});

function executeDownload(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = fileName;
    document.body.appendChild(a); 
    a.click(); 
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.getElementById('dl-all').addEventListener('click', () => {
    let count = 0;
    if (htmlCode.value.trim() !== '') { executeDownload(htmlCode.value, 'index.html', 'text/html'); count++; }
    if (cssCode.value.trim() !== '') { setTimeout(() => executeDownload(cssCode.value, 'style.css', 'text/css'), 200); count++; }
    if (jsCode.value.trim() !== '') { setTimeout(() => executeDownload(jsCode.value, 'script.js', 'text/javascript'), 400); count++; }

    downloadModal.classList.remove('show');
    if (count > 0) showToast(`Files ${count} ම Download විය!`);
});

document.getElementById('dl-bundle').addEventListener('click', () => {
    const safeJsForExport = jsCode.value.replace(/<\/script>/gi, '<\\/script>');
    const bundledContent = `<!DOCTYPE html>
<html lang="si">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Web Project</title>
    <style>
${cssCode.value}
    </style>
</head>
<body>
${htmlCode.value}
    <script>
${safeJsForExport}
    <\/script>
</body>
</html>`;
    executeDownload(bundledContent, 'index.html', 'text/html');
    downloadModal.classList.remove('show');
    showToast('index.html Download වන ලදී!');
});

document.getElementById('dl-html').addEventListener('click', () => {
    executeDownload(htmlCode.value, 'index.html', 'text/html');
    downloadModal.classList.remove('show');
    showToast('index.html Download වන ලදී!');
});

document.getElementById('dl-css').addEventListener('click', () => {
    executeDownload(cssCode.value, 'style.css', 'text/css');
    downloadModal.classList.remove('show');
    showToast('style.css Download වන ලදී!');
});

document.getElementById('dl-js').addEventListener('click', () => {
    executeDownload(jsCode.value, 'script.js', 'text/javascript');
    downloadModal.classList.remove('show');
    showToast('script.js Download වන ලදී!');
});

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveActiveFile();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (mainArea.classList.contains('show-preview')) btnCode.click();
        else btnPreview.click();
    }
});

window.addEventListener('beforeunload', saveCodeToStorage);

// App Initialization
window.addEventListener('DOMContentLoaded', () => {
    const defaultHTML = `<div class="card">
  <h1>ආයුබෝවන්! 🇱🇰</h1>
  <p>ඔබගේ HTML.codes Live Editor එක Offline සුපිරියටම වැඩ කරයි.</p>
  <button id="hello-btn">Click Me</button>
</div>`;

    const defaultCSS = `body {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #0f172a;
  color: #f8fafc;
  font-family: 'Poppins', system-ui, -apple-system, sans-serif;
  margin: 0;
  padding: 15px;
  box-sizing: border-box;
}
.card {
  background: #1e293b;
  padding: 30px;
  border-radius: 20px;
  box-shadow: 0 15px 30px rgba(0,0,0,0.3);
  text-align: center;
  border: 1px solid rgba(255,255,255,0.1);
  max-width: 400px;
  width: 100%;
}
h1 { color: #f38ba8; margin-bottom: 10px; font-size: 24px; }
p { color: #94a3b8; font-size: 14px; }
button {
  background: #89b4fa;
  color: #11111b;
  border: none;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 15px;
  transition: 0.3s;
}
button:hover { 
  background: #74a1f0; 
  transform: translateY(-2px);
}`;

    const defaultJS = `const btn = document.getElementById('hello-btn');
if (btn) {
  btn.addEventListener('click', function() {
    alert('සාර්ථකයි! ඔබගේ JavaScript එක Offline වලදීත් වැඩ කරනවා 🎉');
  });
}`;

    htmlCode.value = localStorage.getItem('savedHTML') !== null ? localStorage.getItem('savedHTML') : defaultHTML;
    cssCode.value = localStorage.getItem('savedCSS') !== null ? localStorage.getItem('savedCSS') : defaultCSS;
    jsCode.value = localStorage.getItem('savedJS') !== null ? localStorage.getItem('savedJS') : defaultJS;

    syncAndRefresh(true);
    updateEditorStatus();
    updateErrorUI();
    updateFloatingIcon();
});
