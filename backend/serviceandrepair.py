"""
Service and Repair management functions.
Tracks items sent out for service/repair and their return.
"""
from psycopg.rows import dict_row
from auth import get_db_connection


def send_item_out_for_service(item_id: int, rfid_uid: str):
    """Mark an item as out for service. Returns the service record or None."""
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            # Get item details with room and floor info
            cur.execute("""
                SELECT 
                    i.id, i.item_name, i.rfid_uid,
                    r.room_name,
                    f.floor_title
                FROM inventory_items i
                LEFT JOIN rooms r ON i.room_id = r.id
                LEFT JOIN floor_plans f ON r.floor_plan_id = f.id
                WHERE i.id = %s
            """, (item_id,))
            item = cur.fetchone()
            
            if not item:
                return None
            
            # Check if already out for service
            cur.execute(
                """
                SELECT id FROM service 
                WHERE rfid_uid = %s
                """,
                (item['rfid_uid'],),
            )
            existing = cur.fetchone()
            
            if existing:
                return {"error": "Item already out for service"}
            
            # Insert service record
            cur.execute(
                """
                INSERT INTO service (rfid_uid)
                VALUES (%s)
                RETURNING id, rfid_uid, out_datetime
                """,
                (item['rfid_uid'],),
            )
            inserted = cur.fetchone()

            service_record = {
                "id": inserted["id"],
                "item_id": item_id,
                "rfid_uid": inserted["rfid_uid"],
                "item_name": item["item_name"],
                "room_name": item["room_name"],
                "floor_title": item["floor_title"],
                "out_date": inserted["out_datetime"],
                "status": "out",
            }
            
            # Log the action
            cur.execute("""
                INSERT INTO rfid_scan_logs 
                (rfid_uid, item_name, room, scanner_id, scan_status)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                item['rfid_uid'],
                item['item_name'],
                item['room_name'],
                'SERVICE_OUT',
                'OUT_FOR_SERVICE'
            ))
            
            conn.commit()
            return service_record
    except Exception as e:
        print(f"send_item_out_for_service error: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        if conn:
            conn.close()


def receive_item_from_service(item_id: int):
    """Mark an item as returned from service. Deletes active service row."""
    conn = get_db_connection()
    if not conn:
        return False
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            # Get item details and service record by RFID
            cur.execute(
                """
                SELECT i.rfid_uid, i.item_name, r.room_name
                FROM inventory_items i
                LEFT JOIN rooms r ON i.room_id = r.id
                WHERE i.id = %s
                """,
                (item_id,),
            )
            item = cur.fetchone()

            if not item:
                return False

            cur.execute(
                """
                SELECT id FROM service
                WHERE rfid_uid = %s
                """,
                (item["rfid_uid"],),
            )
            service_record = cur.fetchone()
            
            if not service_record:
                return False
            
            # Delete from service table (item returned)
            cur.execute(
                """
                DELETE FROM service
                WHERE id = %s
                """,
                (service_record["id"],),
            )
            
            # Log the return
            cur.execute(
                """
                INSERT INTO rfid_scan_logs 
                (rfid_uid, item_name, room, scanner_id, scan_status)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    item["rfid_uid"],
                    item["item_name"],
                    item["room_name"],
                    "SERVICE_IN",
                    "RETURNED_FROM_SERVICE",
                ),
            )
            
            conn.commit()
            return True
    except Exception as e:
        print(f"receive_item_from_service error: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()


def get_items_out_for_service():
    """Get all items currently out for service."""
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT
                    s.id,
                    i.id AS item_id,
                    s.rfid_uid,
                    i.item_name,
                    r.room_name,
                    f.floor_title,
                    s.out_datetime AS out_date,
                    'out' AS status
                FROM service s
                LEFT JOIN inventory_items i ON s.rfid_uid = i.rfid_uid
                LEFT JOIN rooms r ON i.room_id = r.id
                LEFT JOIN floor_plans f ON r.floor_plan_id = f.id
                ORDER BY s.out_datetime DESC
                """
            )
            return [dict(r) for r in cur.fetchall()]
    except Exception as e:
        print(f"get_items_out_for_service error: {e}")
        return []
    finally:
        if conn:
            conn.close()


def get_all_service_history():
    """Get service history from logs (out and returned)."""
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT
                    l.id,
                    i.id AS item_id,
                    l.rfid_uid,
                    i.item_name,
                    r.room_name,
                    f.floor_title,
                    l.scanned_at AS out_date,
                    NULL AS in_date,
                    l.scan_status AS status
                FROM rfid_scan_logs l
                LEFT JOIN inventory_items i ON l.rfid_uid = i.rfid_uid
                LEFT JOIN rooms r ON i.room_id = r.id
                LEFT JOIN floor_plans f ON r.floor_plan_id = f.id
                WHERE l.scan_status IN ('OUT_FOR_SERVICE', 'RETURNED_FROM_SERVICE')
                ORDER BY l.scanned_at DESC
                """
            )
            return [dict(r) for r in cur.fetchall()]
    except Exception as e:
        print(f"get_all_service_history error: {e}")
        return []
    finally:
        if conn:
            conn.close()


def get_item_by_rfid_for_service(rfid_uid: str):
    """Get item details by RFID for service operations."""
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT 
                    i.id, i.item_name, i.rfid_uid,
                    r.room_name,
                    f.floor_title
                FROM inventory_items i
                LEFT JOIN rooms r ON i.room_id = r.id
                LEFT JOIN floor_plans f ON r.floor_plan_id = f.id
                WHERE i.rfid_uid = %s
            """, (rfid_uid,))
            item = cur.fetchone()
            return dict(item) if item else None
    except Exception as e:
        print(f"get_item_by_rfid_for_service error: {e}")
        return None
    finally:
        if conn:
            conn.close()
