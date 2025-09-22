// Database simulation using localStorage
const DB = {
    users: JSON.parse(localStorage.getItem('safeher_users')) || [],
    alerts: JSON.parse(localStorage.getItem('safeher_alerts')) || [],
    
    saveUsers: function() {
        localStorage.setItem('safeher_users', JSON.stringify(this.users));
    },
    
    saveAlerts: function() {
        localStorage.setItem('safeher_alerts', JSON.stringify(this.alerts));
    },
    
    findUserByPhone: function(phone) {
        return this.users.find(user => user.phone === phone);
    },
    
    addUser: function(user) {
        this.users.push(user);
        this.saveUsers();
    },
    
    updateUser: function(phone, updates) {
        const userIndex = this.users.findIndex(user => user.phone === phone);
        if (userIndex !== -1) {
            this.users[userIndex] = {...this.users[userIndex], ...updates};
            this.saveUsers();
            return true;
        }
        return false;
    },
    
    addAlert: function(alert) {
        this.alerts.push(alert);
        this.saveAlerts();
    },
    
    getUserAlerts: function(phone) {
        return this.alerts.filter(alert => alert.userPhone === phone);
    }
};

// Current user session
let currentUser = null;
let currentSection = 'home-section';
let historyStack = ['home-section'];

// Audio element for emergency sound
const sirenSound = document.getElementById('siren-sound');
let isSoundPlaying = false;
let isAudioPrepared = false;

// Geolocation and Map variables
let map;
let marker;
let watchId;
let currentLocation = null;

// Camera variables
let mediaRecorder;
let cameraStream;
let cameraChunks = [];

// DOM Elements
const loginModal = document.getElementById('login-modal');
const alertModal = document.getElementById('alert-modal');
const editModal = document.getElementById('edit-modal');
const openLoginBtn = document.getElementById('open-login');
const closeLoginModalBtn = document.getElementById('close-login-modal');
const closeEditModalBtn = document.getElementById('close-edit-modal');
const loginForm = document.getElementById('login-form');
const editContactForm = document.getElementById('edit-contact-form');
const switchToRegisterBtn = document.getElementById('switch-to-register');
const userInfoSection = document.getElementById('user-info');
const guestLinks = document.getElementById('guest-links');
const userNameSpan = document.getElementById('user-name');
const userPhoneSpan = document.getElementById('user-phone');
const logoutBtn = document.getElementById('logout-btn');
const soundToggleBtn = document.getElementById('sound-toggle');
const locationStatusEl = document.getElementById('location-status');
const aboutLink = document.getElementById('about-link');
const featuresLink = document.getElementById('features-link');
const heroGetStartedBtn = document.getElementById('hero-get-started');
const openRegistrationBtn = document.getElementById('open-registration');
const backToPreviousBtn = document.querySelector('.back-to-previous');
const cameraStreamVideo = document.getElementById('camera-stream');
const cameraToggleBtn = document.getElementById('camera-toggle');
const cameraStatusEl = document.getElementById('camera-status');

// Function to update header links based on login status
function updateHeaderUI() {
    if (currentUser) {
        guestLinks.style.display = 'none';
        userInfoSection.style.display = 'flex';
        userNameSpan.textContent = currentUser.fullname;
    } else {
        guestLinks.style.display = 'flex';
        userInfoSection.style.display = 'none';
    }
}

// Function to show a specific section
function showSection(sectionId) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.style.display = 'none';
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'flex';
        if (sectionId !== 'home-section') {
            targetSection.style.display = 'block';
        }
        targetSection.scrollIntoView({ behavior: 'smooth' });
    }

    if (historyStack[historyStack.length - 1] !== sectionId) {
        historyStack.push(sectionId);
    }
    
    if (historyStack.length > 1 && sectionId !== 'home-section') {
        backToPreviousBtn.style.display = 'block';
    } else {
        backToPreviousBtn.style.display = 'none';
    }
    currentSection = sectionId;
}

// Event listener for back button
backToPreviousBtn.addEventListener('click', (e) => {
    e.preventDefault();
    historyStack.pop();
    const previousSection = historyStack[historyStack.length - 1] || 'home-section';
    showSection(previousSection);
});

// Prepare audio on first user interaction
function prepareAudio() {
    if (isAudioPrepared) return;
    
    sirenSound.play().then(() => {
        sirenSound.pause();
        sirenSound.currentTime = 0;
        isAudioPrepared = true;
    }).catch(error => {
        console.error("Audio preparation failed:", error);
    });
}

document.addEventListener('click', prepareAudio, { once: true });
document.addEventListener('touchstart', prepareAudio, { once: true });
document.addEventListener('keydown', prepareAudio, { once: true });

document.querySelectorAll('nav a, .hero-buttons a').forEach(link => {
    link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('data-target');
        if (targetId) {
            e.preventDefault();
            showSection(targetId);
        }
    });
});

heroGetStartedBtn.addEventListener('click', function(e) {
    e.preventDefault();
    if (!currentUser) {
        showSection('app-interface');
        document.getElementById('registration-form').scrollIntoView({ behavior: 'smooth' });
    } else {
        showSection('app-interface');
    }
});

openRegistrationBtn.addEventListener('click', function(e) {
    e.preventDefault();
    showSection('app-interface');
});

openLoginBtn.addEventListener('click', () => {
    loginModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
});

closeLoginModalBtn.addEventListener('click', () => {
    loginModal.style.display = 'none';
    document.body.style.overflow = 'auto';
});

closeEditModalBtn.addEventListener('click', () => {
    editModal.style.display = 'none';
    document.body.style.overflow = 'auto';
});

switchToRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.style.display = 'none';
    showSection('app-interface');
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const phone = document.getElementById('login-phone').value;
    const password = document.getElementById('login-password').value;
    
    const user = DB.findUserByPhone(phone);
    
    if (user && user.password === password) {
        currentUser = user;
        loginModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        updateHeaderUI();
        showSection('app-interface');
        loadUserData(user);
        
        alert('Login successful! Welcome back, ' + user.fullname);
    } else {
        alert('Invalid phone number or password. Please try again.');
    }
});

logoutBtn.addEventListener('click', () => {
    currentUser = null;
    updateHeaderUI();
    historyStack = ['home-section'];
    showSection('home-section');
    alert('You have been logged out successfully.');
});

function loadUserData(user) {
    document.getElementById('fullname').value = user.fullname || '';
    document.getElementById('phone').value = user.phone || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('address').value = user.address || '';
    document.getElementById('medical-info').value = user.medicalInfo || '';
    document.getElementById('password').value = user.password || '';
    
    const contactsList = document.getElementById('contacts-list');
    contactsList.innerHTML = '';
    
    if (user.emergencyContacts && user.emergencyContacts.length > 0) {
        user.emergencyContacts.forEach((contact, index) => {
            const li = document.createElement('li');
            li.className = 'contact-item';
            li.innerHTML = `
                <div class="contact-info">
                    <div class="contact-name">${contact.name} (${contact.relationship})</div>
                    <div class="contact-number">${contact.phone}</div>
                </div>
                <div class="contact-actions">
                    <button class="action-btn edit-contact" data-index="${index}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete delete-contact" data-index="${index}"><i class="fas fa-trash"></i></button>
                </div>
            `;
            contactsList.appendChild(li);
        });
        
        document.querySelectorAll('.edit-contact').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = this.getAttribute('data-index');
                editContact(index);
            });
        });
        
        document.querySelectorAll('.delete-contact').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = this.getAttribute('data-index');
                deleteContact(index);
            });
        });
    }
    
    const alertHistory = document.getElementById('alert-history');
    alertHistory.innerHTML = '';
    
    const userAlerts = DB.getUserAlerts(user.phone) || [];
    if (userAlerts.length > 0) {
        userAlerts.forEach(alert => {
            const alertItem = document.createElement('div');
            alertItem.className = 'alert-item';
            alertItem.innerHTML = `
                <div class="alert-date"><strong>Date:</strong> ${new Date(alert.timestamp).toLocaleString()}</div>
                <div class="alert-status"><strong>Status:</strong> ${alert.status}</div>
                <div class="alert-location"><strong>Location:</strong> ${alert.location.lat ? `Lat: ${alert.location.lat.toFixed(4)}, Lng: ${alert.location.lng.toFixed(4)}` : 'N/A'}</div>
                <div class="alert-video"><strong>Video:</strong> ${alert.videoUrl ? `<a href="${alert.videoUrl}" target="_blank">View Video</a>` : 'N/A'}</div>
            `;
            alertHistory.appendChild(alertItem);
        });
    } else {
        alertHistory.innerHTML = '<p>No alert history found.</p>';
    }
}

function editContact(index) {
    const contact = currentUser.emergencyContacts[index];
    
    document.getElementById('edit-contact-index').value = index;
    document.getElementById('edit-contact-name').value = contact.name;
    document.getElementById('edit-contact-phone').value = contact.phone;
    document.getElementById('edit-relationship').value = contact.relationship;
    
    editModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

editContactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const index = document.getElementById('edit-contact-index').value;
    const name = document.getElementById('edit-contact-name').value;
    const phone = document.getElementById('edit-contact-phone').value;
    const relationship = document.getElementById('edit-relationship').value;
    
    currentUser.emergencyContacts[index] = { name, phone, relationship };
    
    const userIndex = DB.users.findIndex(user => user.phone === currentUser.phone);
    if (userIndex !== -1) {
        DB.users[userIndex].emergencyContacts = currentUser.emergencyContacts;
        DB.saveUsers();
        
        loadUserData(currentUser);
        
        editModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        alert('Contact updated successfully!');
    }
});

function deleteContact(index) {
    if (confirm('Are you sure you want to delete this contact?')) {
        currentUser.emergencyContacts.splice(index, 1);
        
        const userIndex = DB.users.findIndex(user => user.phone === currentUser.phone);
        if (userIndex !== -1) {
            DB.users[userIndex].emergencyContacts = currentUser.emergencyContacts;
            DB.saveUsers();
            
            loadUserData(currentUser);
            
            alert('Contact deleted successfully!');
        }
    }
}

document.getElementById('registration-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const fullname = document.getElementById('fullname').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const address = document.getElementById('address').value;
    const medicalInfo = document.getElementById('medical-info').value;
    const password = document.getElementById('password').value;
    
    const existingUser = DB.findUserByPhone(phone);
    
    if (existingUser) {
        alert('This phone number is already registered. Please login instead.');
        loginModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        return;
    }
    
    const newUser = {
        fullname,
        phone,
        email,
        address,
        medicalInfo,
        password,
        emergencyContacts: [],
        createdAt: new Date().toISOString()
    };
    
    DB.addUser(newUser);
    currentUser = newUser;
    
    updateHeaderUI();
    
    alert('Registration successful! Your account has been created.');
    
    loadUserData(currentUser);
});

document.getElementById('add-contact').addEventListener('click', function() {
    if (!currentUser) {
        alert('Please register or login first.');
        return;
    }
    
    const name = document.getElementById('contact-name').value;
    const phone = document.getElementById('contact-phone').value;
    const relationship = document.getElementById('relationship').value;
    
    if (name && phone) {
        const newContact = { name, phone, relationship };
        
        const userIndex = DB.users.findIndex(user => user.phone === currentUser.phone);
        if (userIndex !== -1) {
            if (!DB.users[userIndex].emergencyContacts) {
                DB.users[userIndex].emergencyContacts = [];
            }
            DB.users[userIndex].emergencyContacts.push(newContact);
            DB.saveUsers();
            
            currentUser = DB.users[userIndex];
            
            loadUserData(currentUser);
            
            document.getElementById('contact-name').value = '';
            document.getElementById('contact-phone').value = '';
        }
    } else {
        alert('Please enter both name and phone number');
    }
});

// SOS Button functionality
const sosButton = document.getElementById('sos-button');
const cancelAlert = document.getElementById('cancel-alert');
const alertTimer = document.getElementById('alert-timer');

let countdown;
let timeLeft = 30;

sosButton.addEventListener('click', function() {
    if (!currentUser) {
        alert('Please register or login first.');
        return;
    }
    
    alertModal.style.display = 'flex';
    timeLeft = 30;
    alertTimer.textContent = '00:30';
    
    const notifiedContactsEl = document.getElementById('notified-contacts');
    if (currentUser.emergencyContacts && currentUser.emergencyContacts.length > 0) {
        notifiedContactsEl.textContent = currentUser.emergencyContacts.map(c => c.name).join(', ');
    } else {
        notifiedContactsEl.textContent = 'No contacts available';
    }

    playEmergencySound();
    startLocationTracking();
    startCameraRecording();

    countdown = setInterval(function() {
        timeLeft--;
        alertTimer.textContent = `00:${timeLeft.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(countdown);
            stopLocationTracking();
            stopCameraRecording();
            
            let videoUrl = null;
            if (cameraChunks.length > 0) {
                const videoBlob = new Blob(cameraChunks, { type: 'video/webm' });
                videoUrl = URL.createObjectURL(videoBlob);
            }
            
            const newAlert = {
                userPhone: currentUser.phone,
                timestamp: new Date().toISOString(),
                status: 'Sent to authorities and contacts',
                location: currentLocation,
                videoUrl: videoUrl
            };
            
            DB.addAlert(newAlert);
            cameraChunks = []; 
            
            stopEmergencySound();
            
            alert('Emergency alert has been sent!');
            alertModal.style.display = 'none';
            
            if (currentUser) {
                loadUserData(currentUser);
            }
        }
    }, 1000);
});

function playEmergencySound() {
    sirenSound.play().then(() => {
        isSoundPlaying = true;
        soundToggleBtn.innerHTML = '<i class="fas fa-volume-mute"></i> Mute Sound';
    }).catch(error => {
        console.error("Error playing sound:", error);
    });
}

function stopEmergencySound() {
    sirenSound.pause();
    sirenSound.currentTime = 0;
    isSoundPlaying = false;
}

soundToggleBtn.addEventListener('click', function() {
    if (isSoundPlaying) {
        sirenSound.pause();
        soundToggleBtn.innerHTML = '<i class="fas fa-volume-up"></i> Unmute Sound';
    } else {
        sirenSound.play().then(() => {
            soundToggleBtn.innerHTML = '<i class="fas fa-volume-mute"></i> Mute Sound';
        }).catch(error => {
            console.error("Error playing sound:", error);
        });
    }
    isSoundPlaying = !isSoundPlaying;
});

function startLocationTracking() {
    if (!navigator.geolocation) {
        locationStatusEl.textContent = 'Geolocation is not supported by your browser.';
        return;
    }

    locationStatusEl.textContent = 'Getting your location...';
    
    if (!map) {
        map = L.map('mapid').setView([0, 0], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);
        marker = L.marker([0, 0]).addTo(map);
    }

    watchId = navigator.geolocation.watchPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            currentLocation = { lat, lng };

            const newLatLng = new L.LatLng(lat, lng);
            map.setView(newLatLng, 17);
            marker.setLatLng(newLatLng);
            
            locationStatusEl.textContent = `Location: Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;

            const policeLocation = { lat: lat + 0.01, lng: lng + 0.01 };
            const distance = calculateDistance(lat, lng, policeLocation.lat, policeLocation.lng);
            document.getElementById('police-distance').textContent = `${distance.toFixed(2)} km away`;
            
        }, 
        function(error) {
            console.error("Geolocation error:", error);
            let message = 'Location access denied.';
            if (error.code === error.PERMISSION_DENIED) {
                message = 'Location access denied. Please enable location services.';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                message = 'Location information is unavailable.';
            } else if (error.code === error.TIMEOUT) {
                message = 'The request to get user location timed out.';
            }
            locationStatusEl.textContent = message;
        }, 
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
}

function stopLocationTracking() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        console.log("Location tracking stopped.");
    }
}

function startCameraRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        cameraStatusEl.textContent = "Camera is not supported by your browser.";
        return;
    }

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            cameraStream = stream;
            cameraStreamVideo.srcObject = stream;
            cameraStreamVideo.style.display = 'block';
            
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = event => {
                cameraChunks.push(event.data);
            };
            
            mediaRecorder.start();
            cameraStatusEl.textContent = "Camera recording started.";
            cameraToggleBtn.innerHTML = '<i class="fas fa-video-slash"></i> Camera Off';
        })
        .catch(err => {
            console.error("Error accessing camera:", err);
            cameraStatusEl.textContent = "Error accessing camera. Please allow camera permission.";
        });
}

function stopCameraRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStreamVideo.srcObject = null;
        cameraStreamVideo.style.display = 'none';
        cameraStatusEl.textContent = "Camera recording stopped.";
        cameraToggleBtn.innerHTML = '<i class="fas fa-video"></i> Camera On';
    }
}

cameraToggleBtn.addEventListener('click', () => {
    if (cameraStream) {
        stopCameraRecording();
    } else {
        startCameraRecording();
    }
});

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c / 1000;
    return d;
}

cancelAlert.addEventListener('click', function() {
    clearInterval(countdown);
    stopLocationTracking();
    stopCameraRecording();
    
    const newAlert = {
        userPhone: currentUser.phone,
        timestamp: new Date().toISOString(),
        status: 'Cancelled by user',
        location: currentLocation,
        videoUrl: null
    };
    
    DB.addAlert(newAlert);
    
    stopEmergencySound();
    
    alertModal.style.display = 'none';
    alert('Emergency alert cancelled.');
    
    if (currentUser) {
        loadUserData(currentUser);
    }
});

alertModal.addEventListener('click', function(e) {
    if (e.target === alertModal) {
        clearInterval(countdown);
        stopLocationTracking();
        stopCameraRecording();
        
        stopEmergencySound();
        
        alertModal.style.display = 'none';
    }
});

editModal.addEventListener('click', function(e) {
    if (e.target === editModal) {
        editModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(`${tabId}-tab`).classList.add('active');
        
        if (currentUser && (tabId === 'contacts' || tabId === 'alerts')) {
            loadUserData(currentUser);
        }
    });
});

updateHeaderUI();
showSection('home-section');