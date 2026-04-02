let validScans = parseInt(localStorage.getItem('validScans') || '0');
let isProcessing = false;
let audioCtx;

const setupDiv = document.getElementById('setup');
const mainUIDiv = document.getElementById('mainUI');
const overlay = document.getElementById('overlay');
const countDisplay = document.getElementById('count');
const overlayText = document.getElementById('overlayText');

// Initialize the display with persisted data
countDisplay.innerText = validScans;

// Ensure APP_CONFIG is defined
const config = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG : {
    VALID_PARAMETER: "",
    INVALID_PARAMETER: "",
    RESET_PIN: "1234"
};

document.getElementById('startBtn').addEventListener('click', function() {
    // Init audio context on user interaction
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Toggle UI
    setupDiv.style.display = 'none';
    mainUIDiv.style.display = 'block';
    
    startScanner();
});

document.getElementById('resetScanBtn').addEventListener('click', function() {
    const pin = prompt('Enter PIN to reset counter:');
    if (pin === config.RESET_PIN) {
        validScans = 0;
        localStorage.setItem('validScans', validScans);
        countDisplay.innerText = validScans;
        alert('Counter reset successfully.');
    } else if (pin !== null) {
        alert('Incorrect PIN.');
    }
});

function playSound(freq, waveType) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = waveType || 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    // Taper off sound quickly
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
    osc.stop(audioCtx.currentTime + 0.5);
}

function checkDateLogic(decodedText) {
    const today = new Date().toISOString().split('T')[0];
    const dates = decodedText.trim().split('|');

    if (dates.length === 2) {
        // Range logic: YYYY-MM-DD|YYYY-MM-DD
        const start = dates[0];
        const end = dates[1];
        if (today >= start && today <= end) {
            return true;
        }
    } else if (dates.length === 1) {
        // Single day logic: YYYY-MM-DD
        if (decodedText.trim() === today) {
            return true;
        }
    }
    return false;
}

function onScanSuccess(decodedText) {
    if (isProcessing) return;
    isProcessing = true;

    let isValid = false;
    let explicitStatus = false;

    // Check custom valid parameter
    if (config.VALID_PARAMETER !== "") {
        if (decodedText.trim() === config.VALID_PARAMETER) {
            isValid = true;
            explicitStatus = true;
        }
    }

    // Check custom invalid parameter
    if (!isValid && config.INVALID_PARAMETER !== "") {
        if (decodedText.trim() === config.INVALID_PARAMETER) {
            isValid = false;
            explicitStatus = true;
        }
    }

    // Fallback to Date Logic if no parameter rules matched or were supplied
    if (!explicitStatus) {
        isValid = checkDateLogic(decodedText);
    }

    triggerUI(isValid);
}

function triggerUI(isValid) {
    overlay.style.display = 'flex';

    if (isValid) {
        validScans++;
        localStorage.setItem('validScans', validScans);
        countDisplay.innerText = validScans;
        overlay.className = 'valid-bg';
        overlayText.innerText = 'VALID';
        playSound(1200, 'sine'); // High pitch beep
    } else {
        overlay.className = 'flash-red';
        overlayText.innerText = 'INVALID';
        playSound(120, 'square'); // Low pitch buzz
    }

    // Lock scanner for 2.5 seconds to prevent double scans
    setTimeout(() => {
        overlay.style.display = 'none';
        overlay.className = '';
        isProcessing = false;
    }, 2500);
}

function startScanner() {
    const html5QrCode = new Html5Qrcode("reader");
    const renderConfig = { 
        fps: 15, 
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0
    };

    html5QrCode.start(
        { facingMode: "environment" }, 
        renderConfig, 
        onScanSuccess
    ).catch(err => {
        alert("Camera Error: " + err);
    });
}
