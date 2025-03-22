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
  
  // Reset background colors and border
  randomImageElement.style.backgroundColor = '';
  randomImageElement.style.padding = '';
  randomImageElement.style.border = '';
  
  // Hide the "Show Answer" button
  document.getElementById('showAnswerButton').style.display = 'none';
}

let matchedIndexes = []; // Array to store all indexes of images that had a match
let correctImagePath = ''; // Variable to store the path of the correct image
let correctImageName = ''; // Variable to store the name of the correct image

// We don't need the startSpeechRecognition function anymore
// The microphone-handler.js provides all needed functionality

// Custom handler for when speech recognition gets a result
// This function will be called by the microphone-handler.js
// We're overriding the processSpeech function to customize its behavior
function processSpeech(transcript) {
  updateMicStatus(`You said: ${transcript}`, 'success');
  
  // Extract the command and argument
  const words = transcript.toLowerCase().split(' ');
  
  // Check if it starts with "letter" or "number"
  if (words[0] === 'letter' && words.length > 1) {
    processLetterCommand(words[1]);
  } else if (words[0] === 'number' && words.length > 1) {
    processNumberCommand(words[1]);
  } else {
    updateMicStatus("Please say 'letter' followed by a letter, or 'number' followed by a number", 'info');
  }
}

// Process a letter command from speech recognition
function processLetterCommand(letter) {
  if (letter.length === 1 && letter.match(/[a-z]/i)) {
    // Get the selected image name from the gallery
    const selectedImageSrc = galleryImages[selectedIndex].src.split('/').pop().split('.')[0];
    const randomImageElement = document.getElementById('randomImage');
    
    // Set the image path
    const imagePath = `/static/images/Hand signs/${letter}.png`;
    
    // Check if the spoken letter matches the selected image
    if (letter === selectedImageSrc) {
      console.log("Match between letters!");
      
      // Add the index to the matches array
      if (!matchedIndexes.includes(selectedIndex)) {
        matchedIndexes.push(selectedIndex);
      }
      
      // Update the image display
      randomImageElement.src = imagePath;
      randomImageElement.style.backgroundColor = 'green';
      randomImageElement.style.padding = '10px';
      
      // Mark the gallery image
      galleryImages[selectedIndex].style.border = '7px solid green';
      document.getElementById('showAnswerButton').style.display = 'none';
      
      updateMicStatus(`Correct! You said letter "${letter.toUpperCase()}"`, 'success');
    } else {
      console.log("No match.");
      randomImageElement.style.backgroundColor = 'red';
      randomImageElement.style.padding = '10px';
      
      // Save the correct answer for the "Show Answer" button
      correctImagePath = imagePath;
      correctImageName = selectedImageSrc;
      
      document.getElementById('showAnswerButton').style.display = 'block';
      updateMicStatus(`Not quite right. You said letter "${letter.toUpperCase()}" but this is a different sign.`, 'error');
    }
  } else {
    updateMicStatus(`"${letter}" is not a valid letter`, 'error');
  }
}

// Process a number command from speech recognition
function processNumberCommand(number) {
  // Try to convert word to number
  let numberValue = NaN;
  
  // Check if it's a word like "one", "two", etc.
  const wordToNumber = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 
    'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
  };
  
  if (number in wordToNumber) {
    numberValue = wordToNumber[number];
  } else {
    // Try parsing it as a number
    numberValue = parseInt(number);
  }
  
  if (!isNaN(numberValue) && numberValue >= 0 && numberValue <= 10) {
    // Get the selected image name
    const selectedImageSrc = galleryImages[selectedIndex].src.split('/').pop().split('.')[0];
    const randomImageElement = document.getElementById('randomImage');
    
    // Set the image path
    const numberStr = numberValue.toString();
    const imagePath = `/static/images/Hand signs/${numberStr}.png`;
    
    // Check if the spoken number matches the selected image
    if (numberStr === selectedImageSrc || number === selectedImageSrc) {
      console.log("Match between numbers!");
      
      // Add the index to the matches array
      if (!matchedIndexes.includes(selectedIndex)) {
        matchedIndexes.push(selectedIndex);
      }
      
      // Update the image display
      randomImageElement.src = imagePath;
      randomImageElement.style.backgroundColor = 'green';
      randomImageElement.style.padding = '10px';
      
      // Mark the gallery image
      galleryImages[selectedIndex].style.border = '7px solid green';
      document.getElementById('showAnswerButton').style.display = 'none';
      
      updateMicStatus(`Correct! You said number "${numberValue}"`, 'success');
    } else {
      console.log("No match.");
      randomImageElement.style.backgroundColor = 'red';
      randomImageElement.style.padding = '10px';
      
      // Save the correct answer for the "Show Answer" button
      correctImagePath = imagePath;
      correctImageName = selectedImageSrc;
      
      document.getElementById('showAnswerButton').style.display = 'block';
      updateMicStatus(`Not quite right. You said number "${numberValue}" but this is a different sign.`, 'error');
    }
  } else {
    updateMicStatus(`"${number}" is not a valid number (0-10)`, 'error');
  }
}

let selectedIndex = 0; // The first selected image
const galleryImages = document.querySelectorAll('.gallery img');

document.getElementById('showAnswerButton').addEventListener('click', function() {
  // Find the matching image from the "hand signs" folder
  const correctImagePath = `/static/images/Hand signs/${correctImageName}.png`; 

  // Display the correct image
  const randomImageElement = document.getElementById('randomImage');
  randomImageElement.src = correctImagePath; // Display the correct image
  updateMicStatus(`This is the correct sign for "${correctImageName}"`, 'info');
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
  
  // Clear any status messages
  if (document.getElementById('micStatus')) {
    document.getElementById('micStatus').textContent = '';
  }
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
  
  // Clear any status messages
  if (document.getElementById('micStatus')) {
    document.getElementById('micStatus').textContent = '';
  }
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
      element:document.querySelector('#micButton'),
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
