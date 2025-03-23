import os
import absl.logging
import tensorflow as tf

# Disable all TensorFlow logging except errors
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

# Enable XLA for optimization
os.environ['TF_XLA_FLAGS'] = '--tf_xla_enable_xla_devices'
# Lower memory usage
os.environ['TF_GPU_THREAD_MODE'] = 'gpu_private'
# Optimize TF operations for CPU
os.environ['TF_CPU_DETERMINISTIC'] = '1'

# Initialize ABSL logging
absl.logging.set_verbosity(absl.logging.ERROR)
absl.logging.use_absl_handler()

from flask import Flask, render_template, Response, jsonify, request
import cv2
import mediapipe as mp
import numpy as np
from tensorflow.keras.models import load_model
import speech_recognition as sr
from PIL import Image
import random
import base64
import threading
import time
import functools
import collections

# Configure TensorFlow logging
tf.get_logger().setLevel('ERROR')
tf.compat.v1.logging.set_verbosity(tf.compat.v1.logging.ERROR)

# Initialize Flask app
app = Flask(__name__)

# Add CORS support
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Define classes
classes = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
           'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
           'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
           'U', 'V', 'W', 'X', 'Y', 'Z']

# MediaPipe settings for hand landmark detection
mp_hands = mp.solutions.hands
# Initialize hands with a custom stream handler to avoid timestamp issues
hands = mp_hands.Hands(
    static_image_mode=False,  # Set to False for video streams
    max_num_hands=2,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)
mp_drawing = mp.solutions.drawing_utils

# Global variables
model = None
model_loaded = False
model_loading = False
recognizer = sr.Recognizer()
use_mock_camera = True  # Set to True when deployed on Render or other server environments
# Store a timestamp for MediaPipe processing to avoid conflicts
last_process_timestamp = 0

# Prediction confidence threshold
CONFIDENCE_THRESHOLD = 0.4  # Minimum confidence to accept a prediction

# Add prediction cache for result smoothing on server side
MAX_CACHE_SIZE = 10
prediction_cache = collections.deque(maxlen=MAX_CACHE_SIZE)

# Try to initialize the camera, fall back to mock if not available
try:
    cap = cv2.VideoCapture(0)
    if cap.isOpened():
        use_mock_camera = False
        cap.release()  # We'll reopen it when needed
    else:
        print("Camera not available, using mock camera")
except Exception as e:
    print(f"Error accessing camera: {e}")
    print("Using mock camera instead")

# Create a mock frame for environments without a camera
mock_frame = np.ones((480, 640, 3), dtype=np.uint8) * 255  # White background
cv2.putText(mock_frame, "Camera not available", (120, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
cv2.putText(mock_frame, "Please use client-side camera", (80, 280), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)

# Function to load the model in a separate thread
def load_model_async():
    global model, model_loaded, model_loading
    model_loading = True
    try:
        # Fix the path for cross-platform compatibility
        model_path = os.path.join("hand sign model cnn tensorflow", "hand_landmarks.h5")
        print(f"Loading model from: {model_path}")
        
        # Add detailed logging
        print(f"TensorFlow version: {tf.version.VERSION}")
        print(f"Model path exists: {os.path.exists(model_path)}")
        print(f"Model file size: {os.path.getsize(model_path)} bytes")
        
        # Trying the approach from the old working code
        try:
            print("Attempting to load model directly...")
            
            # Load model with optimization flags
            with tf.device('/CPU:0'):  # Force CPU execution for consistency
                model = load_model(model_path)
                
                # Optimize the model for inference
                model_optimizer = tf.lite.TFLiteConverter.from_keras_model(model)
                model_optimizer.optimizations = [tf.lite.Optimize.DEFAULT]
                model_optimizer.target_spec.supported_types = [tf.float16]
                model_optimizer.target_spec.supported_ops = [
                    tf.lite.OpsSet.TFLITE_BUILTINS,
                    tf.lite.OpsSet.SELECT_TF_OPS
                ]
                # We'll still use the original model but print optimization info
                print("Model optimization configuration complete")
                
                # Pre-compile the model to make inference faster
                input_shape = (1, 21, 3)  # Expected input shape
                test_input = np.zeros(input_shape, dtype=np.float32)
                model.predict(test_input)  # Warm up the model
                
                # Force garbage collection to free memory
                import gc
                gc.collect()
        except Exception as e:
            print(f"Direct model loading failed: {e}, trying alternative approach...")
            # Try using tf.keras.models.load_model explicitly
            import tensorflow.keras.models
            model = tensorflow.keras.models.load_model(model_path)
            
        # Verify model loaded correctly
        print(f"Model loaded successfully! Model type: {type(model)}")
        print(f"Model summary: {model.summary()}")
        
        # Test a simple prediction to ensure model works
        print("Testing model prediction with random data...")
        test_data = np.random.rand(1, 21, 3)  # Random test data in the expected shape
        test_prediction = model.predict(test_data)
        print(f"Test prediction shape: {test_prediction.shape}")
        print(f"Test prediction argmax: {np.argmax(test_prediction, axis=1)[0]}")
        
        model_loaded = True
        print("Model loaded and ready for predictions!")
    except Exception as e:
        print(f"Error loading model: {e}")
        print("Detailed error:")
        import traceback
        traceback.print_exc()
        model_loaded = False
    finally:
        model_loading = False

# Start model loading in background thread
print("Starting model loading in background thread...")
threading.Thread(target=load_model_async).start()

# Function to get smoothed prediction from cache
def get_smoothed_prediction(new_prediction, confidence):
    global prediction_cache
    
    # Only cache predictions with reasonable confidence
    if confidence >= CONFIDENCE_THRESHOLD:
        prediction_cache.append(new_prediction)
    
    if not prediction_cache:
        return new_prediction, confidence
    
    # Count occurrences of each prediction in cache
    counter = collections.Counter(prediction_cache)
    most_common, count = counter.most_common(1)[0]
    
    # Calculate smoothed confidence based on frequency
    smoothed_confidence = count / len(prediction_cache)
    
    # If the new prediction matches the most common one, prioritize it
    if new_prediction == most_common and confidence >= CONFIDENCE_THRESHOLD:
        return new_prediction, max(confidence, smoothed_confidence)
    
    # If the smoothed confidence is greater than individual confidence and above threshold
    if smoothed_confidence >= CONFIDENCE_THRESHOLD and smoothed_confidence > confidence:
        return most_common, smoothed_confidence
    
    # Fall back to the current prediction
    return new_prediction, confidence

# Add a batch prediction function for multiple hand postures to handle occasional prediction errors
def batch_predict(input_data, batch_size=3):
    global model
    
    if model is None:
        return None, 0
    
    # Clone the input data to create variations for robustness
    batch_inputs = []
    for i in range(batch_size):
        # Add small random noise to create variations (improves robustness)
        noise_level = i * 0.01  # Progressive noise levels
        variation = input_data.copy() + np.random.normal(0, noise_level, input_data.shape)
        batch_inputs.append(variation)
    
    batch_array = np.vstack(batch_inputs)
    
    try:
        # Make batch prediction
        batch_predictions = model.predict(batch_array)
        
        # Get the class predictions
        pred_classes = np.argmax(batch_predictions, axis=1)
        
        # Get the confidence scores
        confidence_scores = np.max(batch_predictions, axis=1)
        
        # Count occurrences of each class
        unique_classes, counts = np.unique(pred_classes, return_counts=True)
        
        # Find the most common prediction
        max_count_idx = np.argmax(counts)
        most_common_class = unique_classes[max_count_idx]
        
        # Average confidence for the most common class
        mask = pred_classes == most_common_class
        avg_confidence = np.mean(confidence_scores[mask])
        
        return classes[most_common_class], avg_confidence
    except Exception as e:
        print(f"Batch prediction error: {e}")
        return None, 0

word_to_number = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "zero": 0,
    "ten": 10
}

def generate_frames():
    if use_mock_camera:
        # Return the mock frame indefinitely
        ret, buffer = cv2.imencode('.jpg', mock_frame)
        frame_bytes = buffer.tobytes()
        while True:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    else:
        # Normal camera operation
        camera = cv2.VideoCapture(0)  # Open the camera when needed
        if not camera.isOpened():
            # Fallback to mock if camera fails to open
            ret, buffer = cv2.imencode('.jpg', mock_frame)
            frame_bytes = buffer.tobytes()
            while True:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        # Continue with normal camera operation
        while True:
            success, frame = camera.read()
            if not success:
                break
            else:
                # Convert the frame from BGR to RGB for MediaPipe
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frame_rgb.flags.writeable = False  # Performance optimization

                # Detect hands in the frame - with error handling for timestamp issues
                try:
                    results = hands.process(frame_rgb)
                    frame_rgb.flags.writeable = True
                except ValueError as e:
                    if "Packet timestamp mismatch" in str(e):
                        # Just draw the frame without hand landmarks if there's a timestamp error
                        ret, buffer = cv2.imencode('.jpg', frame)
                        frame = buffer.tobytes()
                        yield (b'--frame\r\n'
                               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
                        continue
                    else:
                        # Skip this frame if there's a different error
                        continue

                # Draw hand landmarks on the frame
                if results.multi_hand_landmarks:
                    for hand_landmarks in results.multi_hand_landmarks:
                        mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

                # Encode the frame as a JPEG image
                ret, buffer = cv2.imencode('.jpg', frame)
                frame = buffer.tobytes()

                # Return the image as a stream
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/')
def index():
    return render_template('home.html')

@app.route('/voice-learning')
def voiceLearning():
    return render_template('learningByAudio.html')

@app.route('/learning-letters')
def learningletters():
    return render_template('learningLetter.html')

@app.route('/test')
def test():
    return render_template('selfTest.html')

@app.route('/practicing')
def practicing():
    return render_template('practice.html')

@app.route('/learningName')
def learningName():
    return render_template('learningName.html')

@app.route('/cardGame')
def cardGame():
    return render_template('cardGame.html')

@app.route('/learning')
def learning():
    return render_template('learning.html')

@app.route('/video_feed')
def video_feed():
    # Return the video stream
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/predict', methods=['POST', 'GET'])
def predict():
    global model_loaded, model_loading, hands
    
    # Check if model is still loading
    if not model_loaded:
        if model_loading:
            return jsonify({'status': 'loading', 'message': 'Model is still loading, please try again in a moment'})
        else:
            return jsonify({'status': 'error', 'message': 'Model failed to load'})
    
    if use_mock_camera:
        return jsonify({'status': 'error', 'message': 'Camera not available in this environment'})
        
    success, frame = cap.read()
    if not success:
        return jsonify({'status': 'error', 'message': 'Failed to capture frame'})
    else:
        # Convert the frame from BGR to RGB for MediaPipe
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frame_rgb.flags.writeable = False  # Performance optimization

        # Detect hands in the frame - with error handling for timestamp issues
        try:
            results = hands.process(frame_rgb)
            frame_rgb.flags.writeable = True
        except ValueError as e:
            if "Packet timestamp mismatch" in str(e):
                # If we get a timestamp error, recreate the hands object
                print("Handling MediaPipe timestamp error by recreating hands object")
                hands = mp_hands.Hands(
                    static_image_mode=True,  # Use True for individual image processing
                    max_num_hands=2,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5
                )
                # Try again with the new hands object
                results = hands.process(frame_rgb)
                frame_rgb.flags.writeable = True
            else:
                # If it's a different ValueError, re-raise it
                return jsonify({'status': 'error', 'message': f'MediaPipe error: {str(e)}'})

        # Draw hand landmarks on the frame
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                # Collect hand landmarks
                landmarks = []
                for landmark in hand_landmarks.landmark:
                    landmarks.append([landmark.x, landmark.y, landmark.z])

                # Convert landmarks to a NumPy array and add a new dimension
                input_data = np.array(landmarks).reshape(1, 21, 3)

                # Predict the class using the model
                prediction = model.predict(input_data)
                predicted_class = np.argmax(prediction, axis=1)[0]

                # Display the corresponding character based on the prediction
                predicted_character = classes[predicted_class]
            return jsonify({'status': 'success', 'prediction': predicted_character})
        else:
            return jsonify({'status': 'success', 'prediction': 'No hand detected'})

@app.route('/speech_recognition', methods=['GET'])
def speech_recognition():
    try:
        while True:
            with sr.Microphone() as source:
                print("Say something...")
                audio = recognizer.listen(source, timeout=5, phrase_time_limit=5)
            text = recognizer.recognize_google(audio, language="en-US")
            print(f"The computer heard: {text}")
            if text.lower().startswith("letter "):
                character = text.split()[1].lower()
                image_folder = r"static\images\hand sign none"
                image_path = os.path.join(image_folder, f"{character}.png")
                print(image_path)
                if os.path.exists(image_path):
                    return jsonify({ "image": f"{character}.png"})
                else:
                    return jsonify({"message": f"No image found for the letter {character}"})
            elif text.lower().startswith("number "):
                character = text.split()[1].lower()
                image_folder = r"static\images\hand sign none"
                image_path = os.path.join(image_folder, f"{character}.png")
                print(image_path)
                if os.path.exists(image_path):
                    return jsonify({ "image": f"{character}.png"})
                else:
                    return jsonify({"message": f"No image found for the number {character}"})
            else:
                print("Could not identify a letter or number")
                return jsonify({"message": "Could not identify a letter or number"})
    except sr.UnknownValueError:
        return jsonify({"message": "Could not understand what you said"})
    except sr.RequestError as e:
        return jsonify({"message": f"Error connecting to the recognition service: {e}"})

letter_to_image = {
    'a': 'static/images/Hand signs/a.png',
    'b': 'static/images/Hand signs/b.png',
    'c': 'static/images/Hand signs/c.png',
    'd': 'static/images/Hand signs/d.png',
    'e': 'static/images/Hand signs/e.png',
    'f': 'static/images/Hand signs/f.png',
    'g': 'static/images/Hand signs/g.png',
    'h': 'static/images/Hand signs/h.png',
    'i': 'static/images/Hand signs/i.png',
    'j': 'static/images/Hand signs/j.png',
    'k': 'static/images/Hand signs/k.png',
    'l': 'static/images/Hand signs/l.png',
    'm': 'static/images/Hand signs/m.png',
    'n': 'static/images/Hand signs/n.png',
    'o': 'static/images/Hand signs/o.png',
    'p': 'static/images/Hand signs/p.png',
    'q': 'static/images/Hand signs/q.png',
    'r': 'static/images/Hand signs/r.png',
    's': 'static/images/Hand signs/s.png',
    't': 'static/images/Hand signs/t.png',
    'u': 'static/images/Hand signs/u.png',
    'v': 'static/images/Hand signs/v.png',
    'w': 'static/images/Hand signs/w.png',
    'x': 'static/images/Hand signs/x.png',
    'y': 'static/images/Hand signs/y.png',
    'z': 'static/images/Hand signs/z.png'
}

# Global variables to store the user's name and image URLs
user_name = ""
image_urls = []

@app.route('/save_name', methods=['POST', 'GET'])
def save_name():
    global user_name, image_urls  # Add the array for image URLs

    # If the user clicks the 'clear' button
    if request.method == 'POST' and 'action' in request.form and request.form['action'] == 'clear':
        user_name = ""  # Clear the name
        image_urls = []  # Clear the array of image URLs
        return render_template('learningName.html', images=None)  # Display the page without images

    # If the user clicks the 'save' button
    elif request.method == 'POST' and 'action' in request.form and request.form['action'] == 'save':
        user_name = request.form['username'].lower()  # Get the name from the form and convert it to lowercase

        # Create an array of image URLs in the correct order
        image_urls = []
        for letter in user_name:
            if letter in letter_to_image:
                image_urls.append(letter_to_image[letter])  # Add the image to the array in the correct order

        return render_template('learningName.html', images=image_urls)  # Display the images in the HTML

    # In case of GET (when the page is refreshed)
    else:
        user_name = ""  # Reset the name
        image_urls = []  # Reset the images
        return render_template('learningName.html', images=None)  # Display the empty page

@app.route('/capture')
def capture():
    global model_loaded, model_loading, hands
    
    # Check if model is still loading
    if not model_loaded:
        if model_loading:
            return jsonify({'status': 'loading', 'message': 'Model is still loading, please try again in a moment'})
        else:
            return jsonify({'status': 'error', 'message': 'Model failed to load'})
    
    if use_mock_camera:
        return jsonify({'error': 'Camera not available in this environment', 'image': '', 'prediction': 'No camera'})
    
    success, frame = cap.read()
    if not success:
        return jsonify({'error': 'Failed to capture image from camera'}), 500
    else:
        # Convert the frame from BGR to RGB for MediaPipe
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frame_rgb.flags.writeable = False  # Performance optimization
        
        predicted_character = 'No hand detected'

        # Detect hands in the frame - with error handling for timestamp issues
        try:
            results = hands.process(frame_rgb)
            frame_rgb.flags.writeable = True
        except ValueError as e:
            if "Packet timestamp mismatch" in str(e):
                # If we get a timestamp error, recreate the hands object
                print("Handling MediaPipe timestamp error by recreating hands object")
                hands = mp_hands.Hands(
                    static_image_mode=True,  # Use True for individual image processing
                    max_num_hands=2,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5
                )
                # Try again with the new hands object
                try:
                    results = hands.process(frame_rgb)
                    frame_rgb.flags.writeable = True
                except Exception as e2:
                    print(f"Second attempt also failed: {e2}")
                    # Return the frame without processing if both attempts fail
                    ret, buffer = cv2.imencode('.jpg', frame)
                    img_str = base64.b64encode(buffer).decode('utf-8')
                    return jsonify({'image': img_str, 'prediction': 'Processing error'})
            else:
                # If it's a different ValueError, return the error
                ret, buffer = cv2.imencode('.jpg', frame)
                img_str = base64.b64encode(buffer).decode('utf-8')
                return jsonify({'image': img_str, 'prediction': f'Error: {str(e)}'})

        # Draw hand landmarks on the frame even if no hands are detected
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                # Collect hand landmarks
                landmarks = []
                for landmark in hand_landmarks.landmark:
                    landmarks.append([landmark.x, landmark.y, landmark.z])

                # Convert landmarks to a NumPy array and add a new dimension
                input_data = np.array(landmarks).reshape(1, 21, 3)

                # Predict the class using the model
                prediction = model.predict(input_data)
                predicted_class = np.argmax(prediction, axis=1)[0]

                # Display the corresponding character based on the prediction
                predicted_character = classes[predicted_class]

                # Draw the character on the image
                cv2.putText(frame, predicted_character, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2)

                mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

        # Convert back to BGR to display the image
        ret, buffer = cv2.imencode('.jpg', frame)

        img_str = base64.b64encode(buffer).decode('utf-8')  # Convert the image to base64 for display in HTML
        # Return the image and prediction to the client
        return jsonify({'image': img_str, 'prediction': predicted_character})

@app.route('/random_character', methods=['GET'])
def random_character_endpoint():
    global random_character
    random_character = random.choice(classes)  # Pick a new random character
    return jsonify({'random_character': random_character})

@app.route('/check_prediction', methods=['POST'])
def check_prediction():
    data = request.get_json()
    predicted_character = data.get('predicted_character')

    if predicted_character == random_character:
        result = 'correct'
    else:
        result = 'uncorrect'

    return jsonify({'result': result})

@app.route('/video_feed_pilot')
def video_feed_pilot():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/health')
def health_check():
    """Health check endpoint for Render"""
    return jsonify({
        'status': 'up',
        'model_loaded': model_loaded,
        'model_loading': model_loading,
        'camera_available': not use_mock_camera
    })

@app.route('/predict_image', methods=['POST'])
def predict_image():
    """Process an image sent from the client-side camera and predict the sign"""
    global model_loaded, model_loading, model, last_process_timestamp, hands
    
    print("Predict image endpoint called")
    
    # Check if model is still loading
    if not model_loaded:
        if model_loading:
            print("Model is still loading when prediction was attempted")
            return jsonify({'status': 'loading', 'message': 'Model is still loading, please try again in a moment'})
        else:
            print("Model failed to load, prediction cannot proceed")
            return jsonify({'status': 'error', 'message': 'Model failed to load'})
    
    # Get the image data from the request
    try:
        data = request.get_json()
        print("Request data received:", type(data))
        
        if not data or 'image' not in data:
            print("No image data received in request")
            return jsonify({'status': 'error', 'message': 'No image data received'})
        
        # Convert base64 image to numpy array
        print("Processing image for prediction")
        image_data = base64.b64decode(data['image'])
        np_arr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        print(f"Image decoded, shape: {frame.shape}")
        
        # Process the image with MediaPipe - with timestamp handling for deployment
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Use static_image_mode=True for individual images to avoid timestamp issues
        frame_rgb.flags.writeable = False  # Performance optimization
        
        try:
            # Process with MediaPipe (treating each image independently)
            results = hands.process(frame_rgb)
            frame_rgb.flags.writeable = True  # Make writable again for drawing
        except ValueError as e:
            if "Packet timestamp mismatch" in str(e):
                # If we get a timestamp error, recreate the hands object
                print("Handling MediaPipe timestamp error by recreating hands object")
                hands = mp_hands.Hands(
                    static_image_mode=True,  # Use True for individual image processing
                    max_num_hands=2,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5
                )
                # Try again with the new hands object
                results = hands.process(frame_rgb)
                frame_rgb.flags.writeable = True
            else:
                # If it's a different ValueError, re-raise it
                raise
        
        if not results.multi_hand_landmarks:
            print("No hand landmarks detected in image")
            # Clear prediction cache when no hand is detected
            prediction_cache.clear()
            return jsonify({
                'status': 'success', 
                'prediction': 'No hand detected',
                'image': base64.b64encode(cv2.imencode('.jpg', frame)[1].tobytes()).decode('utf-8')
            })
        
        # Process hand landmarks - following the exact pattern from old working code
        print("Hand landmarks detected, processing prediction")
        for hand_landmarks in results.multi_hand_landmarks:
            # Draw landmarks on the image first
            mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            
            # Collect hand landmarks exactly as in old working code
            landmarks = []
            for landmark in hand_landmarks.landmark:
                landmarks.append([landmark.x, landmark.y, landmark.z])
            
            print(f"Collected {len(landmarks)} landmarks for prediction")
            
            # Convert landmarks to input format for model - exactly as in old working code
            input_data = np.array(landmarks).reshape(1, 21, 3)
            print(f"Input data shape: {input_data.shape}")
            
            # Make batch prediction for robustness
            try:
                print("Running model prediction...")
                predicted_character, confidence = batch_predict(input_data)
                
                if predicted_character is None:
                    raise ValueError("Batch prediction failed")
                
                # Apply server-side smoothing
                smoothed_character, smoothed_confidence = get_smoothed_prediction(
                    predicted_character, confidence)
                
                print(f"Raw prediction: {predicted_character} (conf: {confidence:.2f})")
                print(f"Smoothed prediction: {smoothed_character} (conf: {smoothed_confidence:.2f})")
                
                # Only return predictions above threshold confidence
                if smoothed_confidence >= CONFIDENCE_THRESHOLD:
                    final_prediction = smoothed_character
                    # Add confidence percentage to the frame
                    confidence_text = f"{final_prediction} ({smoothed_confidence:.2f})"
                    cv2.putText(frame, confidence_text, (10, 30), 
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                else:
                    # Low confidence prediction
                    final_prediction = "Uncertain"
                    cv2.putText(frame, f"Low confidence ({smoothed_confidence:.2f})", 
                                (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                
                # Convert processed image back to base64
                _, buffer = cv2.imencode('.jpg', frame)
                img_str = base64.b64encode(buffer).decode('utf-8')
                
                return jsonify({
                    'status': 'success',
                    'prediction': final_prediction if final_prediction != "Uncertain" else smoothed_character,
                    'confidence': float(smoothed_confidence),
                    'image': img_str
                })
            except Exception as e:
                print(f"Error during model prediction: {e}")
                import traceback
                traceback.print_exc()
                return jsonify({'status': 'error', 'message': f'Model prediction error: {str(e)}'})
        
        # If we get here, something unexpected happened
        return jsonify({
            'status': 'error',
            'message': 'No prediction could be made'
        })
    
    except Exception as e:
        print(f"Error processing image: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': f'Error processing image: {str(e)}'})

@app.route('/process_speech', methods=['POST'])
def process_speech():
    """Process speech transcript from client-side speech recognition"""
    data = request.get_json()
    if not data or 'transcript' not in data:
        return jsonify({'status': 'error', 'message': 'No transcript received'})
    
    transcript = data['transcript'].lower()
    print(f"Client speech: {transcript}")
    
    # Process the transcript
    if transcript.startswith("letter "):
        character = transcript.split()[1].lower()
        if len(character) == 1 and character.isalpha():
            character_file = f"{character}.png"
            image_path = f"/static/images/Hand signs/{character_file}"
            return jsonify({
                "status": "success", 
                "image": image_path, 
                "message": f"Showing sign for letter {character.upper()}",
                "character": character
            })
        else:
            return jsonify({
                "status": "error",
                "message": f"Invalid letter: {character}"
            })
            
    elif transcript.startswith("number "):
        number_word = transcript.split()[1].lower()
        
        # Convert word to number if needed
        if number_word in word_to_number:
            number = word_to_number[number_word]
            number_str = str(number)
        else:
            try:
                # Try to parse as a number
                number = int(number_word)
                number_str = str(number)
            except ValueError:
                return jsonify({
                    "status": "error",
                    "message": f"Invalid number: {number_word}"
                })
        
        if number_str in classes:
            image_path = f"/static/images/Hand signs/{number_str}.png"
            return jsonify({
                "status": "success", 
                "image": image_path, 
                "message": f"Showing sign for number {number_str}",
                "character": number_str
            })
        else:
            return jsonify({
                "status": "error",
                "message": f"No sign available for number {number_str}"
            })
    
    else:
        return jsonify({
            "status": "error",
            "message": "Please say 'letter' followed by a letter, or 'number' followed by a number"
        })

if __name__ == '__main__':
    try:
        # Get port from environment variable (for deployment) or use default
        port = int(os.environ.get('PORT', 5000))
        host = os.environ.get('HOST', '0.0.0.0')  # Use 0.0.0.0 for production
        
        print(f"Attempting to start server on {host}:{port}")
        app.run(
            host=host,
            port=port,
            debug=False,  # Set to False in production
            use_reloader=False  # Disable reloader to prevent handle issues
        )
    except Exception as e:
        print(f"Failed to start server: {e}")
