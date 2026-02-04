"""
Main Flask application file
"""
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_session import Session
from auth import register_user, login_user, get_user_by_id, get_user_numeric_id, init_db
from db_management import (
    init_tables as init_db_tables,
    create_floor_plan,
    get_floor_plans,
    get_floor_plan_by_id,
    update_floor_plan_url,
    create_room,
    get_rooms_by_floor_plan,
    get_rooms,
    get_room_by_id,
    create_inventory_item,
    create_bulk_inventory_items,
    get_inventory_items_by_room,
    update_inventory_item_icon,
    get_inventory_item_by_id,
    get_rfid_scan_logs,
    get_latest_unassigned_rfid,
)
from rfid_uid import process_rfid_scan, assign_rfid_uid_to_item
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
        if "user_id" not in session:
            return jsonify({"success": False, "message": "Login required"}), 401
        return f(*args, **kwargs)
    return decorated_function


def get_current_user_id():
    """Return numeric user id (users.id) for the current session, or None."""
    userid = session.get("user_id")
    return get_user_numeric_id(userid) if userid else None

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

@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok"}), 200


# ---- Floor plans ----

@app.route("/api/floor-plans", methods=["POST"])
@login_required
def api_create_floor_plan():
    """Create a floor plan. Body: floor_title, floor_description (optional), floor_url (optional)."""
    uid = get_current_user_id()
    if not uid:
        return jsonify({"success": False, "message": "User not found"}), 404
    data = request.get_json() or {}
    title = (data.get("floor_title") or "").strip()
    if not title:
        return jsonify({"success": False, "message": "floor_title is required"}), 400
    row = create_floor_plan(
        uid,
        title,
        data.get("floor_description"),
        data.get("floor_url"),
    )
    if not row:
        return jsonify({"success": False, "message": "Failed to create floor plan"}), 500
    return jsonify({"success": True, "floor_plan": row}), 201


@app.route("/api/floor-plans", methods=["GET"])
@login_required
def api_list_floor_plans():
    uid = get_current_user_id()
    if not uid:
        return jsonify({"success": False, "message": "User not found"}), 404
    plans = get_floor_plans(uid)
    return jsonify({"success": True, "floor_plans": plans}), 200


@app.route("/api/floor-plans/<int:plan_id>", methods=["GET"])
@login_required
def api_get_floor_plan(plan_id):
    uid = get_current_user_id()
    if not uid:
        return jsonify({"success": False, "message": "User not found"}), 404
    plan = get_floor_plan_by_id(plan_id, uid)
    if not plan:
        return jsonify({"success": False, "message": "Floor plan not found"}), 404
    return jsonify({"success": True, "floor_plan": plan}), 200


@app.route("/api/floor-plans/<int:plan_id>", methods=["PATCH"])
@login_required
def api_update_floor_plan(plan_id):
    """Update floor plan (e.g. floor_url). Body: floor_url."""
    uid = get_current_user_id()
    if not uid:
        return jsonify({"success": False, "message": "User not found"}), 404
    data = request.get_json() or {}
    floor_url = data.get("floor_url")
    if floor_url is not None:
        ok = update_floor_plan_url(plan_id, uid, floor_url)
        if not ok:
            return jsonify({"success": False, "message": "Floor plan not found or update failed"}), 404
    plan = get_floor_plan_by_id(plan_id, uid)
    if not plan:
        return jsonify({"success": False, "message": "Floor plan not found"}), 404
    return jsonify({"success": True, "floor_plan": plan}), 200


@app.route("/api/floor-plans/<int:plan_id>/rooms", methods=["POST"])
@login_required
def api_create_room(plan_id):
    """Create a room under a floor plan. Body: room_name, room_description (optional)."""
    uid = get_current_user_id()
    if not uid:
        return jsonify({"success": False, "message": "User not found"}), 404
    data = request.get_json() or {}
    name = (data.get("room_name") or "").strip()
    if not name:
        return jsonify({"success": False, "message": "room_name is required"}), 400
    row = create_room(uid, plan_id, name, data.get("room_description"))
    if not row:
        return jsonify({"success": False, "message": "Failed to create room"}), 500
    return jsonify({"success": True, "room": row}), 201


@app.route("/api/floor-plans/<int:plan_id>/rooms", methods=["GET"])
@login_required
def api_list_rooms_by_plan(plan_id):
    uid = get_current_user_id()
    if not uid:
        return jsonify({"success": False, "message": "User not found"}), 404
    rooms = get_rooms_by_floor_plan(plan_id, uid)
    return jsonify({"success": True, "rooms": rooms}), 200


@app.route("/api/rooms", methods=["GET"])
@login_required
def api_list_rooms():
    uid = get_current_user_id()
    if not uid:
        return jsonify({"success": False, "message": "User not found"}), 404
    rooms = get_rooms(uid)
    return jsonify({"success": True, "rooms": rooms}), 200


@app.route("/api/rooms/<int:room_id>/items", methods=["GET"])
@login_required
def api_list_items(room_id):
    uid = get_current_user_id()
    if not uid:
        return jsonify({"success": False, "message": "User not found"}), 404
    room = get_room_by_id(room_id, uid)
    if not room:
        return jsonify({"success": False, "message": "Room not found"}), 404
    items = get_inventory_items_by_room(room_id)
    return jsonify({"success": True, "items": items}), 200


@app.route("/api/rooms/<int:room_id>/items", methods=["POST"])
@login_required
def api_create_item(room_id):
    """Create inventory item(s). Body: item_name, item_quantity (optional, default 1), item_icon_url (optional).
    If item_quantity > 1, creates multiple individual items (item_name1, item_name2, etc.)"""
    uid = get_current_user_id()
    if not uid:
        return jsonify({"success": False, "message": "User not found"}), 404
    room = get_room_by_id(room_id, uid)
    if not room:
        return jsonify({"success": False, "message": "Room not found"}), 404
    data = request.get_json() or {}
    name = (data.get("item_name") or "").strip()
    if not name:
        return jsonify({"success": False, "message": "item_name is required"}), 400
    quantity = int(data.get("item_quantity", 1) or 1)
    icon_url = data.get("item_icon_url")
    
    if quantity > 1:
        # Bulk creation: create individual items with numbered names
        items = create_bulk_inventory_items(room_id, name, quantity, icon_url)
        if not items:
            return jsonify({"success": False, "message": "Failed to create items"}), 500
        return jsonify({"success": True, "items": items, "count": len(items)}), 201
    else:
        # Single item
        row = create_inventory_item(room_id, name, icon_url)
        if not row:
            return jsonify({"success": False, "message": "Failed to create item"}), 500
        return jsonify({"success": True, "item": row}), 201


@app.route("/api/items/<int:item_id>/icon", methods=["PATCH"])
@login_required
def api_update_item_icon(item_id):
    """Update item icon URL. Body: item_icon_url, room_id (required to verify ownership)."""
    uid = get_current_user_id()
    if not uid:
        return jsonify({"success": False, "message": "User not found"}), 404
    data = request.get_json() or {}
    url = data.get("item_icon_url")
    room_id = data.get("room_id")
    if not url or room_id is None:
        return jsonify({"success": False, "message": "item_icon_url and room_id are required"}), 400
    ok = update_inventory_item_icon(item_id, room_id, uid, url)
    if not ok:
        return jsonify({"success": False, "message": "Item not found or update failed"}), 404
    item = get_inventory_item_by_id(item_id, uid)
    return jsonify({"success": True, "item": item}), 200


# ---- RFID Management ----

@app.route("/api/items/<int:item_id>/assign-rfid", methods=["POST"])
@login_required
def api_assign_rfid_to_item(item_id):
    """Assign an RFID UID to an inventory item. Body: rfid_uid."""
    uid = get_current_user_id()
    if not uid:
        return jsonify({"success": False, "message": "User not found"}), 404
    
    data = request.get_json() or {}
    rfid_uid = (data.get("rfid_uid") or "").strip()
    
    if not rfid_uid:
        return jsonify({"success": False, "message": "rfid_uid is required"}), 400
    
    result = assign_rfid_uid_to_item(item_id, rfid_uid, uid)
    
    if result["success"]:
        return jsonify(result), 200
    else:
        return jsonify(result), 400


@app.route("/api/rfid/scan", methods=["POST"])
def api_process_rfid_scan():
    """
    Process an RFID scan from a scanner device.
    Body: { "rfid_uid": "...", "scanner_id": "..." }
    """
    data = request.get_json() or {}
    rfid_uid = (data.get("rfid_uid") or "").strip()
    scanner_id = (data.get("scanner_id") or "").strip()
    
    if not rfid_uid or not scanner_id:
        return jsonify({
            "success": False,
            "message": "rfid_uid and scanner_id are required"
        }), 400
    
    result = process_rfid_scan(rfid_uid, scanner_id)
    return jsonify(result), 200


@app.route("/api/rfid/scan-logs", methods=["GET"])
@login_required
def api_get_rfid_scan_logs():
    """Get RFID scan logs."""
    uid = get_current_user_id()
    if not uid:
        return jsonify({"success": False, "message": "User not found"}), 404
    
    limit = request.args.get("limit", 100, type=int)
    logs = get_rfid_scan_logs(uid, limit)
    
    return jsonify({"success": True, "logs": logs}), 200


@app.route("/api/rfid/latest-unassigned", methods=["GET"])
@login_required
def api_get_latest_unassigned_rfid():
    """Get the latest UNKNOWN RFID scan (for auto-populating during assignment)."""
    uid = get_current_user_id()
    if not uid:
        return jsonify({"success": False, "message": "User not found"}), 404
    
    result = get_latest_unassigned_rfid()
    
    if result:
        return jsonify({"success": True, "rfid_uid": result["rfid_uid"], "scanned_at": result["scanned_at"]}), 200
    else:
        return jsonify({"success": False, "message": "No unassigned scans found"}), 404


if __name__ == "__main__":
    print("=" * 50)
    print("App starting...")
    
    # Initialize database and tables
    try:
        init_db()
        init_db_tables()
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

