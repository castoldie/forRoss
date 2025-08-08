// ===== GLOBAL GUARD =====
if (!window.MEMORIAL_INITIALIZED) {
window.MEMORIAL_INITIALIZED = true;

// ===== CONFIGURATION =====
const DRIVE_FOLDER_ID = '18C7Dq4piMVvx8vRmbgYZScpaJsX87gVT';
const CLIENT_ID = '43317865979-ov2f56afttm1k76sm9qsqlstq3a1l3qi.apps.googleusercontent.com';
const ADMIN_PASSWORD = "porrazzo123";
const API_KEY = 'AIzaSyBTlcx8EZ2Ez3XUJD6CU-TooQZoaiqffEc'; // Add this line

// ===== STATE VARIABLES =====
let isAdminMode = false;
let currentMediaIndex = 0;
let mediaItems = [];
let tokenClient;
let accessToken = null;

// ===== ELEMENT REFERENCES =====
const signinContainer = document.getElementById('signin-container');
const signinBtn = document.getElementById('signin-btn');
const photosContainer = document.getElementById('photosContainer');

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

// ===== GOOGLE AUTH INITIALIZATION =====
function initGoogleAuth() {
    try {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.readonly',
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    accessToken = tokenResponse.access_token;
                    signinContainer.style.display = 'none';
                    loadDriveMedia();
                }
            },
            error_callback: (error) => {
                console.error('Token error:', error);
                if (error.type === 'popup_failed_to_open') {
                    showErrorMessage('Popup blocked. Using fallback authentication...');
                    manualAuthFallback();
                } else {
                    showErrorMessage('Authentication failed. Please try again.');
                    signinContainer.style.display = 'block';
                }
            }
        });
    } catch (e) {
        console.error('Google auth init error:', e);
        signinContainer.style.display = 'block';
    }
}

// ===== SIGN IN HANDLER =====
function handleSignIn() {
    if (!tokenClient) {
        showErrorMessage('Authentication service not loaded. Please refresh the page.');
        return;
    }
    
    try {
        tokenClient.requestAccessToken({prompt: 'select_account'});
    } catch (e) {
        console.error('Sign-in error:', e);
        showErrorMessage('Failed to start authentication. Please allow popups for this site.');
    }
}

// ===== DRIVE API FUNCTIONS =====
async function loadDriveMedia() {
    updateDriveStatus('Loading memories...', 'disconnected');
    
    try {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?` +
            `q='${encodeURIComponent(DRIVE_FOLDER_ID)}'+in+parents+and+` +
            `(mimeType+contains+'image/'+or+mimeType+contains+'video/')+and+trashed=false&` +
            `fields=files(id,name,mimeType,webContentLink,thumbnailLink)&` +
            `orderBy=createdTime+desc&` +  // Add API key parameter
            `key=${API_KEY}`,  // Add this line
            
            {
                headers: {
                    'Authorization': accessToken ? `Bearer ${accessToken}` : '',
                    'Accept': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            const error = await response.json();
            throw error;
        }
        
        const data = await response.json();
        const files = data.files || [];
        
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
        
        if (error.error && error.error.code === 403) {
            msg = 'Permission denied. Please check sharing settings.';
        } else if (error.error && error.error.code === 404) {
            msg = 'Folder not found. Check folder ID.';
        }
        
        updateDriveStatus(msg, 'disconnected');
        showErrorMessage(msg);
        
        // Show empty state
        if (photosContainer) {
            photosContainer.classList.add('empty');
            photosContainer.innerHTML = '';
        }
    }
}

// ===== RENDER MEDIA =====
function renderMedia() {
    if (!photosContainer) return;
    
    photosContainer.classList.remove('empty');
    photosContainer.innerHTML = '';

    if (mediaItems.length === 0) {
        photosContainer.classList.add('empty');
        return;
    }

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
                <source src="https://drive.google.com/uc?export=view&id=${media.id}" type="${media.mimeType}">
            </video>
        `;
    } else {
        lightboxContent.innerHTML = `<img src="${media.url}" alt="${media.name}">`;
    }
    
    mediaCounter.textContent = `${index + 1} / ${mediaItems.length}`;
    lightbox.classList.add('active');
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

// ===== STATS & STATUS =====
function updateStats() {
    const countElement = document.getElementById('photoCount');
    if (countElement) {
        countElement.textContent = mediaItems.length;
    }
}

function updateDriveStatus(message, status) {
    const statusElement = document.getElementById('driveStatus');
    if (statusElement) {
        statusElement.innerHTML = `<i class="fas fa-hdd"></i> <span>${message}</span>`;
        statusElement.className = `drive-status ${status}`;
    }
}

function manualAuthFallback() {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${CLIENT_ID}&` +
        `response_type=token&` +
        `scope=https://www.googleapis.com/auth/drive.readonly&` +
        `redirect_uri=${encodeURIComponent(window.location.origin)}`;
    
    const authWindow = window.open(authUrl, '_blank', 'width=500,height=600');
    
    const checkAuth = setInterval(() => {
        try {
            if (authWindow.location.href.includes('access_token=')) {
                clearInterval(checkAuth);
                const hash = new URL(authWindow.location.href).hash.substring(1);
                const params = new URLSearchParams(hash);
                accessToken = params.get('access_token');
                authWindow.close();
                signinContainer.style.display = 'none';
                loadDriveMedia();
            }
        } catch (e) {
            // Cross-origin error expected
        }
    }, 500);
}

// ===== UPLOAD HANDLER =====
function uploadPhoto() {
    showErrorMessage('Upload directly to Google Drive. Refresh after uploading.');
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Google authentication if available
    if (typeof google !== 'undefined') {
        initGoogleAuth();
    }
    
    // Setup sign-in button
    if (signinBtn) {
        signinBtn.addEventListener('click', handleSignIn);
    }
    
    // Hide sign-in container by default
    if (signinContainer) {
        signinContainer.style.display = 'none';
    }
    
    // Show sign-in if no token after delay
    setTimeout(() => {
        if (!accessToken && signinContainer) {
            signinContainer.style.display = 'block';
        }
    }, 2000);
    
    // Admin button setup
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        adminBtn.addEventListener('click', toggleAdminMode);
    }
    
    // Lightbox event handlers
    document.addEventListener('click', (e) => {
        const lightbox = document.getElementById('lightbox');
        if (lightbox && e.target === lightbox) closeLightbox();
    });
    
    document.addEventListener('keydown', (e) => {
        const lightbox = document.getElementById('lightbox');
        if (lightbox && lightbox.classList.contains('active')) {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') changeMedia(-1);
            if (e.key === 'ArrowRight') changeMedia(1);
        }
    });
    
    // Show empty state initially
    if (photosContainer) {
        photosContainer.classList.add('empty');
    }
});
} // End of MEMORIAL_INITIALIZED