let predictedCharacter = '';
let countdown;
let correctCount = 0;
let wrongCount = 0;
let totalGuesses = 0;
let errors = [];
let predictionInterval;
let realtimeInterval; // New interval for real-time prediction
let cameraInitialized = false;
let debugMode = false; // Set to true to display canvas for debugging

// Function to perform real-time prediction
function realtimePredict() {
    // Only proceed if camera is initialized
    if (!cameraInitialized) {
        console.log("Camera not initialized yet for real-time prediction");
        return;
    }
    
    // Use the learningLetter.js approach for real-time prediction
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas and draw current video frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image from canvas
    const imageData = canvas.toDataURL('image/jpeg');
    const base64Data = imageData.split(',')[1];
    
    // Send the data to server for prediction
    fetch('/predict_image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data })
    })
    .then(response => response.json())
    .then(data => {
        // Update real-time prediction display
        if (data.status === 'success') {
            const predictedSign = data.prediction;
            document.getElementById('predictionResult').innerText = predictedSign;
        } else if (data.status === 'loading') {
            document.getElementById('predictionResult').innerText = "Model loading...";
        } else {
            // Don't show errors in real-time preview
            document.getElementById('predictionResult').innerText = "Detecting...";
        }
    })
    .catch(error => {
        console.error("Real-time prediction error:", error);
        // Don't update UI on error for real-time predictions
    });
}

// Show or hide the real-time detection indicator
function toggleDetectionIndicator(show) {
    const indicator = document.querySelector('.detection-indicator');
    if (indicator) {
        indicator.style.display = show ? 'inline-block' : 'none';
    }
}

window.onload = function() {
    // Show entry popup and set up UI
    showEntryPopup();
    document.getElementById('startContainer').style.display = 'block';
    document.getElementById('startButton').onclick = startTest;
    
    // Show the detection indicator at the start
    toggleDetectionIndicator(true);
    
    // Initialize camera similarly to learningLetter.js
    initCameraDirectly();
    
    // Test the prediction endpoint after 3 seconds
    setTimeout(testPrediction, 3000);
}

// Direct initialization like in the working files
function initCameraDirectly() {
    // Make the status visible during initialization
    const statusDiv = document.getElementById('cameraStatus');
    statusDiv.innerText = "Initializing camera...";
    statusDiv.style.display = 'block';
    statusDiv.className = 'status info';
    
    // Get elements
    const videoElement = document.getElementById('webcam');
    const canvasElement = document.getElementById('canvas');
    
    // Update canvas display for debugging if needed
    if (debugMode) {
        canvasElement.style.display = 'block';
        canvasElement.style.position = 'absolute';
        canvasElement.style.top = '10px';
        canvasElement.style.right = '10px';
        canvasElement.style.zIndex = '9999';
        canvasElement.style.width = '160px'; // Smaller display for debugging
        canvasElement.style.height = '120px';
        canvasElement.style.border = '2px solid red';
    }
    
    // Set canvas dimensions explicitly
    canvasElement.width = 320;
    canvasElement.height = 240;
    
    // Access camera
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 320 }, 
                height: { ideal: 240 } 
            } 
        })
        .then(function(stream) {
            videoElement.srcObject = stream;
            videoElement.style.display = 'block';
            cameraInitialized = true;
            
            // After camera starts
            videoElement.onloadedmetadata = function() {
                // Make sure canvas matches video dimensions exactly
                console.log(`Video dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
                canvasElement.width = videoElement.videoWidth;
                canvasElement.height = videoElement.videoHeight;
                
                statusDiv.innerText = "Camera ready";
                statusDiv.className = 'status success';
                setTimeout(() => {
                    statusDiv.style.display = 'none';
                }, 1500);
                
                // Initialize MediaPipe if available
                if (typeof initMediaPipe === 'function') {
                    initMediaPipe().then(success => {
                        console.log("MediaPipe initialization:", success ? "successful" : "limited");
                    });
                }
                
                // Start continuous canvas update for debugging
                if (debugMode) {
                    setInterval(() => {
                        const ctx = canvasElement.getContext('2d');
                        ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
                    }, 100);
                }
                
                // Start real-time prediction for sign detection
                if (realtimeInterval) clearInterval(realtimeInterval);
                realtimeInterval = setInterval(realtimePredict, 1000); // Update every 1 second
                console.log("Started real-time sign detection");
            };
        })
        .catch(function(error) {
            console.error("Error accessing camera:", error);
            statusDiv.innerText = "Camera error: " + (error.message || "Unknown error");
            statusDiv.className = 'status error';
            statusDiv.style.display = 'block';
        });
    } else {
        console.error("getUserMedia not supported");
        statusDiv.innerText = "Camera not supported in this browser";
        statusDiv.className = 'status error';
        statusDiv.style.display = 'block';
    }
}

// function showEntryPopup() {
//     document.getElementById('entryPopup').style.display = 'block';
// }

function closeEntryPopup() {
    document.getElementById('entryPopup').style.display = 'none';
}

function startTest() {
    document.getElementById('startContainer').style.display = 'none';
    
    // Hide the detection indicator during the test
    toggleDetectionIndicator(false);
    
    // Stop real-time predictions during the test
    if (realtimeInterval) {
        clearInterval(realtimeInterval);
        console.log("Paused real-time detection for test");
    }
    
    getRandomCharacter()
        .then(() => {
            startCountdown();
        })
        .catch(error => {
            console.error("Error starting test:", error);
            document.getElementById('predictionResult').innerText = "Error starting test";
        });
}

// Updated randomization function to include both letters and numbers
function getRandomCharacter() {
    return new Promise((resolve, reject) => {
        const randomType = Math.random() < 0.5 ? 'letter' : 'number'; // Determine whether to randomize a letter or a number
        const randomCharElement = document.getElementById('randomCharacter');
        const titleElement = document.getElementById('title-letter'); // Title representation

        if (randomType === 'letter') {
            fetch('/random_character') // Request from the server to randomize a letter
            .then(response => response.json())
            .then(data => {
                randomCharElement.innerText = data.random_character;
                randomCharElement.style.display = 'block';
                titleElement.innerText = 'Letter'; // Update the title accordingly for the letter
                resolve();
            })
            .catch(error => {
                console.error('Error getting random character:', error);
                reject(error);
            });
        } else {
            const randomNumber = Math.floor(Math.random() * 11); // Randomize a number between 0 and 10
            randomCharElement.innerText = randomNumber;
            randomCharElement.style.display = 'block';
            titleElement.innerText = 'Number'; // Update the title accordingly for the number
            resolve();
        }
    });
}

function startCountdown() {
    let timeLeft = 5; // Initial time of 5 seconds

    updateTimerStyle(timeLeft);
    
    // Clear any existing countdown
    if (countdown) {
        clearInterval(countdown);
    }

    countdown = setInterval(function() {
        // Update the timer display
        document.getElementById('timer').innerText = timeLeft; // Display the remaining seconds

        timeLeft -= 1;
        updateTimerStyle(timeLeft);

        // Stop the countdown when time runs out
        if (timeLeft < 0) {
            clearInterval(countdown);
            
            // Ensure we don't have multiple prediction attempts running
            if (predictionInterval) {
                clearInterval(predictionInterval);
            }
            
            // Start multiple prediction attempts to improve reliability
            // This is similar to the approach in learningLetter.js
            predictionInterval = setInterval(function() {
                captureAndPredict();
                // Clear after first prediction to avoid multiple predictions
                clearInterval(predictionInterval);
                predictionInterval = null;
            }, 500);
        }

    }, 1000);
}

function updateTimerStyle(timeLeft) {
    const timerElement = document.getElementById('timer');
    if (timeLeft <= 1) {
        timerElement.className = 'low';
    } else if (timeLeft <= 3) {
        timerElement.className = 'medium';
    } else {
        timerElement.className = 'high';
        console.log(timeLeft);
        console.log("high");
    }
}

function captureAndPredict() {
    // Check if camera is initialized
    if (!cameraInitialized) {
        console.error("Camera not initialized");
        document.getElementById('predictionResult').innerText = "Camera not ready";
        totalGuesses++;
        if (totalGuesses >= 3) {
            showEndGamePopup();
        } else {
            getRandomCharacter()
                .then(() => startCountdown())
                .catch(error => console.error("Error:", error));
        }
        return;
    }
    
    // Update UI to indicate prediction is happening
    document.getElementById('predictionResult').innerText = "Processing...";
    
    console.log("----- PREDICTION PROCESS STARTED -----");
    
    // Use the learningLetter.js approach - direct canvas capture for prediction
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas and draw current video frame to canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Draw a marker to check if we're capturing this frame
    if (debugMode) {
        ctx.fillStyle = "red";
        ctx.fillRect(5, 5, 10, 10);
    }
    
    // Log canvas dimensions to verify
    console.log(`Canvas dimensions during capture: ${canvas.width}x${canvas.height}`);
    
    // Get image from canvas
    const imageData = canvas.toDataURL('image/jpeg');
    
    // Remove the data URL prefix to get just the base64 data
    const base64Data = imageData.split(',')[1];
    
    console.log(`Image data size: ${base64Data.length} bytes`);
    
    // Send the data to server
    fetch('/predict_image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data })
    })
    .then(response => {
        console.log(`Server response status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        console.log("Prediction response received:", data);
        
        if (data.status === 'success') {
            // Success case - we have a valid prediction
            predictedCharacter = data.prediction;
            console.log(`Prediction successful: "${predictedCharacter}"`);
            
            // Update the UI with what was detected
            document.getElementById('predictionResult').innerText = predictedCharacter;
            
            // Store the image for display
            const capturedImage = document.getElementById('capturedImage');
            if (data.image) {
                capturedImage.src = 'data:image/jpeg;base64,' + data.image;
            } else {
                capturedImage.src = imageData; // Use local canvas image if server didn't return one
            }
            capturedImage.style.display = 'none';
            
            // Check if we have a valid prediction
            if (predictedCharacter && predictedCharacter !== "No hand detected") {
                console.log("Valid sign detected, proceeding with comparison");
                sendPrediction();
            } else {
                console.log("No valid sign detected, counting as wrong");
                wrongCount++;
                document.getElementById('wrongCount').innerText = wrongCount;
                
                // Save the error
                const correctCharacter = document.getElementById('randomCharacter').innerText;
                errors.push({
                    image: capturedImage.src,
                    correctCharacter: correctCharacter,
                    predictedCharacter: "No hand detected"
                });
                
                // Continue with the test
                totalGuesses++;
                if (totalGuesses >= 3) {
                    showEndGamePopup();
                } else {
                    getRandomCharacter()
                        .then(() => startCountdown())
                        .catch(error => {
                            console.error("Error getting next character:", error);
                            document.getElementById('predictionResult').innerText = "Error loading next test";
                        });
                }
            }
        } else if (data.status === 'loading') {
            console.log("Model is still loading");
            document.getElementById('predictionResult').innerText = "Model is loading, please wait...";
            
            // Try again in a few seconds
            setTimeout(() => {
                captureAndPredict();
            }, 2000);
        } else {
            handlePredictionError(data);
        }
    })
    .catch(error => {
        console.error("Error in prediction:", error);
        document.getElementById('predictionResult').innerText = "Error: " + error.message;
        
        handlePredictionError({ 
            message: error.message,
            status: 'error'
        });
    });
}

// Handle prediction errors from either method
function handlePredictionError(response) {
    console.error("Prediction failed:", response);
    
    const errorMsg = response && response.message ? response.message : "Unknown error";
    document.getElementById('predictionResult').innerText = "Error: " + errorMsg;
    
    // Count as wrong answer but don't add extensive error-tracking that might slow down
    wrongCount++;
    document.getElementById('wrongCount').innerText = wrongCount;
    
    // Continue with the test - simplified approach
    totalGuesses++;
    if (totalGuesses >= 3) {
        showEndGamePopup();
    } else {
        // Continue with next test
        getRandomCharacter()
            .then(() => {
                startCountdown();
            })
            .catch(error => {
                console.error("Error getting next character:", error);
                document.getElementById('predictionResult').innerText = "Error loading next test";
            });
    }
}

function sendPrediction() {
    const correctCharacter = document.getElementById('randomCharacter').innerText; // The correct value from the randomization

    console.log(`Comparing: Expected "${correctCharacter}" vs Predicted "${predictedCharacter}"`);

    // Compare the characters, ignoring case for letters
    let isMatch = false;
    if (isNaN(correctCharacter)) {
        // It's a letter, compare case-insensitive
        isMatch = correctCharacter.toLowerCase() === predictedCharacter.toLowerCase();
    } else {
        // It's a number, compare directly
        isMatch = correctCharacter === predictedCharacter;
    }

    if (isMatch) {
        console.log("Correct prediction!");
        correctCount++;
        document.getElementById('correctCount').innerText = correctCount;
        // Update UI to show success
        document.getElementById('predictionResult').innerText = predictedCharacter + " ✓";
    } else {
        console.log("Wrong prediction!");
        wrongCount++;
        document.getElementById('wrongCount').innerText = wrongCount;

        // Store minimal error info to prevent slowdowns
        errors.push({
            image: document.getElementById('capturedImage').src,
            correctCharacter: correctCharacter,
            predictedCharacter: predictedCharacter
        });
        
        // Update UI to show incorrect
        document.getElementById('predictionResult').innerText = predictedCharacter + " ✗";
    }

    totalGuesses++;
    if (totalGuesses >= 3) {
        showEndGamePopup();
    } else {
        // Continue with next test
        getRandomCharacter()
            .then(() => {
                startCountdown();
            })
            .catch(error => {
                console.error("Error getting next character:", error);
                document.getElementById('predictionResult').innerText = "Error loading next test";
            });
    }
}

function showEndGamePopup() {
    grade(); // Display the overall score

    const errorsContainer = document.querySelector('.errors-container');
    errorsContainer.innerHTML = ''; // Clear previous errors

    errors.forEach((error, index) => {
        // Build a more informative message based on the error
        let predictedText = error.predictedCharacter;
        let errorClass = '';
        
        if (predictedText === "No hand detected") {
            errorClass = 'no-hand-error';
            predictedText = "No hand detected";
        } else if (predictedText.startsWith("Error:")) {
            errorClass = 'system-error';
        }
        
        const errorElement = `
            <div>
                <p style="font-size: 22px"><strong>Mismatch ${index + 1}:</strong></p>
                <img src="${error.image}" alt="Error Image" style="width: 120px; height: 120px; border: 5px solid #9DDFFF">
                <div style="background-color: #f0f8ff; border-radius: 10px; margin-top: 2px;">
                    <p style="font-size: 18px">Expected: <strong>${error.correctCharacter}</strong></p>
                    <p style="font-size: 18px">Predicted: <strong class="${errorClass}">${predictedText}</strong></p>
                </div>
            </div>
        `;
        errorsContainer.innerHTML += errorElement;
    });

    // Show a helpful message if there were errors with "No hand detected"
    if (errors.some(err => err.predictedCharacter === "No hand detected" || err.predictedCharacter.includes("Model file not found"))) {
        const helpMessage = document.createElement('div');
        helpMessage.style.marginTop = '15px';
        helpMessage.style.padding = '10px';
        helpMessage.style.backgroundColor = '#fff3cd';
        helpMessage.style.color = '#856404';
        helpMessage.style.borderRadius = '5px';
        helpMessage.innerHTML = `
            <p><strong>Troubleshooting Tips:</strong></p>
            <ul style="text-align: left;">
                <li>Make sure your hand is clearly visible in the camera view</li>
                <li>Try using better lighting conditions</li>
                <li>Ensure you're making clear hand signs</li>
                <li>Try refreshing the page if model loading errors persist</li>
            </ul>
        `;
        errorsContainer.appendChild(helpMessage);
    }

    document.getElementById('endGamePopup').style.display = 'block';
}

function grade() {
    const correctCount = parseInt(document.getElementById('correctCount').innerText);
    const totalQuestions = 3;
    const score = Math.round((correctCount / totalQuestions) * 100);
    document.getElementById('scoreDisplay').innerText = ` ${score}%`;

    let imageUrl = '';

    if (score == 100) {
        imageUrl = '/static/images/excellent.png'; // Image for 100%
    } else if (score >= 80 && score < 100) {
        imageUrl = '/static/images/good.png'; // Image for 80% and above
    } else if (score >= 50 && score <= 70 ) {
        imageUrl = '/static/images/fine.png'; // Image for 50% and above
    } else {
        imageUrl = '/static/images/bad.png'; // Image for below 50%
    }

    const resultImage = document.getElementById('resultImage');
    resultImage.src = imageUrl;
    resultImage.style.display = 'block';
}

function finishGame() {
    resetGame();
    document.getElementById('endGamePopup').style.display = 'none';
    
    // Show the detection indicator again
    toggleDetectionIndicator(true);
    
    // Restart real-time detection after the test is over
    if (!realtimeInterval) {
        realtimeInterval = setInterval(realtimePredict, 1000);
        console.log("Resumed real-time detection after test");
    }
}

function resetGame() {
    correctCount = 0;
    wrongCount = 0;
    totalGuesses = 0;
    errors = []; // Clear the error list
    document.getElementById('correctCount').innerText = correctCount;
    document.getElementById('wrongCount').innerText = wrongCount;
    document.getElementById('capturedImage').style.display = 'none';
    document.getElementById('randomCharacter').style.display = 'none';
    document.getElementById('timer').innerText = '5';
    document.getElementById('timer').className = '';
    document.getElementById('startContainer').style.display = 'block';
    
    // Set the prediction text back to real-time detection mode
    document.getElementById('predictionResult').innerText = "Ready";
}


// Function to show the entry popup
function showEntryPopup() {
    document.getElementById('entryPopup').style.display = 'block';
}

// Add event listener to the "How to Use?" button
document.querySelector('.start-steps').onclick = showEntryPopup;

// Function to test the predict_image endpoint and ensure it's working correctly
function testPrediction() {
    // Use a white image as test
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    
    // Fill with white and add a test pattern
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.fillText('Test Image', 100, 120);
    
    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg');
    const base64Data = imageData.split(',')[1];
    
    // Send test request
    fetch('/predict_image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data })
    })
    .then(response => response.json())
    .then(data => {
        console.log("Test prediction response:", data);
        const statusDiv = document.getElementById('cameraStatus');
        statusDiv.innerText = "API Test: " + (data.status || "Unknown");
        statusDiv.style.display = 'block';
        statusDiv.className = data.status === 'success' ? 'status success' : 'status info';
        setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);
    })
    .catch(error => {
        console.error("Test prediction error:", error);
        const statusDiv = document.getElementById('cameraStatus');
        statusDiv.innerText = "API Test Error: " + error.message;
        statusDiv.style.display = 'block';
        statusDiv.className = 'status error';
    });
}
