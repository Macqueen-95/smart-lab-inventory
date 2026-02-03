# Setup Guide

## Backend Setup

1. Navigate to the backend folder:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the backend server:
```bash
python app.py
```

The backend will run on `http://localhost:5000`

## Frontend Setup

1. Navigate to the frontend folder:
```bash
cd frontend
```

2. Install dependencies (including axios):
```bash
npm install
```

3. Create a `.env.local` file (optional, defaults to localhost:5000):
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

4. Run the frontend development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Usage

1. Start the backend server first (port 5000)
2. Start the frontend server (port 3000)
3. Navigate to:
   - `http://localhost:3000/register` - Create a new account
   - `http://localhost:3000/login` - Login to your account

## API Endpoints

- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/user/<userid>` - Get user info
- `GET /api/health` - Health check

## Notes

- User data is stored in `backend/users.json` (development only)
- Passwords are securely hashed
- CORS is enabled for frontend-backend communication
