"""
Quick test script to verify CORS is working
Run this to test if the server responds with proper CORS headers
"""
import requests

def test_cors():
    url = "http://localhost:5000/api/health"
    
    # Test OPTIONS request (preflight)
    print("Testing OPTIONS request (preflight)...")
    try:
        response = requests.options(url, headers={
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type'
        })
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"CORS Origin: {response.headers.get('Access-Control-Allow-Origin', 'NOT FOUND')}")
        print()
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure the Flask server is running!")
        return
    
    # Test GET request
    print("Testing GET request...")
    try:
        response = requests.get(url, headers={'Origin': 'http://localhost:3000'})
        print(f"Status: {response.status_code}")
        print(f"CORS Origin: {response.headers.get('Access-Control-Allow-Origin', 'NOT FOUND')}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    test_cors()
