import os
import tensorflow as tf
import numpy as np
from tensorflow.keras.models import load_model

print("TensorFlow version:", tf.version.VERSION)

try:
    # Fix the path for cross-platform compatibility
    model_path = os.path.join("hand sign model cnn tensorflow", "hand_landmarks.h5")
    print(f"Loading model from: {model_path}")
    print(f"Model path exists: {os.path.exists(model_path)}")
    print(f"Model file size: {os.path.getsize(model_path)} bytes")
    
    # Try loading the model
    model = load_model(model_path)
    print(f"Model loaded successfully! Model type: {type(model)}")
    print(f"Model summary:")
    model.summary()
    
    # Test a simple prediction
    print("\nTesting model prediction with random data...")
    test_data = np.random.rand(1, 21, 3)  # Random test data in the expected shape
    test_prediction = model.predict(test_data)
    print(f"Test prediction shape: {test_prediction.shape}")
    print(f"Test prediction sample: {test_prediction[0][:5]}")  # Show first 5 values
    print(f"Test prediction argmax: {np.argmax(test_prediction, axis=1)[0]}")
    
    print("\nModel test successful!")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    
    try:
        print("\nTrying alternative loading method...")
        # Try using tf.keras.models.load_model explicitly
        model = tf.keras.models.load_model(model_path)
        print("Alternative loading successful!")
        
        # Test prediction with alternative loading
        test_data = np.random.rand(1, 21, 3)
        test_prediction = model.predict(test_data)
        print(f"Test prediction shape: {test_prediction.shape}")
        print("Alternative test successful!")
    except Exception as e:
        print(f"Alternative loading also failed: {e}")
        import traceback
        traceback.print_exc() 