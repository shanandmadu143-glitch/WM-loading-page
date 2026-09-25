// Register Service Worker correctly for 100% Offline
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(reg => {
            console.log('Service Worker Registered!', reg);
        }).catch(err => console.log('Service Worker Failed', err));
    });
}

// Global Variables
let lastRenderedHash = '';
let currentFloatingState = 'copy';

// DOM Elements
const htmlCode = document.getElementById('html-code');
const cssCode = document.getElementById('css-code');
const jsCode = document.getElementById('js-code');
const liveOutput = document.getElementById('live-output');
const btnCode = document.getElementById('btn-code');
const btnPreview = document.getElementById('btn-preview');
const mainArea = document.getElementById('main-area');
const tabBtns = document.querySelectorAll('.tab-btn');
const codeAreas = document.querySelectorAll('.code-area');
const btnFloatingCopy = document.getElementById('btn-floating-copy');
const editorStatus = document.getElementById('editor-status');
const toast = document.getElementById('toast-notification');
const toastText = document.getElementById('toast-text');

// Modals
const customModal = document.getElementById('custom-modal');
const settingsModal = document.getElementById('settings-modal');
const downloadModal = document.getElementById('download-modal');

// --- 1. Toast & UI Updates ---
let toastTimeout;
function showToast(text) {
    toastText.innerText = text;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 2000);
}

function getActiveTextarea() { return document.querySelector('.code-area.active'); }

function updateFloatingIcon() {
    const activeArea = getActiveTextarea();
    const isEmpty = activeArea && activeArea.value.trim() === '';
    btnFloatingCopy.innerText = isEmpty ? '📋(P)' : '📋(C)';
    btnFloatingCopy.setAttribute('data-action', isEmpty ? 'paste' : 'copy');
}

function updateEditorStatus() {
    const activeArea = getActiveTextarea();
    if (activeArea) {
        const text = activeArea.value;
        const lines = text ? text.split('\n').length : 1;
        editorStatus.innerText = `Lines: ${lines} | Chars: ${text.length}`;
    }
}

// --- 2. Advanced Editor Features (Bugs Fixed!) ---
codeAreas.forEach(area => {
    area.addEventListener('keydown', function(e) {
        // Fix 1: Preserve Undo History for TAB key
        if (e.key === 'Tab') {
            e.preventDefault();
            // document.execCommand preserves Ctrl+Z natively in browsers
            document.execCommand('insertText', false, '    ');
            triggerAutoSaveAndRefresh();
        }

        // Fix 2: Auto-Close Brackets (Professional IDE Feature)
        const brackets = { '{': '}', '[': ']', '(': ')', '"': '"', "'": "'" };
        if (brackets[e.key]) {
            e.preventDefault();
            const start = this.selectionStart;
            document.execCommand('insertText', false, e.key + brackets[e.key]);
            // Move cursor back inside the bracket
            this.selectionStart = this.selectionEnd = start + 1;
            triggerAutoSaveAndRefresh();
        }
    });
});

// --- 3. Offline Auto Save & Live Preview ---
function saveCodeToStorage() {
    localStorage.setItem('savedHTML', htmlCode.value);
    localStorage.setItem('savedCSS', cssCode.value);
    localStorage.setItem('savedJS', jsCode.value);
}

function renderPreview() {
    const html = htmlCode.value;
    const css = cssCode.value;
    const js = jsCode.value;

    const fullDoc = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>${css}</style>
        </head>
        <body>
            ${html}
            <script>${js}<\/script>
        </body>
        </html>
    `;
    liveOutput.srcdoc = fullDoc;
}

let saveTimeout;
function triggerAutoSaveAndRefresh() {
    updateEditorStatus();
    updateFloatingIcon();
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveCodeToStorage();
        renderPreview();
    }, 300);
}

[htmlCode, cssCode, jsCode].forEach(ta => ta.addEventListener('input', triggerAutoSaveAndRefresh));

// --- 4. Switchers & Modals ---
btnCode.addEventListener('click', () => {
    btnCode.classList.add('active'); btnPreview.classList.remove('active');
    mainArea.classList.remove('show-preview');
});
btnPreview.addEventListener('click', () => {
    btnPreview.classList.add('active'); btnCode.classList.remove('active');
    mainArea.classList.add('show-preview');
    renderPreview();
});

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(t => t.classList.remove('active'));
        codeAreas.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
        updateEditorStatus(); updateFloatingIcon();
    });
});

// Floating Action: Copy / Paste (Fixed Permission Bug)
btnFloatingCopy.addEventListener('click', async () => {
    const action = btnFloatingCopy.getAttribute('data-action');
    const activeArea = getActiveTextarea();
    
    if (action === 'paste') {
        try {
            const text = await navigator.clipboard.readText();
            document.execCommand('insertText', false, text); // Preserves Undo
            showToast('කේතය Paste කරන ලදී!');
        } catch (err) {
            showToast('Browser Security: කරුණාකර Long-press කර Paste කරන්න.');
        }
    } else {
        activeArea.select();
        document.execCommand('copy');
        showToast('කේතය සාර්ථකව Copy විය!');
    }
});

document.getElementById('btn-floating-delete').addEventListener('click', () => {
    if(confirm('මෙම කේතය මකා දැමීමට අවශ්‍යද?')) {
        getActiveTextarea().value = '';
        triggerAutoSaveAndRefresh();
        showToast('මකා දමන ලදී!');
    }
});

// Splash Screen Logic
let splashProgress = 0;
const splashInterval = setInterval(() => {
    splashProgress += 10;
    document.getElementById('progress-fill').style.width = splashProgress + '%';
    document.getElementById('splash-percent').innerText = splashProgress + '%';
    if (splashProgress >= 100) {
        clearInterval(splashInterval);
        document.getElementById('splash-screen').classList.add('hide');
    }
}, 30);
document.getElementById('skip-splash-btn').addEventListener('click', () => document.getElementById('splash-screen').classList.add('hide'));

// Settings Modal
document.getElementById('btn-settings').addEventListener('click', () => settingsModal.classList.add('show'));
document.getElementById('close-settings-modal').addEventListener('click', () => settingsModal.classList.remove('show'));

document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
        const theme = card.getAttribute('data-theme');
        if(theme === 'default') document.body.removeAttribute('data-theme');
        else document.body.setAttribute('data-theme', theme);
        document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
    });
});

// Downloads
document.getElementById('modal-btn-download').addEventListener('click', () => {
    settingsModal.classList.remove('show'); downloadModal.classList.add('show');
});
document.getElementById('close-download-modal').addEventListener('click', () => downloadModal.classList.remove('show'));

function executeDownload(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

document.getElementById('dl-bundle').addEventListener('click', () => {
    const bundledContent = `<!DOCTYPE html>\n<html>\n<head>\n<style>\n${cssCode.value}\n</style>\n</head>\n<body>\n${htmlCode.value}\n<script>\n${jsCode.value}\n<\/script>\n</body>\n</html>`;
    executeDownload(bundledContent, 'index.html', 'text/html');
    downloadModal.classList.remove('show');
    showToast('Download විය!');
});

// Init
window.addEventListener('DOMContentLoaded', () => {
    htmlCode.value = localStorage.getItem('savedHTML') || '<h1>Hello World</h1>';
    cssCode.value = localStorage.getItem('savedCSS') || 'h1 { color: red; }';
    jsCode.value = localStorage.getItem('savedJS') || 'console.log("Ready");';
    triggerAutoSaveAndRefresh();
});
