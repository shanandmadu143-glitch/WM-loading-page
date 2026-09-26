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

// ---------------- 3. Custom UI Components (Popups & Toasts) ----------------
function showToast(text) {
    document.getElementById('toast-text').innerText = text;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 2500);
}

function showConfirm(title, message, onConfirm) {
    const modal = document.getElementById('custom-confirm-modal');
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = message;
    modal.classList.add('show');
    
    // Remove old event listeners using cloneNode trick
    const btnOk = document.getElementById('btn-confirm-ok');
    const btnCancel = document.getElementById('btn-confirm-cancel');
    const btnClose = document.getElementById('close-confirm-modal');
    
    const newBtnOk = btnOk.cloneNode(true);
    const newBtnCancel = btnCancel.cloneNode(true);
    const newBtnClose = btnClose.cloneNode(true);
    
    btnOk.parentNode.replaceChild(newBtnOk, btnOk);
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
    btnClose.parentNode.replaceChild(newBtnClose, btnClose);
    
    const closeModal = () => modal.classList.remove('show');
    
    newBtnCancel.addEventListener('click', closeModal);
    newBtnClose.addEventListener('click', closeModal);
    newBtnOk.addEventListener('click', () => {
        closeModal();
        onConfirm();
    });
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
    showConfirm('⚠️ ගොනුව මකා දැමීම', `"${fileName}" සම්පූර්ණයෙන්ම මකා දැමීමට ඔබට අවශ්‍යද?`, () => {
        delete appFiles[fileName];
        if(currentActiveFile === fileName) currentActiveFile = 'index.html';
        saveState();
        renderTabsAndEditors();
        triggerAutoSaveAndRefresh();
        showToast('🗑️ File එක මකා දමන ලදී!');
    });
}

// ---------------- 4. Add & Open File Logic ----------------
btnAddTab.onclick = () => {
    document.getElementById('new-file-name').value = '';
    newFileModal.classList.add('show');
    document.getElementById('new-file-name').focus();
};
document.getElementById('close-new-file-modal').onclick = () => newFileModal.classList.remove('show');

document.getElementById('btn-create-file').onclick = () => {
    let name = document.getElementById('new-file-name').value.trim();
    if(!name) return showToast('❌ කරුණාකර නමක් ඇතුලත් කරන්න!');
    if(appFiles[name]) return showToast('❌ මෙම නමින් File එකක් දැනටමත් ඇත!');
    
    appFiles[name] = { content: '' };
    currentActiveFile = name;
    saveState();
    newFileModal.classList.remove('show');
    renderTabsAndEditors();
    showToast(`✅ ${name} සෑදුවා!`);
};

// Handle Open Local File Icon
document.getElementById('btn-open-file').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', (e) => {
    const files = e.target.files;
    if(files.length === 0) return;
    
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            let fileName = file.name;
            appFiles[fileName] = { content: content };
            currentActiveFile = fileName;
            saveState();
            renderTabsAndEditors();
            showToast(`📁 ${fileName} විවෘත කළා!`);
        };
        reader.readAsText(file);
    });
    e.target.value = ''; // Reset input
});

// Handle Undo Icon
document.getElementById('btn-undo').addEventListener('click', () => {
    const activeArea = getActiveTextarea();
    if(activeArea) {
        activeArea.focus();
        document.execCommand('undo');
        appFiles[currentActiveFile].content = activeArea.value;
        triggerAutoSaveAndRefresh();
        showToast('↩️ Undo සාර්ථකයි!');
    }
});

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
            showToast('✅ කේතය Paste කරන ලදී!');
        } catch (err) {
            showToast('⚠️ Browser Security: Long-press කර Paste කරන්න.');
        }
    } else {
        activeArea.select();
        document.execCommand('copy');
        showToast('✅ කේතය සාර්ථකව Copy විය!');
    }
});

document.getElementById('btn-floating-delete').addEventListener('click', () => {
    showConfirm('⚠️ කේතය මකා දැමීම', 'විවෘත කර ඇති කේතය සම්පූර්ණයෙන්ම මකා දැමීමට අවශ්‍යද?', () => {
        getActiveTextarea().value = '';
        appFiles[currentActiveFile].content = '';
        triggerAutoSaveAndRefresh();
        showToast('🗑️ මකා දමන ලදී!');
    });
});

// Settings & Splash Screen
document.getElementById('skip-splash-btn').addEventListener('click', () => document.getElementById('splash-screen').classList.add('hide'));
setTimeout(() => document.getElementById('splash-screen').classList.add('hide'), 1500);

document.getElementById('btn-settings').addEventListener('click', () => settingsModal.classList.add('show'));
document.getElementById('close-settings-modal').addEventListener('click', () => settingsModal.classList.remove('show'));

// Theme Switcher Logic (Bugs Fixed)
const themeCards = document.querySelectorAll('.theme-card');
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ide-theme', theme);
    themeCards.forEach(c => {
        if(c.getAttribute('data-theme') === theme) c.classList.add('active');
        else c.classList.remove('active');
    });
}
themeCards.forEach(card => {
    card.addEventListener('click', (e) => setTheme(e.currentTarget.getAttribute('data-theme')));
});

// Downloads (Bugs Fixed)
document.getElementById('modal-btn-download').addEventListener('click', () => {
    settingsModal.classList.remove('show'); downloadModal.classList.add('show');
});
document.getElementById('close-download-modal').addEventListener('click', () => downloadModal.classList.remove('show'));

function executeDownload(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); // Appending to DOM fixes download issues in some browsers
    a.click();
    document.body.removeChild(a); // Cleanup
    URL.revokeObjectURL(url);
    showToast('📥 Download වීම ආරම්භ විය!');
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
    const savedTheme = localStorage.getItem('ide-theme') || 'default';
    setTheme(savedTheme);
    renderTabsAndEditors();
    renderPreview();
});
