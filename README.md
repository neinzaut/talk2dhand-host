# Talk2DHand - Sign Language Learning Application

Talk2DHand is an interactive web application designed to help users learn sign language through real-time hand gesture recognition using computer vision technology.

## Features

- **Learning Letters**: Practice American Sign Language (ASL) alphabet with real-time feedback
- **Learning Numbers**: Practice ASL number signs with real-time feedback
- **Name Signing**: Learn how to sign your name in ASL
- **Voice Learning**: Use speech recognition to find corresponding sign language gestures
- **Self-Test Mode**: Test your signing skills and get immediate feedback
- **Practice Mode**: Casual practice with real-time recognition

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Flask (Python)
- **Machine Learning**: TensorFlow, Keras
- **Computer Vision**: OpenCV, MediaPipe
- **Deployment**: Docker, Render

## Setup for Local Development

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/talk2dhand.git
   cd talk2dhand
   ```

2. Create a virtual environment and install dependencies:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Run the application:
   ```
   python app.py
   ```

4. Open your browser and navigate to `http://localhost:5000`

## Browser Support

For best results, please use:
- Chrome (recommended)
- Firefox
- Edge

## MediaPipe and Camera Access

This application uses MediaPipe for hand landmark detection and requires camera access for real-time sign language recognition. Please allow camera permissions when prompted by your browser.

## Deployment

This application is configured for deployment on Render using Docker. The deployment configuration is specified in `render.yaml` and `Dockerfile`.

## License

[MIT License](LICENSE)
