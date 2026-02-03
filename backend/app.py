"""
Main Flask application file
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from auth import register_user, login_user, get_user_by_id
import os

app = Flask(__name__)

# Simplified CORS configuration - allow all origins for all /api/ routes
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route('/api/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "message": "No data provided"
            }), 400
        
        name = data.get('name')
        userid = data.get('userid')
        password = data.get('password')
        confirm_password = data.get('confirm_password')
        
        result = register_user(name, userid, password, confirm_password)
        
        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Registration failed: {str(e)}"
        }), 500

@app.route('/api/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "message": "No data provided"
            }), 400
        
        userid = data.get('userid')
        password = data.get('password')
        
        result = login_user(userid, password)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 401
            
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Login failed: {str(e)}"
        }), 500

@app.route('/api/user/<userid>', methods=['GET'])
def get_user(userid):
    """Get user information"""
    try:
        user = get_user_by_id(userid)
        if user:
            return jsonify({
                "success": True,
                "user": user
            }), 200
        else:
            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error: {str(e)}"
        }), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    # Create users.json if it doesn't exist
    if not os.path.exists('users.json'):
        with open('users.json', 'w') as f:
            import json
            json.dump([], f)
    
    print("=" * 50)
    print("Starting Flask server on http://localhost:8000")
    print("CORS enabled for ALL origins")
    print("=" * 50)
    app.run(debug=True, port=8000, host='0.0.0.0')

