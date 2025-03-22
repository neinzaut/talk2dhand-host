let predictedCharacter = '';
let countdown;
let correctCount = 0;
let wrongCount = 0;
let totalGuesses = 0;
let errors = [];

window.onload = function() {
    showEntryPopup(); // Display the entry popup on page load
    document.getElementById('startContainer').style.display = 'block';
    document.getElementById('startButton').onclick = startTest;
}

// function showEntryPopup() {
//     document.getElementById('entryPopup').style.display = 'block';
// }

function closeEntryPopup() {
    document.getElementById('entryPopup').style.display = 'none';
}

function startTest() {
    document.getElementById('startContainer').style.display = 'none';
    getRandomCharacter();
    startCountdown();
}

// Updated randomization function to include both letters and numbers
function getRandomCharacter() {
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
        })
        .catch(error => {
            console.error('Error:', error);
        });
    } else {
        const randomNumber = Math.floor(Math.random() * 11); // Randomize a number between 0 and 10
        randomCharElement.innerText = randomNumber;
        randomCharElement.style.display = 'block';
        titleElement.innerText = 'Number'; // Update the title accordingly for the number
    }
}

function startCountdown() {
    let timeLeft = 5; // Initial time of 5 seconds

    updateTimerStyle(timeLeft);

    countdown = setInterval(function() {
        // Update the timer display
        document.getElementById('timer').innerText = timeLeft; // Display the remaining seconds

        timeLeft -= 1;
        updateTimerStyle(timeLeft);

        // Stop the countdown when time runs out
        if (timeLeft < 0) {
            clearInterval(countdown);
            captureImage(); // Call the function to capture the image
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

function captureImage() {
    fetch('/capture')
    .then(response => response.json())
    .then(data => {
        if (data.image) {
            let capturedImage = document.getElementById('capturedImage');
            capturedImage.src = 'data:image/jpeg;base64,' + data.image;
            capturedImage.style.display = 'none';
            predictedCharacter = data.prediction; // Prediction from the model
            document.getElementById('predictionResult').innerText = predictedCharacter;
            sendPrediction();
        } else {
            alert("Error capturing the image");
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function sendPrediction() {
    const correctCharacter = document.getElementById('randomCharacter').innerText; // The correct value from the randomization

    fetch('/check_prediction', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ predicted_character: predictedCharacter })
    })
    .then(response => response.json())
    .then(data => {
        if (correctCharacter === predictedCharacter) {
            correctCount++;
            document.getElementById('correctCount').innerText = correctCount;
        } else {
            wrongCount++;
            document.getElementById('wrongCount').innerText = wrongCount;

            // Save image and data about the error
            errors.push({
                image: document.getElementById('capturedImage').src,
                correctCharacter: correctCharacter, // The value that was randomized
                predictedCharacter: predictedCharacter // The value that was predicted
            });
        }

        totalGuesses++;
        if (totalGuesses >= 3) {
            showEndGamePopup();
        } else {
            startCountdown();
            getRandomCharacter();
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function showEndGamePopup() {
    grade(); // Display the overall score

    const errorsContainer = document.querySelector('.errors-container');
    errorsContainer.innerHTML = ''; // Clear previous errors

    errors.forEach((error, index) => {
        const errorElement = `
            <div>
                <p style="font-size: 22px"><strong>Mismatch ${index + 1}:</strong></p>
                <img src="${error.image}" alt="Error Image" style="width: 120px; height: 120px; border: 5px solid  #9DDFFF ">
                <div style="background-color: #f0f8ff; border-radius: 10px; margin-top: 2px;">
                    <p style="font-size: 18px">Expected: <strong>${error.correctCharacter}</strong></p>
                    <p  style="font-size: 18px">Predicted: <strong>${error.predictedCharacter}</strong></p>
                </div>
            </div>
        `;
        errorsContainer.innerHTML += errorElement;
    });

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
}


// Function to show the entry popup
function showEntryPopup() {
    document.getElementById('entryPopup').style.display = 'block';
}

// Add event listener to the "How to Use?" button
document.querySelector('.start-steps').onclick = showEntryPopup;
