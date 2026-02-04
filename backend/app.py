"""
Main Flask application file
"""
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_session import Session
from auth import register_user, login_user, get_user_by_id, get_user_numeric_id, init_db, list_users
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
from serviceandrepair import (
    send_item_out_for_service,
    receive_item_from_service,
    get_items_out_for_service,
    get_all_service_history,
    get_item_by_rfid_for_service,
)
from auditing import (
    create_audit,
    list_audits,
    get_audit_by_id,
    start_audit,
    complete_audit,
    generate_audit_report,
)
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


def is_admin_user(userid: str | None) -> bool:
    return userid == "admin"

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


@app.route("/api/rfid/latest-scan", methods=["GET"])
@login_required
def api_get_latest_scan():
    """Get the latest RFID scan regardless of status (for service operations)."""
    uid = get_current_user_id()
    if not uid:
        return jsonify({"success": False, "message": "User not found"}), 404
    
    from db_management import get_db_connection
    from psycopg.rows import dict_row
    
    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection failed"}), 500
    
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT rfid_uid, scanned_at 
                FROM rfid_scan_logs 
                WHERE scan_status IN ('OK', 'UNKNOWN')
                ORDER BY scanned_at DESC 
                LIMIT 1
            """)
            result = cur.fetchone()
            
            if result:
                return jsonify({
                    "success": True, 
                    "rfid_uid": result["rfid_uid"], 
                    "scanned_at": result["scanned_at"].isoformat() if result["scanned_at"] else None
                }), 200
            else:
                return jsonify({"success": False, "message": "No recent scans found"}), 404
    except Exception as e:
        print(f"Error getting latest scan: {e}")
        return jsonify({"success": False, "message": "Failed to fetch latest scan"}), 500
    finally:
        conn.close()


# ---- Service & Repair Routes ----

@app.route("/api/service/out", methods=["POST"])
@login_required
def send_out_for_service():
    """Send an item out for service."""
    try:
        uid = session.get("user_id")
        if not uid:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        data = request.get_json()
        rfid_uid = data.get("rfid_uid", "").strip()
        
        if not rfid_uid:
            return jsonify({"success": False, "message": "RFID UID required"}), 400
        
        print(f"[SERVICE OUT] Looking for item with RFID: {rfid_uid}")
        
        # Get item by RFID
        item = get_item_by_rfid_for_service(rfid_uid)
        if not item:
            print(f"[SERVICE OUT] Item not found for RFID: {rfid_uid}")
            return jsonify({"success": False, "message": "Item not found"}), 404
        
        print(f"[SERVICE OUT] Found item: {item}")
        
        result = send_item_out_for_service(item["id"], rfid_uid)
        
        if result and "error" not in result:
            print(f"[SERVICE OUT] Success: {result}")
            return jsonify({"success": True, "service_record": result}), 201
        elif result and "error" in result:
            print(f"[SERVICE OUT] Error: {result['error']}")
            return jsonify({"success": False, "message": result["error"]}), 400
        else:
            print(f"[SERVICE OUT] Failed to send item out")
            return jsonify({"success": False, "message": "Failed to send item out"}), 500
    except Exception as e:
        print(f"[SERVICE OUT] Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


@app.route("/api/service/in", methods=["POST"])
@login_required
def receive_from_service():
    """Mark an item as returned from service."""
    try:
        uid = session.get("user_id")
        if not uid:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        data = request.get_json()
        rfid_uid = data.get("rfid_uid", "").strip()
        
        if not rfid_uid:
            return jsonify({"success": False, "message": "RFID UID required"}), 400
        
        print(f"[SERVICE IN] Looking for item with RFID: {rfid_uid}")
        
        # Get item by RFID
        item = get_item_by_rfid_for_service(rfid_uid)
        if not item:
            print(f"[SERVICE IN] Item not found for RFID: {rfid_uid}")
            return jsonify({"success": False, "message": "Item not found"}), 404
        
        print(f"[SERVICE IN] Found item: {item}")
        
        success = receive_item_from_service(item["id"])
        
        if success:
            print(f"[SERVICE IN] Success: Item received from service")
            return jsonify({"success": True, "message": "Item received from service"}), 200
        else:
            print(f"[SERVICE IN] Failed: Item not out for service or error occurred")
            return jsonify({"success": False, "message": "Failed to receive item or not out for service"}), 400
    except Exception as e:
        print(f"[SERVICE IN] Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


@app.route("/api/service/out-items", methods=["GET"])
@login_required
def list_items_out_for_service():
    """Get all items currently out for service."""
    uid = session.get("user_id")
    if not uid:
        return jsonify({"success": False, "message": "User not found"}), 404
    
    items = get_items_out_for_service()
    return jsonify({"success": True, "items": items}), 200


@app.route("/api/service/history", methods=["GET"])
@login_required
def list_service_history():
    """Get all service history."""
    uid = session.get("user_id")
    if not uid:
        return jsonify({"success": False, "message": "User not found"}), 404
    
    history = get_all_service_history()
    return jsonify({"success": True, "history": history}), 200


@app.route("/api/service/item-by-rfid/<rfid_uid>", methods=["GET"])
@login_required
def get_item_for_service(rfid_uid):
    """Get item details by RFID for service operations."""
    uid = session.get("user_id")
    if not uid:
        return jsonify({"success": False, "message": "User not found"}), 404
    
    item = get_item_by_rfid_for_service(rfid_uid)
    
    if item:
        return jsonify({"success": True, "item": item}), 200
    else:
        return jsonify({"success": False, "message": "Item not found"}), 404


# ---- Auditing ----

@app.route("/api/users", methods=["GET"])
@login_required
def list_users_admin():
    userid = session.get("user_id")
    if not is_admin_user(userid):
        return jsonify({"success": False, "message": "Admin only"}), 403
    return jsonify({"success": True, "users": list_users()}), 200


@app.route("/api/audits", methods=["GET"])
@login_required
def list_audits_api():
    userid = session.get("user_id")
    if not userid:
        return jsonify({"success": False, "message": "User not found"}), 404

    date = request.args.get("date")
    include_all = is_admin_user(userid)
    audits = list_audits(assigned_userid=userid, scheduled_date=date, include_all=include_all)
    return jsonify({"success": True, "audits": audits}), 200


@app.route("/api/audits", methods=["POST"])
@login_required
def create_audit_api():
    userid = session.get("user_id")
    if not is_admin_user(userid):
        return jsonify({"success": False, "message": "Admin only"}), 403

    data = request.get_json() or {}
    scheduled_date = data.get("scheduled_date")
    floor_plan_id = data.get("floor_plan_id")
    room_id = data.get("room_id")
    assigned_userid = data.get("assigned_userid")

    if not scheduled_date or not assigned_userid:
        return jsonify({"success": False, "message": "scheduled_date and assigned_userid are required"}), 400

    result = create_audit(scheduled_date, floor_plan_id, room_id, assigned_userid, userid)
    if result:
        return jsonify({"success": True, "audit": result}), 201
    return jsonify({"success": False, "message": "Failed to create audit"}), 500


@app.route("/api/audits/<int:audit_id>", methods=["GET"])
@login_required
def get_audit_api(audit_id: int):
    userid = session.get("user_id")
    if not userid:
        return jsonify({"success": False, "message": "User not found"}), 404

    audit = get_audit_by_id(audit_id)
    if not audit:
        return jsonify({"success": False, "message": "Audit not found"}), 404

    if not is_admin_user(userid) and audit.get("assigned_userid") != userid:
        return jsonify({"success": False, "message": "Forbidden"}), 403

    return jsonify({"success": True, "audit": audit}), 200


@app.route("/api/audits/<int:audit_id>/start", methods=["POST"])
@login_required
def start_audit_api(audit_id: int):
    userid = session.get("user_id")
    if not userid:
        return jsonify({"success": False, "message": "User not found"}), 404

    audit = get_audit_by_id(audit_id)
    if not audit:
        return jsonify({"success": False, "message": "Audit not found"}), 404

    if not is_admin_user(userid) and audit.get("assigned_userid") != userid:
        return jsonify({"success": False, "message": "Forbidden"}), 403

    data = request.get_json() or {}
    scanner_id = data.get("scanner_id")
    if not scanner_id:
        return jsonify({"success": False, "message": "scanner_id is required"}), 400

    updated = start_audit(audit_id, scanner_id)
    if updated:
        return jsonify({"success": True, "audit": updated}), 200
    return jsonify({"success": False, "message": "Failed to start audit"}), 500


@app.route("/api/audits/<int:audit_id>/complete", methods=["POST"])
@login_required
def complete_audit_api(audit_id: int):
    userid = session.get("user_id")
    if not userid:
        return jsonify({"success": False, "message": "User not found"}), 404

    audit = get_audit_by_id(audit_id)
    if not audit:
        return jsonify({"success": False, "message": "Audit not found"}), 404

    if not is_admin_user(userid) and audit.get("assigned_userid") != userid:
        return jsonify({"success": False, "message": "Forbidden"}), 403

    updated = complete_audit(audit_id)
    if updated:
        return jsonify({"success": True, "audit": updated}), 200
    return jsonify({"success": False, "message": "Failed to complete audit"}), 500


@app.route("/api/audits/<int:audit_id>/report", methods=["GET"])
@login_required
def audit_report_api(audit_id: int):
    userid = session.get("user_id")
    if not userid:
        return jsonify({"success": False, "message": "User not found"}), 404

    audit = get_audit_by_id(audit_id)
    if not audit:
        return jsonify({"success": False, "message": "Audit not found"}), 404

    if not is_admin_user(userid) and audit.get("assigned_userid") != userid:
        return jsonify({"success": False, "message": "Forbidden"}), 403

    report = generate_audit_report(audit_id)
    if report:
        return jsonify({"success": True, "report": report}), 200
    return jsonify({"success": False, "message": "Failed to generate report"}), 500


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

