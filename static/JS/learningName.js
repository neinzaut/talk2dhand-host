let recognizedLetters = [];
let currentIndex = 0; // Variable to track the current match position

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

function predict() {
    // Use the client-side camera instead of server-side
    if (typeof sendImageForPrediction === 'function') {
        sendImageForPrediction(function(data) {
            if (data.status === 'success') {
                // Update the prediction text
                const predictedLetter = data.prediction;
                document.getElementById('predictionText').textContent = ` ${predictedLetter}`;
                
                // Call the function that updates the images based on the prediction
                getLettersFromImages(predictedLetter);
            } else if (data.status === 'loading') {
                document.getElementById('predictionText').textContent = ' Model is loading...';
            } else {
                document.getElementById('predictionText').textContent = ` ${data.message || 'Error'}`;
            }
        });
    } else {
        console.error('Camera handler not loaded properly');
        document.getElementById('predictionText').textContent = ' Camera unavailable';
    }
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

// Activate the prediction function every 1.5 seconds
let predictionInterval = null;

// Start prediction when the page is loaded and the camera is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for the camera to initialize
    setTimeout(function() {
        predictionInterval = setInterval(predict, 1500);
    }, 2000);
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
