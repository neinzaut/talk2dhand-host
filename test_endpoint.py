import requests
import base64
import os
import json
import cv2
import numpy as np

def get_available_endpoints():
    """Try to get a list of available endpoints from the Flask server"""
    try:
        # Try HTTP first
        print("Testing HTTP connection...")
        url = "http://localhost:5000/health"  # Use health endpoint as test
        response = requests.get(url)
        
        if response.status_code == 200:
            print("HTTP connection successful!")
            base_url = "http://localhost:5000"
        else:
            # Try HTTPS
            print("Testing HTTPS connection...")
            url = "https://localhost:5000/health"
            response = requests.get(url, verify=False)
            
            if response.status_code == 200:
                print("HTTPS connection successful!")
                base_url = "https://localhost:5000"
            else:
                print("Could not connect to the server.")
                return None
        
        # Test some common endpoints
        endpoints = [
            '/',
            '/health',
            '/predict_image',
            '/predict',
            '/video_feed'
        ]
        
        results = {}
        for endpoint in endpoints:
            try:
                full_url = f"{base_url}{endpoint}"
                response = requests.get(full_url, timeout=3)
                results[endpoint] = {
                    'status': response.status_code,
                    'exists': response.status_code != 404
                }
            except requests.exceptions.RequestException as e:
                results[endpoint] = {
                    'status': 'error',
                    'error': str(e)
                }
                
        return {
            'base_url': base_url,
            'endpoints': results
        }
    except Exception as e:
        print(f"Error checking endpoints: {e}")
        return None

def test_predict_image():
    """Test the /predict_image endpoint with a sample image"""
    # First check available endpoints
    server_info = get_available_endpoints()
    
    if not server_info:
        print("Could not connect to the server. Please ensure the Flask app is running.")
        return
    
    print("\nServer connection info:")
    print(json.dumps(server_info, indent=2))
    
    base_url = server_info['base_url']
    url = f"{base_url}/predict_image"
    
    print(f"\nTesting predict_image endpoint at: {url}")
    
    # Sample image
    try:
        # Create a simple test image
        img = np.ones((240, 320, 3), dtype=np.uint8) * 255  # White image
        cv2.putText(img, "Test", (50, 120), cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 255), 2)
        
        # Convert the image to base64
        _, buffer = cv2.imencode('.jpg', img)
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        
        # Prepare the request data
        request_data = {
            'image': img_base64
        }
        
        # Send the request
        print("Sending request to server...")
        headers = {'Content-Type': 'application/json'}
        response = requests.post(url, json=request_data, headers=headers)
        
        # Check the response
        print(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print("Response content:")
                print(json.dumps(result, indent=2))
            except json.JSONDecodeError:
                print("Response is not valid JSON")
                print("Raw response:", response.text[:500])  # Print first 500 chars
        else:
            print(f"Request failed with status code {response.status_code}")
            print("Response content:", response.text[:500])  # Print first 500 chars
            
    except Exception as e:
        print(f"Error during test: {e}")

if __name__ == "__main__":
    test_predict_image() 