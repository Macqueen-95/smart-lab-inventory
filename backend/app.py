"""
Main Flask application file
"""
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_session import Session
from auth import register_user, login_user, get_user_by_id, init_db
import os
from functools import wraps

app = Flask(__name__)

# Session configuration
app.config['SECRET_KEY'] = os.environ.get('SESSION_SECRET_KEY', 'super-secret-key-change-me')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = True  # Required for SAMESITE='None'

Session(app)

# CORS configuration - allow specific frontend origin in production
frontend_url = os.environ.get('FRONTEND_URL', '*')
CORS(app, resources={r"/api/*": {"origins": [frontend_url] if frontend_url != '*' else '*'}}, supports_credentials=True)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({
                "success": False,
                "message": "Login required"
            }), 401
        return f(*args, **kwargs)
    return decorated_function

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
            # Store user info in session
            session['user_id'] = result['user']['userid']
            session['user_name'] = result['user']['name']
            return jsonify(result), 200
        else:
            return jsonify(result), 401
            
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Login failed: {str(e)}"
        }), 500

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    """User logout endpoint"""
    session.clear()
    return jsonify({
        "success": True,
        "message": "Logged out successfully"
    }), 200

@app.route('/api/user/me', methods=['GET'])
@login_required
def get_current_user():
    """Get currently logged-in user information"""
    userid = session.get('user_id')
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

@app.route('/api/user/<userid>', methods=['GET'])
@login_required
def get_user(userid):
    """Get user information (protected)"""
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
    # Initialize database
    init_db()
    
    print("=" * 50)
    print("Starting Flask server on http://localhost:8000")
    print("CORS enabled with credentials")
    print("Database: PostgreSQL")
    print("=" * 50)
    app.run(debug=True, port=8000, host='0.0.0.0')


