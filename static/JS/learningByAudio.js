const images = [
  'a.png', 'b.png', 'c.png', 'd.png', 'e.png', 'f.png', 'g.png', 'h.png', 'i.png', 'j.png',
  'k.png', 'l.png', 'm.png', 'n.png', 'o.png', 'p.png', 'q.png', 'r.png', 's.png', 't.png',
  'u.png', 'v.png', 'w.png', 'x.png', 'y.png', 'z.png',  'zero.png', 'one.png', 'two.png',
  'three.png', 'four.png', 'five.png', 'six.png', 'seven.png', 'eight.png', 'nine.png', 'ten.png'
];

let currentLetter = '';
const micDefaultImage = "../static/images/wired-outline-188-microphone-recording-hover-recording.png";
const micRecordingImage = "../static/images/wired-outline-188-microphone-recording-loop-recording.gif";
const micImageElement = document.getElementById('micImage');

// Function to display a random image
function displayImage(imageElement) {
  const selectedImageSrc = imageElement.src; // Path of the selected image from the gallery
  const randomImageElement = document.getElementById('randomImage');
  randomImageElement.src = selectedImageSrc;
  randomImageElement.style.display = 'block'; // Display the selected image from the gallery
}

let matchedIndexes = []; // Array to store all indexes of images that had a match
let correctImagePath = ''; // Variable to store the path of the correct image
let correctImageName = ''; // Variable to store the name of the correct image
function startSpeechRecognition() {
  // Hide the "Show Answer" button before starting speech recognition
  document.getElementById('showAnswerButton').style.display = 'none';

  micImageElement.src = micRecordingImage;
  micImageElement.classList.add('gif-image');

  // Call to the server to start speech recognition
  fetch('/speech_recognition') // API to start speech recognition
    .then(response => response.json())
    .then(data => {
      document.getElementById('speechResult').textContent = data.message;
      if (data.image) {
        const imagePath = `/static/images/Hand signs/${data.image}`;
        const randomImageElement = document.getElementById('randomImage');

        const letterFromImage = data.image.split('.')[0]; // Take the first part before the dot
        const selectedImageSrc = galleryImages[selectedIndex].src.split('/').pop().split('.')[0]; // Name of the selected image from the gallery

        if (letterFromImage === selectedImageSrc) {
          console.log("Match between letters!");

          // Add the index to the matches array
          if (!matchedIndexes.includes(selectedIndex)) {
            matchedIndexes.push(selectedIndex);
          }

          // Replace the selected image with the image from speech
          randomImageElement.src = imagePath;
          randomImageElement.style.backgroundColor = 'green';
          randomImageElement.style.padding = '10px';

          // Mark the image in the gallery with a green border
          galleryImages[selectedIndex].style.border = '7px solid green';
          document.getElementById('showAnswerButton').style.display = 'none'; // Hide the button if there was a match
        } else {
          console.log("No match.");
          randomImageElement.style.backgroundColor = 'red'; // Red background in case of no match
          randomImageElement.style.padding = '10px';

          // Save the correct image
          correctImagePath = imagePath;

          // Save the name of the correct image
          correctImageName = selectedImageSrc; // Save the name of the image from the gallery

          document.getElementById('showAnswerButton').style.display = 'block'; // Show the button in case of no match
        }
      }
      setTimeout(() => {
        micImageElement.src = micDefaultImage; // Revert to the original image
        micImageElement.classList.remove('gif-image');
      }, 500);
    })
    .catch(error => {
      console.error('Error during speech recognition:', error);
      micImageElement.src = micDefaultImage; // Revert to the original image in case of error
    });
}

window.onload = function() {
  // Automatic call to randomize the first image when the page loads
}

let selectedIndex = 0; // The first selected image
const galleryImages = document.querySelectorAll('.gallery img');

document.getElementById('showAnswerButton').addEventListener('click', function() {
  // Find the matching image from the "hand signs" folder
  const correctImagePath = `/static/images/Hand signs/${correctImageName}.png`; // Update the extension here if different

  // Display the correct image
  const randomImageElement = document.getElementById('randomImage');
  randomImageElement.src = correctImagePath; // Display the correct image
});

// Function to select an image
function selectImage(index) {
  galleryImages.forEach((img, i) => {
    img.classList.remove('selected'); // Remove the selection from all images

    // Keep the green border for all matched images
    if (matchedIndexes.includes(i)) {
      img.style.border = '7px solid green'; // Keep the green border on matched images
    } else {
      img.style.border = ''; // Reset the borders of unmatched images
    }
  });

  galleryImages[index].classList.add('selected'); // Add the selection to the current image
  galleryImages[index].style.border = '5px solid #bacfe9'; // Mark the selected image with a blue border

  const randomImageElement = document.getElementById('randomImage');

  // Reset background colors and border of the image above the microphone
  randomImageElement.style.backgroundColor = '';
  randomImageElement.style.padding = '';
  randomImageElement.style.border = '';

  // Hide the image captured from speech
  const speechImageElement = document.getElementById('speechImage');
  speechImageElement.style.display = 'none';

  // Display the selected image above the microphone
  randomImageElement.src = galleryImages[index].src;
  randomImageElement.style.display = 'block';
  // Hide the "Show Answer" button in case of selecting a new image
  document.getElementById('showAnswerButton').style.display = 'none';
}

// Update displayImage function to handle mouse click
function displayImage(imageElement) {
  galleryImages.forEach((img, index) => {
    img.classList.remove('selected'); // Remove the selection from all images
    img.style.border = ''; // Reset the borders of all images
    if (img === imageElement) {
      selectedIndex = index; // Update selectedIndex so arrow keys start from the clicked image
    }
  });

  // Keep the green border for all matched images
  matchedIndexes.forEach(i => {
    galleryImages[i].style.border = '7px solid #2B815C'; // Restore the green border to matched images
  });

  // Add selection to the clicked image
  imageElement.classList.add('selected');
  imageElement.style.border = '5px solid #bacfe9'; // Mark the clicked image

  const randomImageElement = document.getElementById('randomImage');

  // Reset background colors and border of the image above the microphone
  randomImageElement.style.backgroundColor = ''; // Remove the background (green or red)
  randomImageElement.style.padding = ''; // Remove the padding
  randomImageElement.style.border = ''; // Remove the border

  // Display the selected image above the microphone
  randomImageElement.src = imageElement.src;
  randomImageElement.style.display = 'block';
  // Hide the "Show Answer" button in case of selecting a new image
  document.getElementById('showAnswerButton').style.display = 'none';
}

// Listen for keyboard events
document.addEventListener('keydown', function(event) {
  if (event.key === 'ArrowRight') {
    event.preventDefault(); // Prevent screen scrolling
    selectedIndex = (selectedIndex + 1) % galleryImages.length; // Move to the next image
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault(); // Prevent screen scrolling
    selectedIndex = (selectedIndex - 1 + galleryImages.length) % galleryImages.length; // Move to the previous image
  } else if (event.key === 'ArrowUp') {
    event.preventDefault(); // Prevent screen scrolling
    selectedIndex = (selectedIndex - 8 + galleryImages.length) % galleryImages.length; // Move to the previous row
  } else if (event.key === 'ArrowDown') {
    event.preventDefault(); // Prevent screen scrolling
    selectedIndex = (selectedIndex + 8) % galleryImages.length; // Move to the next row
  }

  selectImage(selectedIndex); // Mark the selected image and display it
});

const intro= introJs();

intro.setOptions({
  steps:[
    {

      element:document.querySelector('.gallery'),

      intro: `
              <div>
                  <p> Click on one sign to learn.</p>
                  <img src="/static/images/select-tile.gif" alt="Example Image" class="intro-image">
              </div>
              `,
               position: 'right'
    },
    {

    element:document.querySelector('#micImage'),
    intro: `
              <div>
                  <p> Click on the microphone to say the answer.</p>
                  <img src="/static/images/letterNumber.png" alt="Example Image" class="intro-image" >
              </div>
              `,
                 position: 'left'
    }

  ],
   tooltipClass: 'customTooltip'
});
document.querySelector('.start-steps').addEventListener('click', function(){

    intro.start();
});
