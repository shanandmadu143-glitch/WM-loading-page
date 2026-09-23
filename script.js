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
const btnDownload = document.getElementById('btn-download');
const btnSettings = document.getElementById('btn-settings');
const themeCards = document.querySelectorAll('.theme-card');
const editorStatus = document.getElementById('editor-status');
const fontSizeSelect = document.getElementById('font-size-select');
const btnFloatingDelete = document.getElementById('btn-floating-delete');

// Settings Modal Action Buttons
const modalBtnCopy = document.getElementById('modal-btn-copy');
const modalBtnDownload = document.getElementById('modal-btn-download');
const modalBtnFullscreen = document.getElementById('modal-btn-fullscreen');

const modal = document.getElementById('custom-modal');
const modalIcon = document.getElementById('modal-icon');
const modalMessage = document.getElementById('modal-message');
const modalButtons = document.getElementById('modal-buttons');

const downloadModal = document.getElementById('download-modal');
const closeDownloadModal = document.getElementById('close-download-modal');

const settingsModal = document.getElementById('settings-modal');
const closeSettingsModal = document.getElementById('close-settings-modal');

const toast = document.getElementById('toast-notification');
const toastText = document.getElementById('toast-text');

// Active File Handles Store for Native System Access
const fileHandles = { html: null, css: null, js: null };

// Virtual 3-File Management System (Auto Direct Sync Storage)
const virtualFiles = {
    html: { name: 'index.html', mime: 'text/html', blobUrl: null },
    css: { name: 'style.css', mime: 'text/css', blobUrl: null },
    js: { name: 'script.js', mime: 'text/javascript', blobUrl: null }
};

// Toast Notification System
let toastTimeout;
function showToast(text) {
    toastText.innerText = text;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 2200);
}

// Active Tab Helper ('html', 'css', 'js')
function getActiveType() {
    const activeBtn = document.querySelector('.tab-btn.active');
    if (!activeBtn) return 'html';
    const target = activeBtn.dataset.target;
    if (target === 'css-code') return 'css';
    if (target === 'js-code') return 'js';
    return 'html';
}

function getActiveTextarea() { return document.querySelector('.code-area.active'); }

// Splash Screen Manager
let splashProgress = 0;
let splashHidden = false;
const totalDuration = 1200;
const intervalTime = 20;
const increment = 100 / (totalDuration / intervalTime);

const statusMessages = [
    { pct: 0, text: "System Initializing..." },
    { pct: 20, text: "Compiler Engine සූදානම් කරමින්..." },
    { pct: 45, text: "UI Themes & Editors සක්‍රිය කරමින්..." },
    { pct: 70, text: "Live Sandbox Environment සකසමින්..." },
    { pct: 90, text: "සියලු පද්ධති සූදානම්..." },
    { pct: 100, text: "සාදරයෙන් පිළිගනිමු!" }
];

function hideSplashScreen() {
    if (splashHidden) return;
    splashHidden = true;
    splashScreen.classList.add('hide');
    setTimeout(() => { splashScreen.style.display = 'none'; }, 350);
}

const splashInterval = setInterval(() => {
    splashProgress += increment;
    if (splashProgress >= 100) {
        splashProgress = 100;
        clearInterval(splashInterval);
        setTimeout(hideSplashScreen, 150);
    }

    const currentPct = Math.floor(splashProgress);
    progressFill.style.width = currentPct + '%';
    splashPercent.innerText = currentPct + '%';

    for (let i = statusMessages.length - 1; i >= 0; i--) {
        if (currentPct >= statusMessages[i].pct) {
            splashStatus.innerText = statusMessages[i].text;
            break;
        }
    }
}, intervalTime);

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

// Custom UI Dialog Modal
const CustomUI = {
    show: function(type, message, onConfirm) {
        modalMessage.innerText = message;
        modalButtons.innerHTML = '';
        
        if (type === 'alert') {
            modalIcon.className = 'modal-icon alert';
            modalIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
            
            const btnOk = document.createElement('button');
            btnOk.className = 'modal-btn btn-ok';
            btnOk.innerText = 'OK';
            btnOk.onclick = () => this.close();
            modalButtons.appendChild(btnOk);
        } else if (type === 'confirm') {
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
        }
        modal.classList.add('show');
    },
    close: function() {
        modal.classList.remove('show');
    }
};

modal.addEventListener('click', (e) => {
    if (e.target === modal) CustomUI.close();
});

window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'custom_alert') {
        CustomUI.show('alert', event.data.message);
    }
});

// Theme Management System
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
    card.addEventListener('click', () => {
        applyTheme(card.getAttribute('data-theme'));
    });
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

// Smart Tab Indentation Key Handling
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
                } else {
                    const selectedText = this.value.substring(start, end);
                    const lines = selectedText.split('\n');
                    const unindentedLines = lines.map(line => line.startsWith('  ') ? line.substring(2) : (line.startsWith(' ') ? line.substring(1) : line));
                    const unindentedText = unindentedLines.join('\n');
                    this.value = this.value.substring(0, start) + unindentedText + this.value.substring(end);
                    this.selectionStart = start;
                    this.selectionEnd = start + unindentedText.length;
                }
            } else {
                if (start === end) {
                    this.value = this.value.substring(0, start) + "  " + this.value.substring(end);
                    this.selectionStart = this.selectionEnd = start + 2;
                } else {
                    const selectedText = this.value.substring(start, end);
                    const lines = selectedText.split('\n');
                    const indentedText = lines.map(line => '  ' + line).join('\n');
                    this.value = this.value.substring(0, start) + indentedText + this.value.substring(end);
                    this.selectionStart = start;
                    this.selectionEnd = start + indentedText.length;
                }
            }
            scheduleSync();
            updateEditorStatus();
        }
    }, { passive: false });
});

// Lag-Free Storage & Rendering Management
let syncTimeout = null;

function saveCodeToStorage() {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            localStorage.setItem('savedHTML', htmlCode.value);
            localStorage.setItem('savedCSS', cssCode.value);
            localStorage.setItem('savedJS', jsCode.value);
        });
    } else {
        localStorage.setItem('savedHTML', htmlCode.value);
        localStorage.setItem('savedCSS', cssCode.value);
        localStorage.setItem('savedJS', jsCode.value);
    }
}

function renderPreview() {
    const html = htmlCode.value;
    const css = cssCode.value;
    const js = jsCode.value;
    
    const safeJS = js.replace(/<\/script>/gi, '<\\/script>');
    const safeCSS = css.replace(/<\/style>/gi, '<\\/style>');

    const bridgeScript = `
        <script>
            window.alert = function(msg) {
                window.parent.postMessage({ type: 'custom_alert', message: String(msg) }, '*');
            };
            window.onerror = function(msg, url, line) {
                window.parent.postMessage({ type: 'custom_alert', message: 'JS Error: ' + msg + ' (Line ' + line + ')' }, '*');
                return false;
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
                    window.parent.postMessage({ type: 'custom_alert', message: 'JS Exception: ' + err.message }, '*');
                }
            <\/script>
        </body>
        </html>
    `;
    
    liveOutput.srcdoc = fullDoc;
}

function scheduleSync(immediate = false) {
    clearTimeout(syncTimeout);
    if (immediate) {
        saveCodeToStorage();
        renderPreview();
    } else {
        // Optimized 500ms debounce prevents typing lag & scrolling stutter
        syncTimeout = setTimeout(() => {
            saveCodeToStorage();
            renderPreview();
        }, 500);
    }
}

[htmlCode, cssCode, jsCode].forEach(textarea => {
    textarea.addEventListener('input', () => {
        scheduleSync(false);
        updateEditorStatus();
    }, { passive: true });
});

// View Switcher Handlers
btnCode.addEventListener('click', () => {
    btnCode.classList.add('active'); 
    btnPreview.classList.remove('active');
    mainArea.classList.remove('show-preview');
});

btnPreview.addEventListener('click', () => {
    btnPreview.classList.add('active'); 
    btnCode.classList.remove('active');
    mainArea.classList.add('show-preview');
    scheduleSync(true); 
});

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(t => t.classList.remove('active'));
        codeAreas.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
        updateEditorStatus();
    });
});

// File Processor for Open File Feature
function processOpenedFile(name, content, handle = null) {
    const ext = name.split('.').pop().toLowerCase();
    let targetType = 'html';
    
    if (ext === 'css') {
        targetType = 'css';
    } else if (ext === 'js') {
        targetType = 'js';
    } else if (ext === 'html' || ext === 'htm') {
        targetType = 'html';
    } else {
        targetType = getActiveType();
    }

    const targetTabBtn = document.querySelector(`.tab-btn[data-target="${targetType}-code"]`);
    if (targetTabBtn) targetTabBtn.click();

    if (targetType === 'html') htmlCode.value = content;
    else if (targetType === 'css') cssCode.value = content;
    else if (targetType === 'js') jsCode.value = content;

    fileHandles[targetType] = handle;
    virtualFiles[targetType].name = name;

    scheduleSync(true);
    updateEditorStatus();
    showToast(`"${name}" විවෘත විය!`);
}

// Open File Action
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
            if (err.name !== 'AbortError') {
                fileInput.click();
            }
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
        reader.onload = (event) => {
            processOpenedFile(file.name, event.target.result, null);
        };
        reader.readAsText(file);
    });
    fileInput.value = '';
});

// Auto Direct Save File Feature (Fully Fixed & Tested)
async function saveActiveFile() {
    const type = getActiveType();
    const activeArea = document.getElementById(`${type}-code`);
    const content = activeArea ? activeArea.value : '';
    const currentHandle = fileHandles[type];
    const defaultName = virtualFiles[type].name;
    const mimeType = virtualFiles[type].mime;

    saveCodeToStorage();

    // Direct save using Native File System Handle if available
    if (currentHandle && 'createWritable' in currentHandle) {
        try {
            let perm = await currentHandle.queryPermission({ mode: 'readwrite' });
            if (perm !== 'granted') {
                perm = await currentHandle.requestPermission({ mode: 'readwrite' });
            }
            if (perm === 'granted') {
                const writable = await currentHandle.createWritable();
                await writable.write(content);
                await writable.close();
                showToast(`"${virtualFiles[type].name}" ගොනුවට සාර්ථකව Save විය!`);
                return;
            }
        } catch (err) {
            console.warn("Handle save fallback:", err);
        }
    }

    // Save File Picker Fallback for supported browsers
    if ('showSaveFilePicker' in window) {
        try {
            const ext = type === 'html' ? '.html' : type === 'css' ? '.css' : '.js';
            const handle = await window.showSaveFilePicker({
                suggestedName: defaultName,
                types: [{
                    description: `${type.toUpperCase()} File`,
                    accept: { [mimeType]: [ext] }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();

            fileHandles[type] = handle;
            virtualFiles[type].name = handle.name;

            showToast(`"${handle.name}" සාර්ථකව සුරකින ලදී!`);
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.warn("Save picker fallback:", err);
        }
    }

    // Standard Universal Download Fallback
    executeDownload(content, defaultName, mimeType);
}

btnSaveFile.addEventListener('click', saveActiveFile);

// Copy Active Code Helper
function copyActiveCode() {
    const activeArea = getActiveTextarea();
    if (activeArea && activeArea.value) {
        navigator.clipboard.writeText(activeArea.value).then(() => {
            showToast('කේතය සාර්ථකව Copy විය!');
        }).catch(() => {
            activeArea.select();
            document.execCommand('copy');
            showToast('කේතය Copy විය!');
        });
    } else {
        showToast('Copy කිරීමට කේතයක් නොමැත!');
    }
}

// Floating Delete Button (Popup FAB at bottom right) Handler
btnFloatingDelete.addEventListener('click', () => {
    const activeArea = getActiveTextarea();
    const type = getActiveType();
    if (activeArea) {
        CustomUI.show('confirm', `ඔබට මෙම ${type.toUpperCase()} කේතය සම්පූර්ණයෙන්ම මකා දැමීමට අවශ්‍ය බව විශ්වාසද?`, () => {
            activeArea.value = '';
            scheduleSync(true);
            updateEditorStatus();
            showToast(`${type.toUpperCase()} කේතය සාර්ථකව මකා දමන ලදී`);
        });
    }
});

// Settings Modal Action Buttons Bindings
modalBtnCopy.addEventListener('click', () => {
    copyActiveCode();
    settingsModal.classList.remove('show');
});

modalBtnDownload.addEventListener('click', () => {
    settingsModal.classList.remove('show');
    downloadModal.classList.add('show');
});

modalBtnFullscreen.addEventListener('click', () => {
    toggleFullscreen();
    settingsModal.classList.remove('show');
});

// Download Modal Handlers
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
    downloadModal.classList.remove('show');
    showToast(`${fileName} Download වන ලදී!`);
}

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
});

document.getElementById('dl-html').addEventListener('click', () => executeDownload(htmlCode.value, 'index.html', 'text/html'));
document.getElementById('dl-css').addEventListener('click', () => executeDownload(cssCode.value, 'style.css', 'text/css'));
document.getElementById('dl-js').addEventListener('click', () => executeDownload(jsCode.value, 'script.js', 'text/javascript'));

// Global Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveActiveFile();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (mainArea.classList.contains('show-preview')) {
            btnCode.click();
        } else {
            btnPreview.click();
        }
    }
});

// App Initialization
window.addEventListener('DOMContentLoaded', () => {
    const defaultHTML = `<div class="card">
  <h1>ආයුබෝවන්! 🇱🇰</h1>
  <p>ඔබගේ HTML.codes Live Editor එක සාර්ථකව වැඩ කරයි.</p>
  <button onclick="sayHello()">Click Me</button>
</div>`;

    const defaultCSS = `body {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #0f172a;
  color: #f8fafc;
  font-family: 'Poppins', sans-serif;
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

    const defaultJS = `function sayHello() {
  alert('සාර්ථකයි! ඔබගේ JavaScript එක හරියටම වැඩ කරනවා 🎉');
}`;

    htmlCode.value = localStorage.getItem('savedHTML') !== null ? localStorage.getItem('savedHTML') : defaultHTML;
    cssCode.value = localStorage.getItem('savedCSS') !== null ? localStorage.getItem('savedCSS') : defaultCSS;
    jsCode.value = localStorage.getItem('savedJS') !== null ? localStorage.getItem('savedJS') : defaultJS;

    scheduleSync(true);
    updateEditorStatus();
});
