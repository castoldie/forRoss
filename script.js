// Configuration - YOU MUST SET THESE VALUES
const DRIVE_FOLDER_ID = '18C7Dq4piMVvx8vRmbgYZScpaJsX87gVT';
const API_KEY = 'AIzaSyBTlcx8EZ2Ez3XUJD6CU-TooQZoaiqffEc';
const CLIENT_ID = '43317865979-ov2f56afttm1k76sm9qsqlstq3a1l3qi.apps.googleusercontent.com';
const CLIENT_SECRET = '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'
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

// Admin and state variables
const ADMIN_PASSWORD = "porrazzo123";
let isAdminMode = false;
let currentMediaIndex = 0;
let mediaItems = [];
let gapiInitialized = false;

// Initialize Google API
function initGoogleDrive() {
    gapi.load('client:auth2', initClient);
}

function initClient() {
    gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        scope: SCOPES
    }).then(() => {
        gapiInitialized = true;
        updateDriveStatus('Connected to memories', 'connected');
        loadDriveMedia();
    }, (error) => {
        console.error('Google API init error:', error);
        updateDriveStatus('Connection failed', 'disconnected');
    });
}

// Load media from Google Drive
function loadDriveMedia() {
    if (!gapiInitialized) {
        updateDriveStatus('Connecting...', 'disconnected');
        initGoogleDrive();
        return;
    }

    updateDriveStatus('Loading memories...', 'disconnected');

    gapi.client.drive.files.list({
        q: `'${DRIVE_FOLDER_ID}' in parents and (mimeType contains 'image/' or mimeType contains 'video/')`,
        fields: 'files(id, name, mimeType, webContentLink, thumbnailLink)',
        orderBy: 'createdTime desc'
    }).then(response => {
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
        updateStats();
    }, error => {
        console.error('Drive API error:', error);
        updateDriveStatus('Error loading memories', 'disconnected');
    });
}

// Render media to the board
function renderMedia() {
    const photosContainer = document.getElementById('photosContainer');
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
                <img src="${media.thumbnail}" alt="${media.name}">
                <div class="video-indicator">
                    <i class="fas fa-play"></i>
                </div>
            `;
        } else {
            mediaElement = `<img src="${media.thumbnail}" alt="${media.name}">`;
        }
        
        mediaItem.innerHTML = `
            ${mediaElement}
            <button class="delete-btn" onclick="deleteMedia(event, '${media.id}')" style="display: ${isAdminMode ? 'flex' : 'none'}">✕</button>
        `;
        
        photosContainer.appendChild(mediaItem);
    });
}

// Update drive connection status
function updateDriveStatus(message, status) {
    const statusElement = document.getElementById('driveStatus');
    statusElement.innerHTML = `<i class="fas fa-hdd"></i> <span>${message}</span>`;
    statusElement.className = `drive-status ${status}`;
}

// Delete media (admin only)
function deleteMedia(event, fileId) {
    event.stopPropagation();
    
    if (!isAdminMode) return;
    
    if (confirm('Sei sicuro di voler rimuovere questo elemento?')) {
        gapi.client.drive.files.delete({
            fileId: fileId
        }).then(() => {
            loadDriveMedia(); // Refresh media
        }, error => {
            console.error('Delete error:', error);
            showErrorMessage('Errore nella cancellazione');
        });
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('adminBtn').addEventListener('click', toggleAdminMode);
    initGoogleDrive();
});

// Lightbox functions (updated for Drive URLs)
function openLightbox(index) {
    currentMediaIndex = index;
    const media = mediaItems[index];
    
    const lightbox = document.getElementById('lightbox');
    const lightboxContent = document.getElementById('lightboxContent');
    const mediaCounter = document.getElementById('mediaCounter');
    
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

// Toggle admin mode
function toggleAdminMode() {
    if (isAdminMode) {
        isAdminMode = false;
        document.getElementById('adminBtn').classList.remove('admin-active');
        document.getElementById('adminBtn').innerHTML = '🔒';
        hideDeleteButtons();
    } else {
        const password = prompt('Enter admin password:');
        if (password === ADMIN_PASSWORD) {
            isAdminMode = true;
            document.getElementById('adminBtn').classList.add('admin-active');
            document.getElementById('adminBtn').innerHTML = '👑';
            showDeleteButtons();
        } else if (password !== null) {
            alert('Password errata');
        }
    }
}

// Show/hide delete buttons
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

// Update stats
function updateStats() {
    document.getElementById('photoCount').textContent = mediaItems.length;
}

// Upload function removed - Use Google Drive interface for uploads
function uploadPhoto() {
    showErrorMessage('Carica direttamente su Google Drive. Aggiorna la pagina dopo il caricamento.');
}

// Other functions (closeLightbox, changeMedia, etc.) remain the same as before
// ... [Keep all your existing lightbox and utility functions] ...