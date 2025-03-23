let recognizedLetters = [];
let currentIndex = 0; // Variable to track the current match position
let cameraInitialized = false; // Track camera initialization status
let predictionInterval = null; // Store the interval ID

function resetImagesOpacity() {
    const imagesContainer = document.querySelector('.images');
    if (imagesContainer) {
        const images = imagesContainer.querySelectorAll('img');
        images.forEach((img, index) => {
            if (index === 0) {
                img.style.opacity = '1'; // The first image remains with opacity 1
                img.style.backgroundColor = 'transparent'; // Transparent background
            } else {
                img.style.opacity = '0.4'; // All other images get opacity 0.4
                img.style.backgroundColor = 'transparent'; // Transparent background
            }
        });
    }
}

function getLettersFromImages(predictedLetter) {
    const imagesContainer = document.querySelector('.images');
    if (imagesContainer) {
        const images = imagesContainer.querySelectorAll('img');

        // Convert the prediction to uppercase letters
        const upperPredictedLetter = predictedLetter.toUpperCase();

        // Start checking from the current image onwards
        for (let i = currentIndex; i < images.length; i++) {
            const img = images[i];
            const imageName = img.src.split('/').pop(); // Get the file name
            const letter = imageName.split('.')[0].trim().toUpperCase(); // Split the file name from the extension and convert to uppercase

            // If the letter from the current image matches the prediction
            if (letter === upperPredictedLetter) {
                img.style.opacity = '1'; // Set opacity to 1 for the matching image
                // If we recognized the previous letter
                if (i === currentIndex) {
                    recognizedLetters.push(letter); // Add to the array of recognized letters
                    currentIndex++; // Move to the next letter
                    updateImageStyles(); // Update the styles of the images
                    
                    // Play a success sound
                    playSuccessSound();
                    
                    break; // Exit the loop
                }
            } else if (i === currentIndex) {
                // If we did not recognize the current letter, move to the next letter
                break; // Exit the loop
            }
        }
    } else {
        console.log('No images found.');
    }
}

// Function to play a success sound
function playSuccessSound() {
    try {
        const audio = new Audio('/static/sounds/success.mp3');
        audio.volume = 0.2; // Set volume to 20%
        audio.play().catch(e => console.log('Sound play failed:', e));
    } catch (e) {
        console.log('Sound not supported:', e);
    }
}

function predict() {
    // Only proceed if camera is initialized
    if (!cameraInitialized) {
        console.log("Camera not initialized yet for prediction");
        document.getElementById('predictionText').textContent = " Camera initializing...";
        return;
    }
    
    // Get the video and canvas elements
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('canvas') || document.createElement('canvas');
    
    if (!canvas.id) {
        canvas.id = 'canvas';
        canvas.style.display = 'none';
        document.body.appendChild(canvas);
    }
    
    // Use the optimized image capture function from camera-handler.js
    captureImage(video, canvas, function(captureResult) {
        if (captureResult.error) {
            console.error("Error capturing image for prediction:", captureResult.message);
            document.getElementById('predictionText').textContent = ` Error: ${captureResult.message}`;
            return;
        }
        
        // Send the optimized image to server for prediction
        sendImageForPrediction(captureResult.image, '/predict_image', function(data) {
            console.log("Prediction response received:", data);
            
            if (data.status === 'success') {
                // Update the prediction text
                const predictedLetter = data.prediction;
                const confidence = data.confidence || 0;
                console.log(`Prediction successful: "${predictedLetter}" (confidence: ${confidence.toFixed(2)})`);
                
                // Format display based on confidence
                let confidenceDisplay = '';
                let textColor = '';
                
                if (confidence >= 0.7) {
                    // High confidence
                    confidenceDisplay = `${predictedLetter}`;
                    textColor = '#00aa00'; // green
                } else if (confidence >= 0.4) {
                    // Medium confidence
                    confidenceDisplay = `${predictedLetter}`;
                    textColor = '#ff9900'; // orange
                } else if (predictedLetter !== 'No hand detected') {
                    // Low confidence but hand detected
                    confidenceDisplay = `${predictedLetter} (low confidence)`;
                    textColor = '#999999'; // gray
                } else {
                    // No hand detected
                    confidenceDisplay = 'No hand detected';
                    textColor = '#666666'; // dark gray
                }
                
                // Update the prediction display
                const predictionText = document.getElementById('predictionText');
                predictionText.textContent = ` ${confidenceDisplay}`;
                predictionText.style.color = textColor;
                
                // Only process predictions with reasonable confidence
                if (predictedLetter && predictedLetter !== 'No hand detected' && confidence >= 0.4) {
                    // Call the function that updates the images based on the prediction
                    getLettersFromImages(predictedLetter);
                }
            } else if (data.status === 'loading') {
                console.log("Model is still loading");
                document.getElementById('predictionText').textContent = ' Model is loading...';
                document.getElementById('predictionText').style.color = '';
            } else {
                // Handle MediaPipe timestamp errors specifically
                if (data.message && data.message.includes("Packet timestamp mismatch")) {
                    console.warn("MediaPipe timestamp error detected - will retry automatically");
                    document.getElementById('predictionText').textContent = ' Detecting...';
                    document.getElementById('predictionText').style.color = '';
                    // The server will handle the MediaPipe reinit - no need to do anything special here
                } else {
                    console.error("Prediction error:", data.message);
                    document.getElementById('predictionText').textContent = ` Error: ${data.message || 'Unknown error'}`;
                    document.getElementById('predictionText').style.color = '#ff0000';
                }
            }
        });
    });
}

function updateImageStyles() {
    const imagesContainer = document.querySelector('.images');
    if (imagesContainer) {
        const images = imagesContainer.querySelectorAll('img');

        images.forEach((img, index) => {
            if (index < currentIndex) {
                img.style.padding = '5px'; // Add padding to the recognized image
                img.style.backgroundColor = 'green'; // Set green background
            } else if (index === currentIndex) {
                img.style.opacity = '1'; // The image waiting for prediction with opacity 1
                img.style.backgroundColor = 'transparent'; // Transparent background
            } else {
                img.style.opacity = '0.4'; // Other images with opacity 0.4
                img.style.backgroundColor = 'transparent'; // Transparent background
            }
        });
    }
}

// Start prediction when the page is loaded and the camera is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded in learningName.js");
    
    // Set up camera state change monitoring
    const videoElement = document.getElementById('webcam');
    if (videoElement) {
        // Listen for video element to become ready
        videoElement.addEventListener('loadedmetadata', function() {
            console.log("Video element loaded metadata, camera ready");
            cameraInitialized = true;
            
            // Start prediction interval only after camera is confirmed ready
            if (predictionInterval) {
                clearInterval(predictionInterval);
            }
            
            predictionInterval = setInterval(predict, 1500);
            console.log("Prediction interval started");
            
            // Update UI to show camera is ready
            document.getElementById('predictionText').textContent = "Camera ready - make a sign";
            
            // Hide the status message after it's ready
            const statusDiv = document.getElementById('cameraStatus');
            if (statusDiv) {
                statusDiv.innerText = "Camera ready";
                statusDiv.className = 'status success';
                setTimeout(() => {
                    statusDiv.style.display = 'none';
                }, 1500);
            }
        });
    }
});

function startIntro() {
    const intro = introJs();
    intro.setOptions({
        steps: [
            {
                element: document.querySelector('.images'), // Activate Intro.js on the entire image
                intro: `
                    <div>
                        <p>Try to sign your name with your hands </p>
                        <img src="/static/images/handTranspare.png" alt="Example Image" class="intro-image">
                    </div>
                `
            }
        ],
        tooltipClass: 'customTooltip'
    });
    intro.start(); // Start Intro.js
}
