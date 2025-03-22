// Global variables for speech recognition
let recognition;
let isRecording = false;
let micButton;
let micStatus;

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    micButton = document.getElementById('micButton');
    micStatus = document.getElementById('micStatus');
    
    // Initialize speech recognition
    initSpeechRecognition();
    
    // Add event listener to the microphone button
    if (micButton) {
        micButton.addEventListener('click', toggleRecording);
    }
});

// Initialize speech recognition
function initSpeechRecognition() {
    // Check if the browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        updateMicStatus('Speech recognition is not supported in your browser. Try using Chrome.', 'error');
        return;
    }
    
    // Create speech recognition object
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    
    // Configure speech recognition
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    // Set up event handlers
    recognition.onstart = () => {
        isRecording = true;
        updateMicStatus('Listening...', 'info');
        updateMicButtonState(true);
    };
    
    recognition.onend = () => {
        isRecording = false;
        updateMicButtonState(false);
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        processSpeech(transcript);
    };
    
    recognition.onerror = (event) => {
        isRecording = false;
        updateMicButtonState(false);
        
        if (event.error === 'no-speech') {
            updateMicStatus('No speech was detected. Please try again.', 'error');
        } else if (event.error === 'audio-capture') {
            updateMicStatus('No microphone was found. Please check your microphone settings.', 'error');
        } else if (event.error === 'not-allowed') {
            updateMicStatus('Microphone permission was denied. Please allow microphone access.', 'error');
        } else {
            updateMicStatus(`Error: ${event.error}`, 'error');
        }
    };
}

// Toggle recording state
function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

// Start recording
function startRecording() {
    if (!recognition) {
        updateMicStatus('Speech recognition is not supported in your browser.', 'error');
        return;
    }
    
    try {
        recognition.start();
    } catch (error) {
        console.error('Error starting speech recognition:', error);
        updateMicStatus('Error starting speech recognition. Please try again.', 'error');
    }
}

// Stop recording
function stopRecording() {
    if (recognition && isRecording) {
        recognition.stop();
    }
}

// Update microphone button state
function updateMicButtonState(isActive) {
    const micImage = document.getElementById('micImage');
    if (micImage) {
        if (isActive) {
            micImage.src = "../static/images/wired-outline-188-microphone-recording-loop-recording.gif";
            micImage.classList.add('recording');
        } else {
            micImage.src = "../static/images/wired-outline-188-microphone-recording-hover-recording.png";
            micImage.classList.remove('recording');
        }
    }
}

// Update microphone status message
function updateMicStatus(message, type = 'info') {
    const statusElement = document.getElementById('micStatus');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = 'mic-status';
        statusElement.classList.add(`mic-status-${type}`);
    }
}

// Process speech - this function can be overridden by page-specific scripts
function processSpeech(transcript) {
    fetch('/process_speech', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript: transcript })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            updateMicStatus(data.message, 'success');
            if (data.image) {
                const speechImageElement = document.getElementById('speechImage');
                if (speechImageElement) {
                    speechImageElement.src = data.image;
                    speechImageElement.style.display = 'block';
                }
            }
        } else {
            updateMicStatus(data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error processing speech:', error);
        updateMicStatus('Error processing speech. Please try again.', 'error');
    });
} 
}); 