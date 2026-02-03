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
                    item_count INTEGER DEFAULT 1,
                    item_icon_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

def create_inventory_item(room_id: int, item_name: str, item_count: int = 1, item_icon_url: str = None):
    """Create an inventory item in a room. Room must exist and belong to user (caller must verify)."""
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """INSERT INTO inventory_items (room_id, item_name, item_count, item_icon_url)
                   VALUES (%s, %s, %s, %s) RETURNING id, item_name, item_count, item_icon_url, room_id, created_at""",
                (room_id, item_name.strip(), max(1, int(item_count)), item_icon_url),
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
    """List inventory items for a room."""
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT id, item_name, item_count, item_icon_url, room_id, created_at
                   FROM inventory_items WHERE room_id = %s ORDER BY id""",
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
                """SELECT i.id, i.item_name, i.item_count, i.item_icon_url, i.room_id, i.created_at
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
