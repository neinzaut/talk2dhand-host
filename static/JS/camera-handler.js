// Global variables
let videoElement;
let canvasElement;
let canvasContext;
let streamStarted = false;
let mediaStream = null;
let mediaPipeInitialized = false;
let hands = null;

// Initialize MediaPipe
async function initMediaPipe() {
    if (!mediaPipeInitialized) {
        try {
            updateStatus('Initializing MediaPipe...', 'info');
            console.log("Loading MediaPipe Hands...");
            
            // Make sure the HTML imports the MediaPipe libraries
            // You should include these in your HTML:
            // <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"></script>
            // <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"></script>
            // <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
            
            if (typeof Hands === 'undefined') {
                updateStatus('MediaPipe library not loaded. Please check your internet connection.', 'error');
                return false;
            }
            
            hands = new Hands({locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }});
            
            hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            
            hands.onResults(onMediaPipeResults);
            
            mediaPipeInitialized = true;
            updateStatus('MediaPipe initialized', 'success');
            console.log("MediaPipe Hands initialized successfully");
            return true;
        } catch (error) {
            console.error("Error initializing MediaPipe:", error);
            updateStatus('Failed to initialize MediaPipe. Using basic mode instead.', 'error');
            return false;
        }
    }
    return mediaPipeInitialized;
}

// Handle MediaPipe results
function onMediaPipeResults(results) {
    // Clear the canvas
    canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Draw the camera feed on the canvas
    canvasContext.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    
    // Draw hand landmarks if present
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
            // Draw landmarks if drawingUtils is available
            if (typeof drawConnectors !== 'undefined') {
                drawConnectors(canvasContext, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 3});
                drawLandmarks(canvasContext, landmarks, {color: '#FF0000', lineWidth: 1});
            } else {
                // Simple landmark drawing if MediaPipe drawing utils not available
                drawSimpleLandmarks(canvasContext, landmarks);
            }
        }
    }
}

// Simple function to draw landmarks if MediaPipe drawing utils are not available
function drawSimpleLandmarks(ctx, landmarks) {
    ctx.fillStyle = "#FF0000";
    for (const landmark of landmarks) {
        const x = landmark.x * canvasElement.width;
        const y = landmark.y * canvasElement.height;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
    }
}

// Initialize the camera when the page loads
function initCamera() {
    console.log("Initializing camera handler");
    
    // Create or get the necessary HTML elements
    videoElement = document.getElementById('webcam') || createVideoElement();
    canvasElement = document.getElementById('canvas') || createCanvasElement();
    canvasContext = canvasElement.getContext('2d');
    
    // Request camera access from the browser with explicit constraints to force permission dialog
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Show a message that we're requesting access
        updateStatus('Requesting camera access...', 'info');
        
        const constraints = {
            video: {
                width: { ideal: 320 },
                height: { ideal: 240 }
            }
        };
        
        navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => {
                // Success - camera access granted
                mediaStream = stream;
                videoElement.srcObject = stream;
                streamStarted = true;
                
                // Show the video element on the page
                videoElement.style.display = 'block';
                
                // Add a status message
                updateStatus('Camera connected', 'success');
                console.log("Camera connected successfully");
            })
            .catch(error => {
                // Error - camera access denied or not available
                console.error('Camera error:', error);
                
                if (error.name === 'NotAllowedError') {
                    updateStatus('Camera access denied. Please allow camera access in your browser settings and reload the page.', 'error');
                } else if (error.name === 'NotFoundError') {
                    updateStatus('No camera detected. Please connect a camera and reload the page.', 'error');
                } else if (error.name === 'NotReadableError') {
                    updateStatus('Camera is already in use by another application.', 'error');
                } else {
                    updateStatus('Camera error: ' + error.message, 'error');
                }
            });
    } else {
        updateStatus('Your browser does not support camera access. Please try using Chrome, Firefox, or Edge.', 'error');
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

// Function to capture image from MediaPipe canvas or video element
function captureImage(videoElement, canvasElement, callback) {
    if (!videoElement || videoElement.readyState !== 4) {
        console.error("Video element not ready");
        return callback({ 
            error: true, 
            message: "Video element not ready" 
        });
    }

    try {
        // Get canvas context
        const mpCanvas = document.getElementById('output_canvas');
        const ctx = canvasElement.getContext('2d');

        // Set canvas dimensions to match video
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;

        // Clear canvas
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        // Draw from MediaPipe canvas if available, otherwise from video
        if (mpCanvas) {
            console.log("Drawing from MediaPipe canvas");
            ctx.drawImage(mpCanvas, 0, 0, canvasElement.width, canvasElement.height);
        } else {
            console.log("Drawing directly from video element");
            ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        }

        // Create a temporary canvas for resizing
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Set to reduced resolution (240x180 instead of 320x240)
        const targetWidth = 240;
        const targetHeight = 180;
        tempCanvas.width = targetWidth;
        tempCanvas.height = targetHeight;
        
        // Draw the original canvas to the temp canvas (resizing in the process)
        tempCtx.drawImage(canvasElement, 0, 0, canvasElement.width, canvasElement.height, 
                          0, 0, targetWidth, targetHeight);
        
        // Get image data with lower quality JPEG encoding
        const imageData = tempCanvas.toDataURL('image/jpeg', 0.8); // 80% quality
        
        // Log the size
        const base64Data = imageData.split(',')[1];
        console.log(`Optimized image size: ${base64Data.length} bytes`);
        
        // Remove the data URL prefix to get just the base64 data
        callback({ 
            success: true, 
            image: base64Data, 
            width: targetWidth,
            height: targetHeight,
            originalWidth: canvasElement.width,
            originalHeight: canvasElement.height
        });
    } catch (error) {
        console.error("Error capturing image:", error);
        callback({ 
            error: true, 
            message: error.message 
        });
    }
}

// Function to send image to server for prediction
function sendImageForPrediction(imageData, endpoint, callback) {
    try {
        // Make the fetch request to the server
        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: imageData })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            callback(data);
        })
        .catch(error => {
            console.error("Error in fetch:", error);
            callback({ 
                status: 'error',
                message: error.message
            });
        });
    } catch (error) {
        console.error("Error sending image:", error);
        callback({ 
            status: 'error',
            message: error.message
        });
    }
}

// Initialize the camera with a Promise
function initializeCamera() {
    return new Promise((resolve, reject) => {
        console.log("Initializing camera with Promise");
        
        // Create or get the necessary HTML elements
        videoElement = document.getElementById('webcam') || createVideoElement();
        canvasElement = document.getElementById('canvas') || createCanvasElement();
        canvasContext = canvasElement.getContext('2d');
        
        // Request camera access from the browser with explicit constraints to force permission dialog
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            // Show a message that we're requesting access
            updateStatus('Requesting camera access...', 'info');
            
            const constraints = {
                video: {
                    width: { ideal: 320 },
                    height: { ideal: 240 }
                }
            };
            
            navigator.mediaDevices.getUserMedia(constraints)
                .then(stream => {
                    // Success - camera access granted
                    mediaStream = stream;
                    videoElement.srcObject = stream;
                    streamStarted = true;
                    
                    // Show the video element on the page
                    videoElement.style.display = 'block';
                    
                    // Add a status message
                    updateStatus('Camera connected', 'success');
                    console.log("Camera connected successfully");
                    
                    // Initialize MediaPipe
                    initMediaPipe().then(success => {
                        if (success && hands) {
                            updateStatus('Camera ready with MediaPipe', 'success');
                            
                            // Start MediaPipe camera
                            try {
                                if (typeof Camera !== 'undefined') {
                                    const camera = new Camera(videoElement, {
                                        onFrame: async () => {
                                            await hands.send({image: videoElement});
                                        }
                                    });
                                    camera.start();
                                } else {
                                    // If MediaPipe Camera isn't available, use manual processing
                                    startManualMediaPipeProcessing();
                                }
                            } catch (error) {
                                console.error("Error starting MediaPipe Camera:", error);
                                startManualMediaPipeProcessing();
                            }
                        }
                        resolve(); // Resolve the promise
                    });
                })
                .catch(error => {
                    // Error - camera access denied or not available
                    console.error('Camera error:', error);
                    
                    if (error.name === 'NotAllowedError') {
                        updateStatus('Camera access denied. Please allow camera access in your browser settings and reload the page.', 'error');
                    } else if (error.name === 'NotFoundError') {
                        updateStatus('No camera detected. Please connect a camera and reload the page.', 'error');
                    } else if (error.name === 'NotReadableError') {
                        updateStatus('Camera is already in use by another application.', 'error');
                    } else {
                        updateStatus('Camera error: ' + error.message, 'error');
                    }
                    reject(error); // Reject the promise
                });
        } else {
            const error = new Error('Your browser does not support camera access');
            updateStatus('Your browser does not support camera access. Please try using Chrome, Firefox, or Edge.', 'error');
            reject(error); // Reject the promise
        }
    });
}

// Manual processing of video frames with MediaPipe
function startManualMediaPipeProcessing() {
    if (!hands) return;
    
    const processFrame = async () => {
        if (streamStarted && hands) {
            try {
                await hands.send({image: videoElement});
            } catch (error) {
                console.error("Error processing frame with MediaPipe:", error);
            }
            requestAnimationFrame(processFrame);
        }
    };
    
    requestAnimationFrame(processFrame);
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
    console.log("DOM loaded, checking if camera is needed");
    
    // Check if we're on a page that needs the camera
    const cameraContainer = document.getElementById('camera');
    const webcamElement = document.getElementById('webcam');
    
    if (cameraContainer) {
        console.log("Camera container found, initializing camera");
        
        // Wait a short time to ensure all elements are properly loaded
        setTimeout(() => {
            initCamera();
        }, 500);
    } else {
        console.log("No camera container found, skipping camera initialization");
    }
}); 