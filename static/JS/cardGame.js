let firstSelected = null;
let secondSelected = null;
let matchesCount = 0; // Initialize the match count to 0

function handleImageClick(event) {
    const clickedImage = event.target;

    // If the clicked image is already matched, do not allow further clicks
    if (clickedImage.classList.contains('matched')) {
        return;
    }

    // If the same image is clicked again, deselect it
    if (clickedImage === firstSelected) {
        firstSelected.classList.remove('selected');
        firstSelected = null;
        return; // Exit the function to prevent further actions
    }

    // If two images are already selected, reset the previous selection
    if (firstSelected && secondSelected) {
        resetSelection(); // Reset selection to allow new clicks
    }

    // Add 'selected' class to the clicked image
    if (!firstSelected) {
        firstSelected = clickedImage;
        firstSelected.classList.add('selected');
    } else if (!secondSelected) {
        secondSelected = clickedImage;
        secondSelected.classList.add('selected');

        // Check for a match between the 'alt' attributes of the images
        if (firstSelected.alt === secondSelected.alt) {
            firstSelected.classList.remove('selected');
            firstSelected.classList.add('matched');
            secondSelected.classList.remove('selected');
            secondSelected.classList.add('matched');

            matchesCount++; // Increment the match count
            console.log("Number of matches: ", matchesCount); // Display the match count in the console
            firstSelected = null;
            secondSelected = null; // Reset to allow new selections

            if (matchesCount === 10) { // Show popup if all matches are completed
                showPopup();
            }
        } else {
            setTimeout(resetSelection, 1000); // If no match, reset after 1 second
        }
    }
}

// Function to reset selection (does not remove 'matched')
function resetSelection() {
    if (firstSelected) firstSelected.classList.remove('selected');
    if (secondSelected) secondSelected.classList.remove('selected');
    firstSelected = null;
    secondSelected = null;
}

// Add event listeners to all images
document.querySelectorAll('#lettersGallery img, #handSignGallery img').forEach(img => {
    img.addEventListener('click', handleImageClick); // One listener for both galleries
});

// Function to shuffle images
function shuffleGallery(galleryId) {
    const gallery = document.getElementById(galleryId);
    const images = Array.from(gallery.children);
    const positions = Array.from({ length: images.length }, (_, index) => index);
    positions.sort(() => Math.random() - 0.5);

    gallery.innerHTML = '';
    positions.forEach(pos => {
        gallery.appendChild(images[pos]);
    });
}

// Function to display the popup when the user completes all matches
function showPopup() {
    const popup = document.getElementById('congratulationsPopup');
    popup.style.display = 'block'; // Display the popup
}

// Function to close the popup and reset the game
function closePopup() {
    const popup = document.getElementById('congratulationsPopup');
    popup.style.display = 'none'; // Hide the popup
    matchesCount = 0; // Reset the match count
    console.log("Matches count reset to 0 after closing the popup."); // Print the match count after reset

    // Remove the 'matched' class from all images
    document.querySelectorAll('.matched').forEach(img => {
        img.classList.remove('matched');
    });

    // Reshuffle the galleries
    shuffleGallery('lettersGallery');
    shuffleGallery('handSignGallery');
}

// Call the function when the page loads
// window.onload = function() {
//     matchesCount = 0; // Reset the match count on each page reload
//     shuffleGallery('lettersGallery');
//     shuffleGallery('handSignGallery');
//     console.log("Game reset on page load. Matches count: ", matchesCount);
// }

// Add event listener to the start-steps button
document.querySelector('.start-steps').addEventListener('click', function() {
    intro.start(); // Start Intro.js when the button is clicked
});

const intro = introJs();
        intro.setOptions({
            steps: [
                {
                    element: document.querySelector('#lettersGallery'), // Activate Intro.js on the entire image
                    intro: `
                        <div>
                            <p>Click on letter to match </p>
                            <img src="/static/images/letterClick.gif" alt="Example Image" class="intro-image">
                        </div>
                    `,
                     position: 'right'
                },
                {
                    element: document.querySelector('#handSignGallery'), // Activate Intro.js on the entire image
                    intro: `
                        <div>
                            <p>Click on hand to match </p>
                            <img src="/static/images/handClick.gif" alt="Example Image" class="intro-image">
                        </div>
                    `,
                     position: 'left'
                }
            ],
            tooltipClass: 'customTooltip'
        });
        // intro.start(); // Comment out or remove this line
