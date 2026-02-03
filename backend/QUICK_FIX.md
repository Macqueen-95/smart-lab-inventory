# Quick CORS Fix Guide

## Step 1: Stop the Flask Server
Press `Ctrl+C` in the terminal where Flask is running

## Step 2: Restart Flask Server
```bash
cd backend
python app.py
```

You should see:
```
==================================================
Starting Flask server on http://localhost:5000
CORS enabled for ALL origins
==================================================
```

## Step 3: Clear Browser Cache
1. Open browser DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

OR

1. Press `Ctrl+Shift+Delete` (Windows/Linux) or `Cmd+Shift+Delete` (Mac)
2. Clear cached images and files
3. Reload the page

## Step 4: Test the Server
Open in browser: http://localhost:5000/api/health

Should return: `{"status": "ok"}`

## Step 5: Check Browser Console
- Open DevTools (F12)
- Go to Network tab
- Try registering again
- Click on the failed request
- Check "Response Headers" - you should see `Access-Control-Allow-Origin: *`

## If Still Not Working

### Option A: Verify Flask-CORS is installed
```bash
pip install flask-cors --upgrade
```

### Option B: Test with curl
```bash
curl -X OPTIONS http://localhost:5000/api/register \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

You should see `Access-Control-Allow-Origin: *` in the response.

### Option C: Check if port 5000 is available
```bash
# Mac/Linux
lsof -i :5000

# Windows
netstat -ano | findstr :5000
```

If something else is using port 5000, kill it or change the port in app.py.
