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

# Session configuration (cookie stored in browser, validated server-side)
app.config["SECRET_KEY"] = os.environ.get("SESSION_SECRET_KEY", "super-secret-key-change-me")
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_USE_SIGNER"] = True
# For HTTPS (e.g. Render): SameSite=None, Secure=True. Render sets RENDER=true.
is_production = (
    os.environ.get("RENDER") == "true"
    or os.environ.get("FLASK_ENV") == "production"
    or os.environ.get("ENV") == "production"
)
app.config["SESSION_COOKIE_SAMESITE"] = "None" if is_production else "Lax"
app.config["SESSION_COOKIE_SECURE"] = is_production
app.config["SESSION_COOKIE_HTTPONLY"] = True

Session(app)

# CORS: set FRONTEND_URL to your Render frontend URL (e.g. https://your-app.onrender.com)
frontend_url = os.environ.get("FRONTEND_URL", "*")
allowed_origins = [frontend_url] if frontend_url != "*" else "*"
CORS(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True)

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
    print("=" * 50)
    print("App starting...")
    
    # Initialize database with error handling
    try:
        init_db()
        print("Database initialization check completed.")
    except Exception as e:
        print(f"CRITICAL: Database initialization failed but continuing: {e}")
    
    # Final startup sequence
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting Flask server on http://0.0.0.0:{port}")
    print("CORS enabled with credentials")
    print("=" * 50)
    
    try:
        app.run(debug=True, port=port, host='0.0.0.0')
    except Exception as e:
        print(f"CRITICAL: Flask failed to start: {e}")


