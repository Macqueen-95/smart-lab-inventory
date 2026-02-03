"""
Authentication logic for user registration and login
"""
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import json
import os

# File to store users (in production, use a database)
USERS_FILE = "users.json"

def load_users():
    """Load users from JSON file"""
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'r') as f:
                return json.load(f)
        except:
            return []
    return []

def save_users(users):
    """Save users to JSON file"""
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)

def register_user(name, userid, password, confirm_password):
    """
    Register a new user
    
    Args:
        name: User's full name
        userid: Unique user ID
        password: User's password
        confirm_password: Password confirmation
    
    Returns:
        dict: Result with success status and message
    """
    # Validation
    if not name or not name.strip():
        return {"success": False, "message": "Name is required"}
    
    if not userid or not userid.strip():
        return {"success": False, "message": "User ID is required"}
    
    if not password:
        return {"success": False, "message": "Password is required"}
    
    if len(password) < 6:
        return {"success": False, "message": "Password must be at least 6 characters"}
    
    if password != confirm_password:
        return {"success": False, "message": "Passwords do not match"}
    
    # Check if user already exists
    users = load_users()
    if any(user['userid'] == userid for user in users):
        return {"success": False, "message": "User ID already exists"}
    
    # Create new user
    new_user = {
        "name": name.strip(),
        "userid": userid.strip(),
        "password": generate_password_hash(password),
        "created_at": datetime.now().isoformat()
    }
    
    users.append(new_user)
    save_users(users)
    
    return {
        "success": True,
        "message": "User registered successfully",
        "user": {
            "name": new_user["name"],
            "userid": new_user["userid"]
        }
    }

def login_user(userid, password):
    """
    Authenticate a user
    
    Args:
        userid: User ID
        password: User's password
    
    Returns:
        dict: Result with success status and message
    """
    if not userid or not password:
        return {"success": False, "message": "User ID and password are required"}
    
    users = load_users()
    user = next((u for u in users if u['userid'] == userid), None)
    
    if not user:
        return {"success": False, "message": "Invalid user ID or password"}
    
    if not check_password_hash(user['password'], password):
        return {"success": False, "message": "Invalid user ID or password"}
    
    return {
        "success": True,
        "message": "Login successful",
        "user": {
            "name": user["name"],
            "userid": user["userid"]
        }
    }

def get_user_by_id(userid):
    """Get user by userid (without password)"""
    users = load_users()
    user = next((u for u in users if u['userid'] == userid), None)
    if user:
        return {
            "name": user["name"],
            "userid": user["userid"],
            "created_at": user.get("created_at")
        }
    return None
