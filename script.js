// Register Service Worker correctly for 100% Offline
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(reg => {
            console.log('Service Worker Registered!');
        }).catch(err => console.log('Service Worker Failed', err));
    });
}

// ---------------- 1. File Migration & State Management ----------------
let appFiles = JSON.parse(localStorage.getItem('appFiles'));
let currentActiveFile = localStorage.getItem('currentActiveFile') || 'index.html';

// Migrate old data if upgrading from V2 to V3
if (!appFiles) {
    appFiles = {
        "index.html": { content: localStorage.getItem('savedHTML') || '<h1>Hello World</h1>' }
    };
    if (localStorage.getItem('savedCSS')) appFiles["style.css"] = { content: localStorage.getItem('savedCSS') };
    if (localStorage.getItem('savedJS')) appFiles["script.js"] = { content: localStorage.getItem('savedJS') };
}

// Ensure index.html always exists
if (!appFiles["index.html"]) {
    appFiles["index.html"] = { content: '<h1>Hello World</h1>' };
}
if (!appFiles[currentActiveFile]) currentActiveFile = "index.html";

function saveState() {
    localStorage.setItem('appFiles', JSON.stringify(appFiles));
    localStorage.setItem('currentActiveFile', currentActiveFile);
}

// ---------------- 2. DOM Elements ----------------
const tabsContainer = document.getElementById('tabs-container');
const editorsContainer = document.getElementById('editors-container');
const btnAddTab = document.getElementById('btn-add-tab');
const liveOutput = document.getElementById('live-output');
const editorStatus = document.getElementById('editor-status');
const btnFloatingCopy = document.getElementById('btn-floating-copy');
const toast = document.getElementById('toast-notification');

// Modals
const newFileModal = document.getElementById('new-file-modal');
const settingsModal = document.getElementById('settings-modal');
const downloadModal = document.getElementById('download-modal');

let saveTimeout;
let toastTimeout;

// ---------------- 3. UI and Tab Generation ----------------
function showToast(text) {
    document.getElementById('toast-text').innerText = text;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 2000);
}

function getActiveTextarea() {
    return document.getElementById(`editor-${currentActiveFile.replace(/\./g, '-')}`);
}

function updateEditorStatus() {
    const activeArea = getActiveTextarea();
    if (activeArea) {
        const text = activeArea.value;
        const lines = text ? text.split('\n').length : 1;
        editorStatus.innerText = `File: ${currentActiveFile} | Lines: ${lines} | Chars: ${text.length}`;
    }
}

function updateFloatingIcon() {
    const activeArea = getActiveTextarea();
    const isEmpty = activeArea && activeArea.value.trim() === '';
    btnFloatingCopy.innerText = isEmpty ? '📋(P)' : '📋(C)';
    btnFloatingCopy.setAttribute('data-action', isEmpty ? 'paste' : 'copy');
}

// Advanced IDE Feature (Auto Brackets & Tab)
function handleEditorKeyDown(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertText', false, '    ');
        triggerAutoSaveAndRefresh();
    }
    const brackets = { '{': '}', '[': ']', '(': ')', '"': '"', "'": "'" };
    if (brackets[e.key]) {
        e.preventDefault();
        const start = this.selectionStart;
        document.execCommand('insertText', false, e.key + brackets[e.key]);
        this.selectionStart = this.selectionEnd = start + 1;
        triggerAutoSaveAndRefresh();
    }
}

function renderTabsAndEditors() {
    // Clear old tabs & editors
    document.querySelectorAll('.dynamic-tab').forEach(t => t.remove());
    document.querySelectorAll('.code-area').forEach(e => e.remove());

    Object.keys(appFiles).forEach(fileName => {
        // Build Tab
        const tabBtn = document.createElement('button');
        tabBtn.className = `tab-btn dynamic-tab ${fileName === currentActiveFile ? 'active' : ''}`;
        tabBtn.innerHTML = `${fileName} ${fileName !== 'index.html' ? `<span class="delete-file-btn" data-file="${fileName}">×</span>` : ''}`;
        
        tabBtn.onclick = (e) => {
            if(e.target.classList.contains('delete-file-btn')) {
                deleteFile(fileName);
            } else {
                currentActiveFile = fileName;
                saveState();
                renderTabsAndEditors();
            }
        };
        tabsContainer.insertBefore(tabBtn, btnAddTab);

        // Build Editor
        const editor = document.createElement('textarea');
        editor.className = `code-area ${fileName === currentActiveFile ? 'active' : ''}`;
        editor.id = `editor-${fileName.replace(/\./g, '-')}`;
        editor.spellcheck = false;
        editor.value = appFiles[fileName].content;

        // Simple Syntax Colors based on extension
        if(fileName.endsWith('.css')) editor.style.color = 'var(--accent-1)';
        else if(fileName.endsWith('.js')) editor.style.color = '#f9e2af';
        else editor.style.color = 'var(--text-main)';

        editor.addEventListener('input', (e) => {
            appFiles[fileName].content = e.target.value;
            triggerAutoSaveAndRefresh();
        });
        editor.addEventListener('keydown', handleEditorKeyDown);
        
        editorsContainer.insertBefore(editor, btnFloatingCopy);
    });

    updateEditorStatus();
    updateFloatingIcon();
}

function deleteFile(fileName) {
    if(confirm(`"${fileName}" මකා දැමීමට අවශ්‍යද?`)) {
        delete appFiles[fileName];
        if(currentActiveFile === fileName) currentActiveFile = 'index.html';
        saveState();
        renderTabsAndEditors();
        triggerAutoSaveAndRefresh();
        showToast('File එක මකා දමන ලදී!');
    }
}

// ---------------- 4. Add File Logic ----------------
btnAddTab.onclick = () => {
    document.getElementById('new-file-name').value = '';
    newFileModal.classList.add('show');
    document.getElementById('new-file-name').focus();
};
document.getElementById('close-new-file-modal').onclick = () => newFileModal.classList.remove('show');

document.getElementById('btn-create-file').onclick = () => {
    let name = document.getElementById('new-file-name').value.trim();
    if(!name) return showToast('කරුණාකර නමක් ඇතුලත් කරන්න!');
    if(appFiles[name]) return showToast('මෙම නමින් File එකක් දැනටමත් ඇත!');
    
    appFiles[name] = { content: '' };
    currentActiveFile = name;
    saveState();
    newFileModal.classList.remove('show');
    renderTabsAndEditors();
    showToast(`${name} සෑදුවා!`);
};

// ---------------- 5. Live Preview Logic ----------------
function triggerAutoSaveAndRefresh() {
    updateEditorStatus();
    updateFloatingIcon();
    saveState();
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(renderPreview, 300);
}

function renderPreview() {
    let htmlContent = appFiles['index.html'] ? appFiles['index.html'].content : '';
    let cssContent = '';
    let jsContent = '';

    // Auto Import dynamic css and js files to preview
    Object.keys(appFiles).forEach(file => {
        if (file.endsWith('.css')) cssContent += `\n/* ${file} */\n${appFiles[file].content}`;
        if (file.endsWith('.js')) jsContent += `\n// ${file}\n${appFiles[file].content}`;
    });

    const fullDoc = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>${cssContent}</style>
        </head>
        <body>
            ${htmlContent}
            <script>${jsContent}<\/script>
        </body>
        </html>
    `;
    liveOutput.srcdoc = fullDoc;
}

// ---------------- 6. Global Buttons & Switchers ----------------
document.getElementById('btn-code').addEventListener('click', () => {
    document.getElementById('btn-code').classList.add('active'); 
    document.getElementById('btn-preview').classList.remove('active');
    document.getElementById('main-area').classList.remove('show-preview');
});
document.getElementById('btn-preview').addEventListener('click', () => {
    document.getElementById('btn-preview').classList.add('active'); 
    document.getElementById('btn-code').classList.remove('active');
    document.getElementById('main-area').classList.add('show-preview');
    renderPreview();
});

btnFloatingCopy.addEventListener('click', async () => {
    const action = btnFloatingCopy.getAttribute('data-action');
    const activeArea = getActiveTextarea();
    if (action === 'paste') {
        try {
            const text = await navigator.clipboard.readText();
            document.execCommand('insertText', false, text); 
            showToast('කේතය Paste කරන ලදී!');
        } catch (err) {
            showToast('Browser Security: Long-press කර Paste කරන්න.');
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
        appFiles[currentActiveFile].content = '';
        triggerAutoSaveAndRefresh();
        showToast('මකා දමන ලදී!');
    }
});

// Settings & Splash Screen
document.getElementById('skip-splash-btn').addEventListener('click', () => document.getElementById('splash-screen').classList.add('hide'));
setTimeout(() => document.getElementById('splash-screen').classList.add('hide'), 1500);

document.getElementById('btn-settings').addEventListener('click', () => settingsModal.classList.add('show'));
document.getElementById('close-settings-modal').addEventListener('click', () => settingsModal.classList.remove('show'));

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
    let css = '', js = '';
    Object.keys(appFiles).forEach(f => {
        if(f.endsWith('.css')) css += appFiles[f].content + '\n';
        if(f.endsWith('.js')) js += appFiles[f].content + '\n';
    });
    const html = appFiles['index.html'].content;
    const bundledContent = `<!DOCTYPE html>\n<html>\n<head>\n<style>\n${css}\n</style>\n</head>\n<body>\n${html}\n<script>\n${js}\n<\/script>\n</body>\n</html>`;
    executeDownload(bundledContent, 'index.html', 'text/html');
    downloadModal.classList.remove('show');
});

document.getElementById('dl-current').addEventListener('click', () => {
    let mime = 'text/plain';
    if(currentActiveFile.endsWith('.html')) mime = 'text/html';
    if(currentActiveFile.endsWith('.css')) mime = 'text/css';
    if(currentActiveFile.endsWith('.js')) mime = 'text/javascript';
    executeDownload(appFiles[currentActiveFile].content, currentActiveFile, mime);
    downloadModal.classList.remove('show');
});

// Init
window.addEventListener('DOMContentLoaded', () => {
    renderTabsAndEditors();
    renderPreview();
});

