// Global variables
let videoElement;
let canvasElement;
let canvasContext;
let streamStarted = false;
let mediaStream = null;

// Initialize the camera when the page loads
function initCamera() {
    // Create or get the necessary HTML elements
    videoElement = document.getElementById('webcam') || createVideoElement();
    canvasElement = document.getElementById('canvas') || createCanvasElement();
    canvasContext = canvasElement.getContext('2d');
    
    // Request camera access from the browser
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                // Success - camera access granted
                mediaStream = stream;
                videoElement.srcObject = stream;
                streamStarted = true;
                
                // Show the video element on the page
                videoElement.style.display = 'block';
                
                // Add a status message
                updateStatus('Camera connected', 'success');
            })
            .catch(error => {
                // Error - camera access denied or not available
                console.error('Camera error:', error);
                updateStatus('Camera access denied or unavailable. Please allow camera access and reload the page.', 'error');
            });
    } else {
        updateStatus('Your browser does not support camera access', 'error');
    }
}

// Create a video element if it doesn't exist
function createVideoElement() {
    const video = document.createElement('video');
    video.id = 'webcam';
    video.autoplay = true;
    video.style.width = '100%';
    video.style.maxWidth = '320px';
    video.style.display = 'none';
    
    // Find the camera container div 
    const cameraContainer = document.getElementById('camera') || document.body;
    cameraContainer.appendChild(video);
    
    return video;
}

// Create a canvas element if it doesn't exist
function createCanvasElement() {
    const canvas = document.createElement('canvas');
    canvas.id = 'canvas';
    canvas.width = 320;
    canvas.height = 240;
    canvas.style.display = 'none';
    
    // Find the camera container div
    const cameraContainer = document.getElementById('camera') || document.body;
    cameraContainer.appendChild(canvas);
    
    return canvas;
}

// Update the status message on the page
function updateStatus(message, type) {
    const statusDiv = document.getElementById('cameraStatus') || createStatusElement();
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
}

// Create a status element if it doesn't exist
function createStatusElement() {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'cameraStatus';
    statusDiv.className = 'status';
    
    // Add styles
    statusDiv.style.padding = '10px';
    statusDiv.style.marginTop = '10px';
    statusDiv.style.borderRadius = '5px';
    statusDiv.style.textAlign = 'center';
    
    // Find the camera container div
    const cameraContainer = document.getElementById('camera') || document.body;
    cameraContainer.appendChild(statusDiv);
    
    return statusDiv;
}

// Capture an image from the video stream
function captureImage() {
    if (!streamStarted) {
        updateStatus('Camera not started', 'error');
        return null;
    }
    
    // Draw the current video frame to the canvas
    canvasContext.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    
    // Convert canvas to data URL (base64 encoded image)
    const imageDataUrl = canvasElement.toDataURL('image/jpeg');
    
    return imageDataUrl;
}

// Send the captured image to the server for prediction
function sendImageForPrediction(callback) {
    if (!streamStarted) {
        callback({ status: 'error', message: 'Camera not available' });
        return;
    }
    
    // Capture the image
    const imageData = captureImage();
    if (!imageData) {
        callback({ status: 'error', message: 'Failed to capture image' });
        return;
    }
    
    // Remove the data URL prefix to get just the base64 data
    const base64Data = imageData.split(',')[1];
    
    // Send the image data to the server
    fetch('/predict_image', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Data })
    })
    .then(response => response.json())
    .then(data => {
        callback(data);
    })
    .catch(error => {
        console.error('Error sending image for prediction:', error);
        callback({ status: 'error', message: 'Network error' });
    });
}

// Stop the camera stream
function stopCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => {
            track.stop();
        });
        streamStarted = false;
        mediaStream = null;
        
        if (videoElement) {
            videoElement.srcObject = null;
            videoElement.style.display = 'none';
        }
        
        updateStatus('Camera stopped', 'info');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on a page that needs the camera
    const cameraContainer = document.getElementById('camera');
    if (cameraContainer) {
        initCamera();
    }
}); 