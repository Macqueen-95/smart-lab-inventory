"""
Authentication logic for user registration and login using PostgreSQL
"""
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import os

# Database connection URL
DB_URL = "postgresql://admin:GyTAXZ4EXHJYwrtgNlC31W7ClPs3ULEq@dpg-d613k794tr6s73824ah0-a.singapore-postgres.render.com/smart_sol"

def get_db_connection():
    """Establish a connection to the PostgreSQL database"""
    try:
        conn = psycopg2.connect(DB_URL)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def init_db():
    """Initialize the database tables if they don't exist"""
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    userid VARCHAR(50) UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.commit()
            print("Database initialized successfully.")
    except Exception as e:
        print(f"Error initializing database: {e}")
    finally:
        conn.close()

def register_user(name, userid, password, confirm_password):
    """
    Register a new user in PostgreSQL
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
    
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed"}
    
    try:
        with conn.cursor() as cur:
            # Check if user already exists
            cur.execute("SELECT id FROM users WHERE userid = %s", (userid.strip(),))
            if cur.fetchone():
                return {"success": False, "message": "User ID already exists"}
            
            # Create new user
            password_hash = generate_password_hash(password)
            cur.execute(
                "INSERT INTO users (name, userid, password_hash) VALUES (%s, %s, %s) RETURNING id, name, userid",
                (name.strip(), userid.strip(), password_hash)
            )
            new_user_data = cur.fetchone()
            conn.commit()
            
            return {
                "success": True,
                "message": "User registered successfully",
                "user": {
                    "id": new_user_data[0],
                    "name": new_user_data[1],
                    "userid": new_user_data[2]
                }
            }
    except Exception as e:
        print(f"Error during registration: {e}")
        return {"success": False, "message": f"Registration failed: {str(e)}"}
    finally:
        conn.close()

def login_user(userid, password):
    """
    Authenticate a user using PostgreSQL
    """
    if not userid or not password:
        return {"success": False, "message": "User ID and password are required"}
    
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed"}
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM users WHERE userid = %s", (userid.strip(),))
            user = cur.fetchone()
            
            if not user:
                return {"success": False, "message": "Invalid user ID or password"}
            
            if not check_password_hash(user['password_hash'], password):
                return {"success": False, "message": "Invalid user ID or password"}
            
            return {
                "success": True,
                "message": "Login successful",
                "user": {
                    "id": user['id'],
                    "name": user["name"],
                    "userid": user["userid"]
                }
            }
    except Exception as e:
        print(f"Error during login: {e}")
        return {"success": False, "message": f"Login failed: {str(e)}"}
    finally:
        conn.close()

def get_user_by_id(userid):
    """Get user by userid using PostgreSQL"""
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT name, userid, created_at FROM users WHERE userid = %s", (userid,))
            user = cur.fetchone()
            if user:
                return {
                    "name": user["name"],
                    "userid": user["userid"],
                    "created_at": user["created_at"].isoformat() if user["created_at"] else None
                }
            return None
    except Exception as e:
        print(f"Error fetching user: {e}")
        return None
    finally:
        conn.close()
