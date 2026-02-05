"""
Database management for floor_plans, rooms, and inventory_items.
All operations are scoped by user (via user_id from users.id).
"""
import psycopg
from psycopg.rows import dict_row
from auth import get_db_connection


def init_tables(conn=None):
    """Create floor_plans, rooms, inventory_items tables if they don't exist."""
    if conn is None:
        conn = get_db_connection()
    if not conn:
        return
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS floor_plans (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    floor_title VARCHAR(150) NOT NULL,
                    floor_description TEXT,
                    floor_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS rooms (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    floor_plan_id INTEGER REFERENCES floor_plans(id) ON DELETE SET NULL,
                    room_name VARCHAR(100) NOT NULL,
                    room_description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS inventory_items (
                    id SERIAL PRIMARY KEY,
                    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
                    item_name VARCHAR(150) NOT NULL,
                    item_icon_url TEXT,
                    rfid_uid VARCHAR(50) UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS rfid_scan_logs (
                    id SERIAL PRIMARY KEY,
                    rfid_uid VARCHAR(50),
                    item_name VARCHAR(150),
                    room VARCHAR(100),
                    scanner_id VARCHAR(50),
                    scan_status VARCHAR(20),
                    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS service (
                    id SERIAL PRIMARY KEY,
                    rfid_uid VARCHAR(50) NOT NULL REFERENCES inventory_items(rfid_uid) ON DELETE CASCADE,
                    out_datetime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # Migration: Ensure out_datetime has DEFAULT (fix for existing tables)
            cur.execute("""
                ALTER TABLE service 
                ALTER COLUMN out_datetime SET DEFAULT CURRENT_TIMESTAMP
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS audits (
                    id SERIAL PRIMARY KEY,
                    scheduled_date DATE NOT NULL,
                    floor_plan_id INTEGER REFERENCES floor_plans(id) ON DELETE SET NULL,
                    room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
                    assigned_userid VARCHAR(50) NOT NULL,
                    assigned_by VARCHAR(50) NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED',
                    scanner_id VARCHAR(50),
                    started_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            cur.execute("""
                CREATE TABLE IF NOT EXISTS periodic_audits (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    floor_plan_id INTEGER REFERENCES floor_plans(id) ON DELETE SET NULL,
                    room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
                    scanner_id VARCHAR(50) NOT NULL,
                    interval_type VARCHAR(20) NOT NULL,
                    note TEXT,
                    is_active BOOLEAN DEFAULT true,
                    last_audit_date DATE,
                    next_audit_date DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            conn.commit()
    except Exception as e:
        print(f"db_management init_tables error: {e}")
    finally:
        if conn:
            conn.close()


# ---- Floor plans ----

def create_floor_plan(user_id: int, floor_title: str, floor_description: str = None, floor_url: str = None):
    """Create a floor plan. Returns dict with id and created_at or None on error."""
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """INSERT INTO floor_plans (user_id, floor_title, floor_description, floor_url)
                   VALUES (%s, %s, %s, %s) RETURNING id, floor_title, floor_description, floor_url, created_at""",
                (user_id, floor_title.strip(), (floor_description or "").strip() or None, floor_url),
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row) if row else None
    except Exception as e:
        print(f"create_floor_plan error: {e}")
        return None
    finally:
        conn.close()


def get_floor_plans(user_id: int):
    """List all floor plans for a user."""
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT id, floor_title, floor_description, floor_url, created_at
                   FROM floor_plans WHERE user_id = %s ORDER BY created_at DESC""",
                (user_id,),
            )
            rows = cur.fetchall()
            return [dict(r) for r in rows]
    except Exception as e:
        print(f"get_floor_plans error: {e}")
        return []
    finally:
        conn.close()


def get_floor_plan_by_id(plan_id: int, user_id: int):
    """Get a single floor plan by id if it belongs to the user."""
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT id, floor_title, floor_description, floor_url, created_at
                   FROM floor_plans WHERE id = %s AND user_id = %s""",
                (plan_id, user_id),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    except Exception as e:
        print(f"get_floor_plan_by_id error: {e}")
        return None
    finally:
        conn.close()


def update_floor_plan_url(plan_id: int, user_id: int, floor_url: str):
    """Update floor_plan.floor_url."""
    conn = get_db_connection()
    if not conn:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE floor_plans SET floor_url = %s WHERE id = %s AND user_id = %s",
                (floor_url, plan_id, user_id),
            )
            conn.commit()
            return cur.rowcount > 0
    except Exception as e:
        print(f"update_floor_plan_url error: {e}")
        return False
    finally:
        conn.close()


# ---- Rooms ----

def create_room(user_id: int, floor_plan_id: int, room_name: str, room_description: str = None):
    """Create a room. Returns dict with id and fields or None."""
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """INSERT INTO rooms (user_id, floor_plan_id, room_name, room_description)
                   VALUES (%s, %s, %s, %s) RETURNING id, room_name, room_description, floor_plan_id, created_at""",
                (user_id, floor_plan_id, room_name.strip(), (room_description or "").strip() or None),
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row) if row else None
    except Exception as e:
        print(f"create_room error: {e}")
        return None
    finally:
        conn.close()


def get_rooms_by_floor_plan(floor_plan_id: int, user_id: int):
    """List rooms for a floor plan (user-scoped)."""
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT id, room_name, room_description, floor_plan_id, created_at
                   FROM rooms WHERE floor_plan_id = %s AND user_id = %s ORDER BY id""",
                (floor_plan_id, user_id),
            )
            return [dict(r) for r in cur.fetchall()]
    except Exception as e:
        print(f"get_rooms_by_floor_plan error: {e}")
        return []
    finally:
        conn.close()


def get_rooms(user_id: int):
    """List all rooms for a user."""
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT id, room_name, room_description, floor_plan_id, created_at
                   FROM rooms WHERE user_id = %s ORDER BY id""",
                (user_id,),
            )
            return [dict(r) for r in cur.fetchall()]
    except Exception as e:
        print(f"get_rooms error: {e}")
        return []
    finally:
        conn.close()


def get_room_by_id(room_id: int, user_id: int):
    """Get a room by id if it belongs to the user."""
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT id, room_name, room_description, floor_plan_id, created_at FROM rooms WHERE id = %s AND user_id = %s",
                (room_id, user_id),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    except Exception as e:
        print(f"get_room_by_id error: {e}")
        return None
    finally:
        conn.close()


# ---- Inventory items ----

def create_inventory_item(room_id: int, item_name: str, item_icon_url: str = None, rfid_uid: str = None):
    """Create a single inventory item in a room. Each item is individual with its own RFID."""
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """INSERT INTO inventory_items (room_id, item_name, item_icon_url, rfid_uid)
                   VALUES (%s, %s, %s, %s) RETURNING id, item_name, item_icon_url, rfid_uid, room_id, created_at""",
                (room_id, item_name.strip(), item_icon_url, rfid_uid),
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row) if row else None
    except Exception as e:
        print(f"create_inventory_item error: {e}")
        return None
    finally:
        conn.close()


def get_inventory_items_by_room(room_id: int):
    """List all inventory items for a room with last scan timestamp."""
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT 
                    i.id, i.item_name, i.item_icon_url, i.rfid_uid, i.room_id, i.created_at,
                    (SELECT scanned_at FROM rfid_scan_logs 
                     WHERE rfid_uid = i.rfid_uid 
                     ORDER BY scanned_at DESC LIMIT 1) as last_scanned_at
                   FROM inventory_items i
                   WHERE i.room_id = %s 
                   ORDER BY i.id""",
                (room_id,),
            )
            return [dict(r) for r in cur.fetchall()]
    except Exception as e:
        print(f"get_inventory_items_by_room error: {e}")
        return []
    finally:
        conn.close()


def update_inventory_item_icon(item_id: int, room_id: int, user_id: int, item_icon_url: str):
    """Update item_icon_url. Verifies room belongs to user."""
    conn = get_db_connection()
    if not conn:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute(
                """UPDATE inventory_items SET item_icon_url = %s
                   WHERE id = %s AND room_id IN (SELECT id FROM rooms WHERE user_id = %s AND id = %s)""",
                (item_icon_url, item_id, user_id, room_id),
            )
            conn.commit()
            return cur.rowcount > 0
    except Exception as e:
        print(f"update_inventory_item_icon error: {e}")
        return False
    finally:
        conn.close()


def get_inventory_item_by_id(item_id: int, user_id: int):
    """Get a single item by id if its room belongs to the user."""
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT i.id, i.item_name, i.item_icon_url, i.rfid_uid, i.room_id, i.created_at
                   FROM inventory_items i
                   JOIN rooms r ON r.id = i.room_id WHERE i.id = %s AND r.user_id = %s""",
                (item_id, user_id),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    except Exception as e:
        print(f"get_inventory_item_by_id error: {e}")
        return None
    finally:
        conn.close()

# ---- RFID Management ----

def assign_rfid_to_item(item_id: int, rfid_uid: str, user_id: int):
    """
    Assign an RFID UID to an inventory item.
    Returns: {"success": bool, "message": str, "item": dict or None}
    """
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed"}
    
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            # Check if RFID UID already exists in the database
            cur.execute("SELECT id, item_name FROM inventory_items WHERE rfid_uid = %s", (rfid_uid,))
            existing = cur.fetchone()
            if existing:
                return {
                    "success": False,
                    "message": f"RFID UID already assigned to item: {existing['item_name']}"
                }
            
            # Verify the item belongs to the user
            cur.execute(
                """SELECT i.id, i.item_name, i.item_icon_url, i.rfid_uid, i.room_id, i.created_at
                   FROM inventory_items i
                   JOIN rooms r ON r.id = i.room_id 
                   WHERE i.id = %s AND r.user_id = %s""",
                (item_id, user_id),
            )
            item = cur.fetchone()
            if not item:
                return {"success": False, "message": "Item not found or unauthorized"}
            
            # Assign RFID UID to item
            cur.execute(
                "UPDATE inventory_items SET rfid_uid = %s WHERE id = %s",
                (rfid_uid, item_id),
            )
            conn.commit()
            
            # Return updated item
            return {
                "success": True,
                "message": f"RFID UID assigned to {item['item_name']}",
                "item": dict(item)
            }
    except Exception as e:
        print(f"assign_rfid_to_item error: {e}")
        return {"success": False, "message": f"Error assigning RFID: {str(e)}"}
    finally:
        conn.close()


def get_item_by_rfid(rfid_uid: str):
    """
    Get item details by RFID UID.
    Returns: dict with item, room name, or None if not found
    """
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT i.id, i.item_name, i.item_count, i.item_icon_url, i.room_id, 
                          i.rfid_uid, r.room_name
                   FROM inventory_items i
                   JOIN rooms r ON r.id = i.room_id
                   WHERE i.rfid_uid = %s""",
                (rfid_uid,),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    except Exception as e:
        print(f"get_item_by_rfid error: {e}")
        return None
    finally:
        conn.close()


def log_rfid_scan(rfid_uid: str, scanner_id: str, scan_status: str, item_name: str = None, room: str = None):
    """
    Log an RFID scan event.
    scan_status: "OK" or "UNKNOWN"
    Returns: bool indicating success
    """
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO rfid_scan_logs (rfid_uid, scanner_id, scan_status, item_name, room)
                   VALUES (%s, %s, %s, %s, %s)""",
                (rfid_uid, scanner_id, scan_status, item_name, room),
            )
            conn.commit()
            return True
    except Exception as e:
        print(f"log_rfid_scan error: {e}")
        return False
    finally:
        conn.close()


def get_rfid_scan_logs(user_id: int, limit: int = 100):
    """
    Get RFID scan logs (all scans, not user-scoped for display purposes).
    Returns: list of scan log dicts
    """
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT id, rfid_uid, scanner_id, scan_status, item_name, room, scanned_at
                   FROM rfid_scan_logs
                   ORDER BY scanned_at DESC
                   LIMIT %s""",
                (limit,),
            )
            return [dict(r) for r in cur.fetchall()]
    except Exception as e:
        print(f"get_rfid_scan_logs error: {e}")
        return []
    finally:
        conn.close()


def get_latest_unassigned_rfid():
    """
    Get the most recent RFID scan that is UNKNOWN (not assigned to any item).
    Returns: {"rfid_uid": str, "scanned_at": str} or None
    """
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT rfid_uid, scanned_at
                   FROM rfid_scan_logs
                   WHERE scan_status = 'UNKNOWN'
                   ORDER BY scanned_at DESC
                   LIMIT 1""",
            )
            row = cur.fetchone()
            return dict(row) if row else None
    except Exception as e:
        print(f"get_latest_unassigned_rfid error: {e}")
        return None
    finally:
        conn.close()

def create_bulk_inventory_items(room_id: int, base_name: str, quantity: int, item_icon_url: str = None):
    """
    Create multiple individual inventory items at once.
    For example: base_name="Monitor", quantity=10 creates Monitor1, Monitor2, ..., Monitor10
    Each item must have its own RFID assigned separately.
    Returns: list of created items or empty list on error
    """
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        created_items = []
        with conn.cursor(row_factory=dict_row) as cur:
            for i in range(1, int(quantity) + 1):
                item_name = f"{base_name.strip()}{i}"
                cur.execute(
                    """INSERT INTO inventory_items (room_id, item_name, item_icon_url)
                       VALUES (%s, %s, %s) RETURNING id, item_name, item_icon_url, rfid_uid, room_id, created_at""",
                    (room_id, item_name, item_icon_url),
                )
                item = cur.fetchone()
                if item:
                    created_items.append(dict(item))
            conn.commit()
        return created_items
    except Exception as e:
        print(f"create_bulk_inventory_items error: {e}")
        return []
    finally:
        conn.close()


# ---- Periodic Audits ----

def create_periodic_audit(user_id: int, floor_plan_id: int, room_id: int, scanner_id: str, interval_type: str, note: str = None):
    """
    Create a periodic audit configuration.
    interval_type: '24h', '2d', '5d'
    Returns: dict with id and fields or None on error
    """
    conn = get_db_connection()
    if not conn:
        return None
    try:
        # Calculate next audit date based on interval
        from datetime import datetime, timedelta
        today = datetime.now().date()
        
        interval_days = {
            '24h': 1,
            '2d': 2,
            '5d': 5
        }.get(interval_type, 1)
        
        next_audit_date = today + timedelta(days=interval_days)
        
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """INSERT INTO periodic_audits 
                   (user_id, floor_plan_id, room_id, scanner_id, interval_type, note, next_audit_date)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)
                   RETURNING id, floor_plan_id, room_id, scanner_id, interval_type, note, 
                             is_active, next_audit_date, created_at""",
                (user_id, floor_plan_id, room_id, scanner_id, interval_type, note, next_audit_date),
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row) if row else None
    except Exception as e:
        print(f"create_periodic_audit error: {e}")
        return None
    finally:
        conn.close()


def get_periodic_audits(user_id: int, is_active: bool = True):
    """
    Get all periodic audits for a user.
    Returns: list of periodic audit dicts
    """
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            if is_active:
                cur.execute(
                    """SELECT pa.id, pa.floor_plan_id, pa.room_id, pa.scanner_id, 
                              pa.interval_type, pa.note, pa.is_active, pa.next_audit_date, 
                              pa.last_audit_date, pa.created_at,
                              f.floor_title, r.room_name
                       FROM periodic_audits pa
                       LEFT JOIN floor_plans f ON pa.floor_plan_id = f.id
                       LEFT JOIN rooms r ON pa.room_id = r.id
                       WHERE pa.user_id = %s AND pa.is_active = true
                       ORDER BY pa.next_audit_date ASC""",
                    (user_id,),
                )
            else:
                cur.execute(
                    """SELECT pa.id, pa.floor_plan_id, pa.room_id, pa.scanner_id, 
                              pa.interval_type, pa.note, pa.is_active, pa.next_audit_date, 
                              pa.last_audit_date, pa.created_at,
                              f.floor_title, r.room_name
                       FROM periodic_audits pa
                       LEFT JOIN floor_plans f ON pa.floor_plan_id = f.id
                       LEFT JOIN rooms r ON pa.room_id = r.id
                       WHERE pa.user_id = %s
                       ORDER BY pa.next_audit_date DESC""",
                    (user_id,),
                )
            return [dict(r) for r in cur.fetchall()]
    except Exception as e:
        print(f"get_periodic_audits error: {e}")
        return []
    finally:
        conn.close()


def get_periodic_audit_by_id(audit_id: int, user_id: int):
    """
    Get a periodic audit by id if it belongs to the user.
    Returns: dict or None
    """
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT pa.id, pa.floor_plan_id, pa.room_id, pa.scanner_id, 
                          pa.interval_type, pa.note, pa.is_active, pa.next_audit_date, 
                          pa.last_audit_date, pa.created_at,
                          f.floor_title, r.room_name
                   FROM periodic_audits pa
                   LEFT JOIN floor_plans f ON pa.floor_plan_id = f.id
                   LEFT JOIN rooms r ON pa.room_id = r.id
                   WHERE pa.id = %s AND pa.user_id = %s""",
                (audit_id, user_id),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    except Exception as e:
        print(f"get_periodic_audit_by_id error: {e}")
        return None
    finally:
        conn.close()


def deactivate_periodic_audit(audit_id: int, user_id: int):
    """
    Deactivate a periodic audit.
    Returns: bool indicating success
    """
    conn = get_db_connection()
    if not conn:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute(
                """UPDATE periodic_audits 
                   SET is_active = false, updated_at = CURRENT_TIMESTAMP
                   WHERE id = %s AND user_id = %s""",
                (audit_id, user_id),
            )
            conn.commit()
            return cur.rowcount > 0
    except Exception as e:
        print(f"deactivate_periodic_audit error: {e}")
        return False
    finally:
        conn.close()


def activate_periodic_audit(audit_id: int, user_id: int):
    """
    Activate a periodic audit.
    Returns: bool indicating success
    """
    conn = get_db_connection()
    if not conn:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute(
                """UPDATE periodic_audits 
                   SET is_active = true, updated_at = CURRENT_TIMESTAMP
                   WHERE id = %s AND user_id = %s""",
                (audit_id, user_id),
            )
            conn.commit()
            return cur.rowcount > 0
    except Exception as e:
        print(f"activate_periodic_audit error: {e}")
        return False
    finally:
        conn.close()


def update_periodic_audit_last_scan(audit_id: int):
    """
    Update the last_audit_date and calculate next_audit_date for a periodic audit.
    Returns: bool indicating success
    """
    conn = get_db_connection()
    if not conn:
        return False
    try:
        from datetime import datetime, timedelta
        today = datetime.now().date()
        
        with conn.cursor(row_factory=dict_row) as cur:
            # Get the interval type
            cur.execute("SELECT interval_type FROM periodic_audits WHERE id = %s", (audit_id,))
            row = cur.fetchone()
            if not row:
                return False
            
            interval_days = {
                '24h': 1,
                '2d': 2,
                '5d': 5
            }.get(row['interval_type'], 1)
            
            next_audit_date = today + timedelta(days=interval_days)
            
            cur.execute(
                """UPDATE periodic_audits 
                   SET last_audit_date = %s, next_audit_date = %s, updated_at = CURRENT_TIMESTAMP
                   WHERE id = %s""",
                (today, next_audit_date, audit_id),
            )
            conn.commit()
            return cur.rowcount > 0
    except Exception as e:
        print(f"update_periodic_audit_last_scan error: {e}")
        return False
    finally:
        conn.close()