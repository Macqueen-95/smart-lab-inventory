# CORS Troubleshooting Guide

If you're experiencing CORS errors, follow these steps:

## 1. Verify Flask-CORS is installed

```bash
pip install flask-cors==4.0.0
```

Or reinstall all requirements:
```bash
pip install -r requirements.txt
```

## 2. Restart the Flask server

After making changes to `app.py`, always restart the Flask server:
1. Stop the server (Ctrl+C)
2. Start it again: `python app.py`

## 3. Verify the server is running

Check that the Flask server is running on port 5000:
- Open browser: http://localhost:5000/api/health
- Should return: `{"status": "ok"}`

## 4. Check browser console

Open browser DevTools (F12) and check:
- Network tab: Look for the failed request
- Console tab: Check for CORS error messages

## 5. Verify frontend is on correct port

Make sure Next.js is running on `http://localhost:3000` (not 3001 or other port)

## 6. Test CORS manually

You can test if CORS is working using curl:

```bash
curl -X OPTIONS http://localhost:5000/api/register \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

You should see `Access-Control-Allow-Origin: http://localhost:3000` in the response headers.

## 7. Alternative: Use wildcard for development

If still having issues, temporarily allow all origins (development only):

```python
CORS(app, origins="*")
```

**Warning:** Never use `origins="*"` in production!

## Common Issues

### Issue: "No 'Access-Control-Allow-Origin' header"
**Solution:** Make sure flask-cors is installed and CORS(app) is called before routes

### Issue: "Preflight request doesn't pass"
**Solution:** Ensure OPTIONS method is allowed in CORS config

### Issue: Server not starting
**Solution:** Check if port 5000 is already in use:
```bash
lsof -i :5000  # Mac/Linux
netstat -ano | findstr :5000  # Windows
```
