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
            cur.execute("""
                SELECT id FROM service_repair 
                WHERE item_id = %s AND status = 'out'
            """, (item_id,))
            existing = cur.fetchone()
            
            if existing:
                return {"error": "Item already out for service"}
            
            # Insert service record
            cur.execute("""
                INSERT INTO service_repair 
                (item_id, rfid_uid, item_name, room_name, floor_title, status)
                VALUES (%s, %s, %s, %s, %s, 'out')
                RETURNING id, item_id, rfid_uid, item_name, room_name, floor_title, out_date, status
            """, (
                item_id,
                item['rfid_uid'],
                item['item_name'],
                item['room_name'],
                item['floor_title']
            ))
            service_record = dict(cur.fetchone())
            
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
    """Mark an item as returned from service. Returns True on success."""
    conn = get_db_connection()
    if not conn:
        return False
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            # Get the service record
            cur.execute("""
                SELECT s.*, i.rfid_uid, i.item_name
                FROM service_repair s
                JOIN inventory_items i ON s.item_id = i.id
                WHERE s.item_id = %s AND s.status = 'out'
                ORDER BY s.out_date DESC
                LIMIT 1
            """, (item_id,))
            service_record = cur.fetchone()
            
            if not service_record:
                return False
            
            # Update service record
            cur.execute("""
                UPDATE service_repair 
                SET in_date = CURRENT_TIMESTAMP, status = 'in'
                WHERE id = %s
            """, (service_record['id'],))
            
            # Log the return
            cur.execute("""
                INSERT INTO rfid_scan_logs 
                (rfid_uid, item_name, room, scanner_id, scan_status)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                service_record['rfid_uid'],
                service_record['item_name'],
                service_record['room_name'],
                'SERVICE_IN',
                'RETURNED_FROM_SERVICE'
            ))
            
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
            cur.execute("""
                SELECT 
                    id, item_id, rfid_uid, item_name, room_name, floor_title,
                    out_date, status
                FROM service_repair
                WHERE status = 'out'
                ORDER BY out_date DESC
            """)
            return [dict(r) for r in cur.fetchall()]
    except Exception as e:
        print(f"get_items_out_for_service error: {e}")
        return []
    finally:
        if conn:
            conn.close()


def get_all_service_history():
    """Get all service history (both out and returned)."""
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT 
                    id, item_id, rfid_uid, item_name, room_name, floor_title,
                    out_date, in_date, status
                FROM service_repair
                ORDER BY out_date DESC
            """)
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
