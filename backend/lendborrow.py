"""
Lend/Borrow management - similar to service and repair
"""
from psycopg.rows import dict_row
from auth import get_db_connection


def lend_item(rfid_uid, user_rfid_uid=None, userid=None):
    """
    Lend an item out. Either user_rfid_uid or userid must be provided.
    """
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed"}

    try:
        with conn.cursor(row_factory=dict_row) as cur:
            # Check if item exists
            cur.execute(
                """
                SELECT i.id, i.item_name, i.rfid_uid, r.room_name, f.floor_title
                FROM inventory_items i
                LEFT JOIN rooms r ON i.room_id = r.id
                LEFT JOIN floor_plans f ON r.floor_plan_id = f.id
                WHERE i.rfid_uid = %s
                """,
                (rfid_uid,)
            )
            item = cur.fetchone()
            
            if not item:
                return {"success": False, "message": "Item not found"}

            # Check if already lent out
            cur.execute(
                "SELECT id FROM lend_borrow WHERE rfid_uid = %s AND status = 'OUT'",
                (rfid_uid,)
            )
            existing = cur.fetchone()
            if existing:
                return {"success": False, "message": "Item is already lent out"}

            # Create lend record
            cur.execute(
                """
                INSERT INTO lend_borrow (item_id, rfid_uid, user_rfid_uid, userid, status)
                VALUES (%s, %s, %s, %s, 'OUT')
                RETURNING id, item_id, rfid_uid, user_rfid_uid, userid, out_datetime, status
                """,
                (item["id"], rfid_uid, user_rfid_uid, userid)
            )
            lend_record = cur.fetchone()
            conn.commit()

            return {
                "success": True,
                "message": "Item lent successfully",
                "lend_record": dict(lend_record),
                "item": dict(item)
            }

    except Exception as e:
        print(f"lend_item error: {e}")
        if conn:
            conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        conn.close()


def return_item(rfid_uid):
    """
    Return a lent item back.
    """
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed"}

    try:
        with conn.cursor(row_factory=dict_row) as cur:
            # Find the active lend record
            cur.execute(
                "SELECT id FROM lend_borrow WHERE rfid_uid = %s AND status = 'OUT'",
                (rfid_uid,)
            )
            lend_record = cur.fetchone()

            if not lend_record:
                return {"success": False, "message": "Item not currently lent out"}

            # Update status to RETURNED
            cur.execute(
                """
                UPDATE lend_borrow
                SET status = 'RETURNED', in_datetime = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (lend_record["id"],)
            )
            conn.commit()

            return {"success": True, "message": "Item returned successfully"}

    except Exception as e:
        print(f"return_item error: {e}")
        if conn:
            conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        conn.close()


def get_items_lent_out():
    """
    Get all items currently lent out.
    """
    conn = get_db_connection()
    if not conn:
        return []

    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT 
                    lb.id,
                    lb.item_id,
                    lb.rfid_uid,
                    lb.user_rfid_uid,
                    lb.userid,
                    lb.out_datetime,
                    i.item_name,
                    r.room_name,
                    f.floor_title,
                    u.name as user_name
                FROM lend_borrow lb
                JOIN inventory_items i ON lb.item_id = i.id
                LEFT JOIN rooms r ON i.room_id = r.id
                LEFT JOIN floor_plans f ON r.floor_plan_id = f.id
                LEFT JOIN users u ON lb.userid = u.userid
                WHERE lb.status = 'OUT'
                ORDER BY lb.out_datetime DESC
                """
            )
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        print(f"get_items_lent_out error: {e}")
        return []
    finally:
        conn.close()


def get_lend_borrow_history():
    """
    Get all lend/borrow history.
    """
    conn = get_db_connection()
    if not conn:
        return []

    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT 
                    lb.id,
                    lb.item_id,
                    lb.rfid_uid,
                    lb.user_rfid_uid,
                    lb.userid,
                    lb.out_datetime,
                    lb.in_datetime,
                    lb.status,
                    i.item_name,
                    r.room_name,
                    f.floor_title,
                    u.name as user_name
                FROM lend_borrow lb
                JOIN inventory_items i ON lb.item_id = i.id
                LEFT JOIN rooms r ON i.room_id = r.id
                LEFT JOIN floor_plans f ON r.floor_plan_id = f.id
                LEFT JOIN users u ON lb.userid = u.userid
                ORDER BY lb.out_datetime DESC
                """
            )
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        print(f"get_lend_borrow_history error: {e}")
        return []
    finally:
        conn.close()


def get_user_by_rfid(user_rfid_uid):
    """
    Get user by their RFID UID.
    """
    conn = get_db_connection()
    if not conn:
        return None

    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT id, userid, name, user_rfid_uid FROM users WHERE user_rfid_uid = %s",
                (user_rfid_uid,)
            )
            user = cur.fetchone()
            return dict(user) if user else None
    except Exception as e:
        print(f"get_user_by_rfid error: {e}")
        return None
    finally:
        conn.close()
