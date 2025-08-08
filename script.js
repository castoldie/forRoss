// Avoid duplicate execution
if (typeof window.MEMORIAL_INITIALIZED === 'undefined') {
window.MEMORIAL_INITIALIZED = true;

// ===== CONFIGURATION =====
const DRIVE_FOLDER_ID = '18C7Dq4piMVvx8vRmbgYZScpaJsX87gVT';
const API_KEY = 'AIzaSyBTlcx8EZ2Ez3XUJD6CU-TooQZoaiqffEc';
const CLIENT_ID = '43317865979-ov2f56afttm1k76sm9qsqlstq3a1l3qi.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
const ADMIN_PASSWORD = "porrazzo123";

// ===== STATE VARIABLES =====
let isAdminMode = false;
let currentMediaIndex = 0;
let mediaItems = [];
let gapiInitialized = false;

// ===== MESSAGE FUNCTIONS =====
function showSuccessMessage(message) {
    const element = document.getElementById('successMessage');
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => element.style.display = 'none', 5000);
    }
}

function showErrorMessage(message) {
    const element = document.getElementById('errorMessage');
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => element.style.display = 'none', 5000);
    }
}

function hideMessages() {
    const success = document.getElementById('successMessage');
    const error = document.getElementById('errorMessage');
    if (success) success.style.display = 'none';
    if (error) error.style.display = 'none';
}

// ===== DRIVE STATUS =====
function updateDriveStatus(message, status) {
    const statusElement = document.getElementById('driveStatus');
    if (statusElement) {
        statusElement.innerHTML = `<i class="fas fa-hdd"></i> <span>${message}</span>`;
        statusElement.className = `drive-status ${status}`;
    }
}

// ===== GOOGLE DRIVE API =====
function initGoogleDrive() {
    if (typeof gapi === 'undefined') {
        showErrorMessage('Google API library not loaded');
        return;
    }
    
    gapi.load('client:auth2', {
        callback: initClient,
        onerror: () => {
            showErrorMessage('Failed to load Google API client');
            updateDriveStatus('API load failed', 'disconnected');
        }
    });
}

function initClient() {
    gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        scope: SCOPES
    }).then(() => {
        console.log('Google API initialized successfully');
        gapiInitialized = true;
        updateDriveStatus('Connected to memories', 'connected');
        loadDriveMedia();
    }).catch(error => {
        console.error('Google API init error:', error);
        let errorMsg = 'API initialization failed';
        
        if (error.details) {
            errorMsg += `: ${error.details}`;
        } else if (error.error) {
            errorMsg += `: ${error.error}`;
        }
        
        showErrorMessage(errorMsg);
        updateDriveStatus('Connection failed', 'disconnected');
    });
}

async function loadDriveMedia() {
    updateDriveStatus('Loading memories...', 'disconnected');
    
    try {
        const response = await gapi.client.drive.files.list({
            q: `'${DRIVE_FOLDER_ID}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed = false`,
            fields: 'files(id, name, mimeType, webContentLink, thumbnailLink)',
            orderBy: 'createdTime desc'
        });
        
        const files = response.result.files;
        mediaItems = files.map(file => ({
            id: file.id,
            name: file.name,
            type: file.mimeType.startsWith('video') ? 'video' : 'image',
            mimeType: file.mimeType,
            url: file.webContentLink,
            thumbnail: file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}&sz=w500`
        }));
        
        renderMedia();
        updateDriveStatus('Memories loaded', 'connected');
        updateStats();
    } catch (error) {
        console.error('Drive API error:', error);
        let msg = 'Error loading memories';
        
        if (error.status === 403) {
            msg = 'Permission denied. Please check sharing settings.';
        } else if (error.status === 404) {
            msg = 'Folder not found. Check folder ID.';
        }
        
        updateDriveStatus(msg, 'disconnected');
        showErrorMessage(msg);
    }
}

// ===== RENDER MEDIA =====
function renderMedia() {
    const photosContainer = document.getElementById('photosContainer');
    if (!photosContainer) return;
    
    photosContainer.innerHTML = '';

    mediaItems.forEach((media, index) => {
        const rotation = (Math.random() * 10) - 5;
        
        const mediaItem = document.createElement('div');
        mediaItem.className = 'photo-item';
        mediaItem.style.setProperty('--rotation', `${rotation}deg`);
        mediaItem.dataset.index = index;
        mediaItem.onclick = () => openLightbox(index);
        
        let mediaElement = '';
        if (media.type === 'video') {
            mediaElement = `
                <img src="${media.thumbnail}" alt="${media.name}" loading="lazy">
                <div class="video-indicator">
                    <i class="fas fa-play"></i>
                </div>
            `;
        } else {
            mediaElement = `<img src="${media.thumbnail}" alt="${media.name}" loading="lazy">`;
        }
        
        mediaItem.innerHTML = `
            ${mediaElement}
            <button class="delete-btn" onclick="deleteMedia(event, '${media.id}')" style="display: none">✕</button>
        `;
        
        photosContainer.appendChild(mediaItem);
    });
}

// ===== LIGHTBOX FUNCTIONS =====
function openLightbox(index) {
    currentMediaIndex = index;
    const media = mediaItems[index];
    
    const lightbox = document.getElementById('lightbox');
    const lightboxContent = document.getElementById('lightboxContent');
    const mediaCounter = document.getElementById('mediaCounter');
    
    if (!lightbox || !lightboxContent || !mediaCounter) return;
    
    if (media.type === 'video') {
        lightboxContent.innerHTML = `
            <video controls autoplay>
                <source src="https://drive.google.com/uc?export=download&id=${media.id}" type="${media.mimeType}">
                Your browser does not support the video tag.
            </video>
        `;
    } else {
        lightboxContent.innerHTML = `<img src="${media.url}" alt="${media.name}">`;
    }
    
    mediaCounter.textContent = `${index + 1} / ${mediaItems.length}`;
    lightbox.classList.add('active');
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) lightbox.classList.remove('active');
    
    const video = document.querySelector('.lightbox-content video');
    if (video) video.pause();
}

function changeMedia(direction) {
    currentMediaIndex += direction;
    
    if (currentMediaIndex < 0) {
        currentMediaIndex = mediaItems.length - 1;
    } else if (currentMediaIndex >= mediaItems.length) {
        currentMediaIndex = 0;
    }
    
    openLightbox(currentMediaIndex);
}

// ===== ADMIN FUNCTIONS =====
function toggleAdminMode() {
    if (isAdminMode) {
        isAdminMode = false;
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) {
            adminBtn.classList.remove('admin-active');
            adminBtn.innerHTML = '🔒';
        }
        hideDeleteButtons();
    } else {
        const password = prompt('Enter admin password:');
        if (password === ADMIN_PASSWORD) {
            isAdminMode = true;
            const adminBtn = document.getElementById('adminBtn');
            if (adminBtn) {
                adminBtn.classList.add('admin-active');
                adminBtn.innerHTML = '👑';
            }
            showDeleteButtons();
        } else if (password !== null) {
            alert('Password errata');
        }
    }
}

function showDeleteButtons() {
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.style.display = 'flex';
    });
}

function hideDeleteButtons() {
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.style.display = 'none';
    });
}

async function deleteMedia(event, fileId) {
    event.stopPropagation();
    
    if (!isAdminMode) return;
    
    if (confirm('Sei sicuro di voler rimuovere questo elemento?')) {
        try {
            await gapi.client.drive.files.delete({ fileId });
            loadDriveMedia();
        } catch (error) {
            console.error('Delete error:', error);
            showErrorMessage('Errore nella cancellazione');
        }
    }
}

// ===== STATS =====
function updateStats() {
    const countElement = document.getElementById('photoCount');
    if (countElement) {
        countElement.textContent = mediaItems.length;
    }
}

// ===== UPLOAD HANDLER =====
function uploadPhoto() {
    showErrorMessage('Carica direttamente su Google Drive. Aggiorna la pagina dopo il caricamento.');
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded');
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        adminBtn.addEventListener('click', toggleAdminMode);
    }
    
    // Initialize Google Drive API
    if (typeof gapi !== 'undefined') {
        initGoogleDrive();
    } else {
        console.error('gapi is not loaded');
        updateDriveStatus('Google API not available', 'disconnected');
    }
    
    // Event delegation for lightbox close
    document.addEventListener('click', (e) => {
        const lightbox = document.getElementById('lightbox');
        if (lightbox && e.target === lightbox) {
            closeLightbox();
        }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        const lightbox = document.getElementById('lightbox');
        if (lightbox && lightbox.classList.contains('active')) {
            if (e.key === 'Escape') {
                closeLightbox();
            } else if (e.key === 'ArrowLeft') {
                changeMedia(-1);
            } else if (e.key === 'ArrowRight') {
                changeMedia(1);
            }
        }
    });
});

} // End of MEMORIAL_INITIALIZED