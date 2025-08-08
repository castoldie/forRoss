// ===== CONFIGURATION =====
const DRIVE_FOLDER_ID = '18C7Dq4piMVvx8vRmbgYZScpaJsX87gVT';
const API_KEY = 'AIzaSyBTlcx8EZ2Ez3XUJD6CU-TooQZoaiqffEc';
const CLIENT_ID = '43317865979-ov2f56afttm1k76sm9qsqlstq3a1l3qi.apps.googleusercontent.com';
const ADMIN_PASSWORD = "porrazzo123";

// ===== STATE VARIABLES =====
let isAdminMode = false;
let currentMediaIndex = 0;
let mediaItems = [];
let tokenClient;

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

// ===== GOOGLE IDENTITY SERVICES (NEW AUTH) =====
function initGoogleAuth() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                initGapiClient(tokenResponse.access_token);
            }
        },
        error_callback: (error) => {
            console.error('Token error:', error);
            showErrorMessage('Authentication failed');
            updateDriveStatus('Auth failed', 'disconnected');
        }
    });
}

function initGapiClient(accessToken) {
    gapi.load('client', () => {
        gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
        }).then(() => {
            // Set the access token
            gapi.client.setToken({access_token: accessToken});
            
            console.log('Google API initialized');
            updateDriveStatus('Connected to memories', 'connected');
            loadDriveMedia();
        }).catch(error => {
            console.error('GAPI init error:', error);
            showErrorMessage('API initialization failed');
            updateDriveStatus('Connection failed', 'disconnected');
        });
    });
}

// ===== DRIVE API FUNCTIONS =====
async function loadDriveMedia() {
    updateDriveStatus('Loading memories...', 'disconnected');
    
    try {
        const response = await gapi.client.drive.files.list({
            q: `'${DRIVE_FOLDER_ID}' in parents and 
                (mimeType contains 'image/' or mimeType contains 'video/') and 
                trashed = false`,
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
        mediaItem.onclick = () => openLightbox(index);
        
        if (media.type === 'video') {
            mediaItem.innerHTML = `
                <img src="${media.thumbnail}" alt="${media.name}" loading="lazy">
                <div class="video-indicator">
                    <i class="fas fa-play"></i>
                </div>
            `;
        } else {
            mediaItem.innerHTML = `<img src="${media.thumbnail}" alt="${media.name}" loading="lazy">`;
        }
        
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

// ===== ADMIN FUNCTIONS =====
function toggleAdminMode() {
    if (isAdminMode) {
        isAdminMode = false;
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) {
            adminBtn.classList.remove('admin-active');
            adminBtn.innerHTML = '🔒';
        }
    } else {
        const password = prompt('Enter admin password:');
        if (password === ADMIN_PASSWORD) {
            isAdminMode = true;
            const adminBtn = document.getElementById('adminBtn');
            if (adminBtn) {
                adminBtn.classList.add('admin-active');
                adminBtn.innerHTML = '👑';
            }
        } else if (password !== null) {
            alert('Password errata');
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

// ===== DRIVE STATUS =====
function updateDriveStatus(message, status) {
    const statusElement = document.getElementById('driveStatus');
    if (statusElement) {
        statusElement.innerHTML = `<i class="fas fa-hdd"></i> <span>${message}</span>`;
        statusElement.className = `drive-status ${status}`;
    }
}

// ===== UPLOAD HANDLER =====
function uploadPhoto() {
    showErrorMessage('Upload directly to Google Drive. Refresh after uploading.');
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Google Identity Services
    initGoogleAuth();
    
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        adminBtn.addEventListener('click', toggleAdminMode);
    }
    
    // Event delegation for lightbox
    document.addEventListener('click', (e) => {
        const lightbox = document.getElementById('lightbox');
        if (lightbox && e.target === lightbox) closeLightbox();
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        const lightbox = document.getElementById('lightbox');
        if (lightbox && lightbox.classList.contains('active')) {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') openLightbox(Math.max(0, currentMediaIndex - 1));
            if (e.key === 'ArrowRight') openLightbox(Math.min(mediaItems.length - 1, currentMediaIndex + 1));
        }
    });
    
    // Start authentication (non-blocking)
    setTimeout(() => {
        if (tokenClient) {
            tokenClient.requestAccessToken({prompt: ''});
        }
    }, 1000);
});