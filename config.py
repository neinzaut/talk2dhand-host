import os

class Config:
    """Base configuration class."""
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-for-development-only')
    
    # Model settings
    MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                             "hand sign model cnn tensorflow", "hand_landmarks.h5")
    
    # Camera settings
    CAMERA_INDEX = 0
    MOCK_CAMERA = False
    
    # MediaPipe settings
    MAX_NUM_HANDS = 1
    MIN_DETECTION_CONFIDENCE = 0.5
    MIN_TRACKING_CONFIDENCE = 0.5


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    MOCK_CAMERA = False  # Use real camera in development


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DEBUG = True
    MOCK_CAMERA = True  # Use mock camera in testing


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SECRET_KEY = os.environ.get('SECRET_KEY')  # Should be set in environment variables
    
    # In production, we might want to use a different model path
    MODEL_PATH = os.environ.get('MODEL_PATH', Config.MODEL_PATH)
    
    # Production might need to use a different camera
    CAMERA_INDEX = int(os.environ.get('CAMERA_INDEX', '0'))
    
    # Mock camera in case we're in an environment without camera access
    MOCK_CAMERA = os.environ.get('MOCK_CAMERA', 'False').lower() == 'true'


# Configuration dictionary
config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
}

# Default to development if not specified
active_config = config_by_name[os.environ.get('FLASK_ENV', 'development')] 