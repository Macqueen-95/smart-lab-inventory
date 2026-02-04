"""
Authentication logic for user registration and login using PostgreSQL
"""
from werkzeug.security import generate_password_hash, check_password_hash
import psycopg
from psycopg.rows import dict_row
import os

# Database connection URL - prioritizes environment variable for deployment
DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://admin:GyTAXZ4EXHJYwrtgNlC31W7ClPs3ULEq@dpg-d613k794tr6s73824ah0-a.singapore-postgres.render.com/smart_sol",
)

def get_db_connection():
    """Establish a connection to the PostgreSQL database"""
    if not DB_URL:
        print("Error: DATABASE_URL not set")
        return None
    try:
        # Render and other cloud Postgres often require SSL
        url = DB_URL
        if "render.com" in url and "sslmode" not in url:
            url = f"{url}?sslmode=require" if "?" not in url else f"{url}&sslmode=require"
        conn = psycopg.connect(url)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def init_db():
    """Initialize the database tables if they don't exist"""
    print("Initializing database...")
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            print("Skipping DB init: Could not establish connection.")
            return
        
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
            print("DB connected and tables verified.")
    except Exception as e:
        print(f"Database error during init: {e}")
    finally:
        if conn:
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
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM users WHERE userid = %s", (userid.strip(),))
            user = cur.fetchone()
            
            if not user:
                return {"success": False, "message": "Invalid user ID or password"}
            
            if not check_password_hash(user["password_hash"], password):
                return {"success": False, "message": "Invalid user ID or password"}
            
            return {
                "success": True,
                "message": "Login successful",
                "user": {
                    "id": user["id"],
                    "name": user["name"],
                    "userid": user["userid"],
                },
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
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT id, name, userid, profile_picture_url, user_rfid_uid, created_at FROM users WHERE userid = %s", (userid,))
            user = cur.fetchone()
            if user:
                return {
                    "id": user["id"],
                    "name": user["name"],
                    "userid": user["userid"],
                    "profile_picture_url": user["profile_picture_url"],
                    "user_rfid_uid": user["user_rfid_uid"],
                    "created_at": user["created_at"].isoformat() if user["created_at"] else None,
                }
            return None
    except Exception as e:
        print(f"Error fetching user: {e}")
        return None
    finally:
        conn.close()


def get_user_numeric_id(userid):
    """Return users.id (integer) for the given userid (login name), or None."""
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE userid = %s", (userid,))
            row = cur.fetchone()
            return row[0] if row else None
    except Exception as e:
        print(f"Error getting user numeric id: {e}")
        return None
    finally:
        conn.close()


def list_users():
    """Return basic user list for admin assignment."""
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT id, name, userid, created_at FROM users ORDER BY created_at DESC")
            return [
                {
                    "id": r["id"],
                    "name": r["name"],
                    "userid": r["userid"],
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                }
                for r in cur.fetchall()
            ]
    except Exception as e:
        print(f"Error listing users: {e}")
        return []
    finally:
        conn.close()
