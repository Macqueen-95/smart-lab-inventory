# Backend API

Flask backend for Smart Lab Inventory System.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the server:
```bash
python app.py
```

The server will run on `http://localhost:5000`

## API Endpoints

### POST /api/register
Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "userid": "johndoe",
  "password": "password123",
  "confirm_password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "name": "John Doe",
    "userid": "johndoe"
  }
}
```

### POST /api/login
Login with user credentials.

**Request Body:**
```json
{
  "userid": "johndoe",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "name": "John Doe",
    "userid": "johndoe"
  }
}
```

### GET /api/user/<userid>
Get user information.

### GET /api/health
Health check endpoint.

## Notes

- User data is stored in `users.json` (for development only)
- Passwords are hashed using Werkzeug's password hashing
- CORS is enabled for frontend communication
