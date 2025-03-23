let selectedImage = null;  // Variable for the selected image
let selectedLetter = '';   // Variable for the letter selected from the image
let timerInterval; // Variable for the timer
const timerDisplay = document.getElementById('digitalTimer'); // Get the HTML element for the timer display

// Additional variables
let isCorrect = false; // State variable
let correctTimeLimit = 5; // Time limit for success
let wrongTimeLimit = 10; // Time limit for failure
let elapsedSeconds = 0; // Variable to count the elapsed seconds

let selectedIndex = -1; // Variable to store the index of the selected image
const images = document.querySelectorAll('.gallery img');
const selectedImageElement = document.getElementById('selectedImage');
let predictionInterval = null; // Store the interval ID

// Function to perform the prediction using client-side camera
function predict() {
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
                const prediction = data.prediction;
                const confidence = data.confidence || 0;
                console.log(`Prediction successful: "${prediction}" (confidence: ${confidence.toFixed(2)})`);
                
                // Format display based on confidence
                let confidenceDisplay = '';
                let textColor = '';
                
                if (confidence >= 0.7) {
                    // High confidence
                    confidenceDisplay = `${prediction}`;
                    textColor = '#00aa00'; // green
                } else if (confidence >= 0.4) {
                    // Medium confidence
                    confidenceDisplay = `${prediction}`;
                    textColor = '#ff9900'; // orange
                } else if (prediction !== 'No hand detected') {
                    // Low confidence but hand detected
                    confidenceDisplay = `${prediction} (low confidence)`;
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
                
                // If there is a selected image, start checking the match
                // Only consider as a match if confidence is reasonable
                if (selectedImage && confidence >= 0.4) {
                    checkPrediction(prediction);
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
                    document.getElementById('predictionText').textContent = ` ${data.message || 'Error'}`;
                    document.getElementById('predictionText').style.color = '#ff0000';
                }
            }
        });
    });
}

// Function to update the timer
function updateTimer() {
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const displayTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`; // Format minute:second
    timerDisplay.textContent = `Timer ${displayTime}`; // Update the display
}

// Function to start the timer
function startTimer() {
    elapsedSeconds = 0; // Reset the seconds
    clearInterval(timerInterval); // Stop any existing timer
    timerInterval = setInterval(() => {
        elapsedSeconds++; // Increment the seconds
        updateTimer(); // Update the display
    }, 1000); // Update every second
}

// Function to reset the timer
function resetTimer() {
    clearInterval(timerInterval); // Stop the timer
    elapsedSeconds = 0; // Reset the seconds
    timerDisplay.textContent = "Timer 0:00"; // Reset the display
}

// Function to check the prediction against the selected image and elapsed time
function checkPrediction(prediction) {
    if (prediction.toLowerCase() === selectedLetter.toLowerCase()) {
        isCorrect = true; // The answer is correct

        // Update the border on the selected image based on the result
        if (elapsedSeconds <= correctTimeLimit) {
            matchedBorders[selectedIndex] = "7px solid #2B815C"; // Save green border
        } else if (elapsedSeconds <= wrongTimeLimit) {
            matchedBorders[selectedIndex] = "7px solid #FFD301"; // Save yellow border
        } else {
            matchedBorders[selectedIndex] = "7px solid #E03C32"; // Save red border
        }

        // Update the border of the image in the gallery
        selectedImage.style.border = matchedBorders[selectedIndex];
        
        // Stop the prediction interval after the match
        if (predictionInterval) {
            clearInterval(predictionInterval);
            predictionInterval = null;
        }
    } else {
        if (isCorrect) {
            // If the last answer was correct, do not change the color
            return;
        }
    }
}

let matchedBorders = new Array(images.length).fill(''); // Array to store borders for each image

function selectImage(index) {
    // If there is a selected image, reset its border
    if (selectedImage) {
        selectedImage.style.border = ""; // Remove the black border
        selectedImage.classList.remove('selected'); // Remove the selected class
    }
    
    // If we had an active prediction interval, clear it
    if (predictionInterval) {
        clearInterval(predictionInterval);
        predictionInterval = null;
    }

    selectedIndex = index; // Update the selected index

    // If the index is valid, select the image
    if (selectedIndex >= 0 && selectedIndex < images.length) {
        selectedImage = images[selectedIndex]; // Set the selected image
        selectedImage.style.border = "5px solid black"; // Black border
        selectedImage.classList.add('selected'); // Add the selected class
        selectedImageElement.src = selectedImage.src; // Copy the src of the selected image
        selectedImageElement.style.display = "block"; // Display the selected image

        // Extract the letter or number from the image name
        const srcParts = selectedImage.src.split('/');
        const fileName = srcParts[srcParts.length - 1].split('.')[0];
        selectedLetter = fileName; // Update the selected letter

        // Reset correctness state 
        isCorrect = false;

        // Start the timer
        startTimer(); // Start the timer
        
        // Start predicting at regular intervals
        predictionInterval = setInterval(predict, 1000); // Call the predict function every second

        // Update the borders of all images in the gallery
        images.forEach((img, i) => {
            if (matchedBorders[i]) {
                img.style.border = matchedBorders[i]; // Restore the matched border
            }
        });
    }
}

// Navigate between images using arrow keys
document.addEventListener('keydown', function(event) {
    event.preventDefault(); // Prevent screen movement
    if (event.key === 'ArrowRight') {
        selectedIndex = (selectedIndex + 1) % images.length; // Move to the next image
    } else if (event.key === 'ArrowLeft') {
        selectedIndex = (selectedIndex - 1 + images.length) % images.length; // Move to the previous image
    } else if (event.key === 'ArrowUp') {
        selectedIndex = (selectedIndex - 8 + images.length) % images.length; // Move to the previous row
    } else if (event.key === 'ArrowDown') {
        selectedIndex = (selectedIndex + 8) % images.length; // Move to the next row
    }

    selectImage(selectedIndex); // Mark the selected image and display it
});

// Add click event to the images
images.forEach(image => {
    image.addEventListener('click', () => {
        // If the same image is clicked again, reset its color and deselect it
        if (selectedImage === image) {
            selectedImage.style.border = ""; // Default border
            selectedImage = null;
            matchedBorders[selectedIndex] = ''; // Clear the matched border
            
            // Stop predictions
            if (predictionInterval) {
                clearInterval(predictionInterval);
                predictionInterval = null;
            }
            
            return; // Exit the function
        }

        // Set the new selected image
        selectImage(Array.from(images).indexOf(image)); // Select the image by index
    });
});

const intro = introJs();

intro.setOptions({
    steps:[
    {
        element:document.querySelector('.gallery'),
        intro: `
                <div>
                    <p> Click on one sign to learn</p>
                    <img src="/static/images/piselect.gif" alt="Example Image" class="intro-image">
                </div>
                `,
                       position: 'right'
    },
    {
        element:document.querySelector('#digitalTimer'),
        intro: `
                <div>
                    <p> The timer will show you how long it took you to learn the letter.</p>
                    <img src="/static/images/colors.png" alt="Example Image" class="intro-image" style="width:300px;">
                </div>
                `
    },
    {
        element:document.querySelector('#camera'),
        intro: `
                <div>
                    <p> Try to mimic its shape using the camera</p>
                    <img src="/static/images/hand.png" alt="Example Image" class="intro-image" style="width:200px;">
                </div>
                `,
        position: 'left'
    }
    ],
    tooltipClass: 'customTooltip'
});

document.querySelector('.start-steps').addEventListener('click', function() {
    intro.start();
});

// Make sure to initialize the camera when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if camera is available on this page
    const cameraContainer = document.getElementById('camera');
    if (cameraContainer) {
        // Ensure the camera handler script is loaded
        if (typeof initCamera !== 'function') {
            // Create a script element to load the camera handler
            const script = document.createElement('script');
            script.src = '/static/JS/camera-handler.js';
            script.onload = function() {
                console.log("Camera handler loaded");
            };
            document.head.appendChild(script);
        }
    }
});