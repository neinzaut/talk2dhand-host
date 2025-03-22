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

// Function to perform the prediction
function predict() {
    fetch('/predict')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            document.getElementById('predictionText').textContent = ` ${data}`;

            // If there is a selected image, start checking the match
            if (selectedImage) {
                checkPrediction(data);
            }
        })
        .catch(error => {
            console.error('There has been a problem with your fetch operation:', error);
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

        clearInterval(timerInterval); // Stop the prediction after the match
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
    }

    selectedIndex = index; // Update the selected index

    // If the index is valid, select the image
    if (selectedIndex >= 0 && selectedIndex < images.length) {
        selectedImage = images[selectedIndex]; // Set the selected image
        selectedImage.style.border = "5px solid black"; // Black border
        selectedImageElement.src = selectedImage.src; // Copy the src of the selected image
        selectedImageElement.style.display = "block"; // Display the selected image

        // Extract the letter or number from the image name
        const srcParts = selectedImage.src.split('/');
        const fileName = srcParts[srcParts.length - 1].split('.')[0];
        selectedLetter = fileName; // Update the selected letter

        // Start the timer
        startTimer(); // Start the timer
        setInterval(predict, 1000); // Call the predict function every second

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
        intro:
        `
                    <div>
                        <p> Try to mimic its shape using the camera</p>
                        <img src="/static/images/hand.png" alt="Example Image" class="intro-image" style="width:200px;">
                    </div>
                    `,position: 'left'
        }

    ],
       tooltipClass: 'customTooltip'
    })
    document.querySelector('.start-steps').addEventListener('click', function() {

        intro.start();
})

function selectImage(index) {
    // If there is a selected image, reset its border
    if (selectedImage) {
        selectedImage.style.border = ""; // Remove the black border
        selectedImage.classList.remove('selected'); // Remove the selected class
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

        // Start the timer
        startTimer(); // Start the timer
        setInterval(predict, 1000); // Call the predict function every second

        // Update the borders of all images in the gallery
        images.forEach((img, i) => {
            if (matchedBorders[i]) {
                img.style.border = matchedBorders[i]; // Restore the matched border
            }
        });
    }
}