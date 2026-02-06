"""
Auditing management functions.
"""
from psycopg.rows import dict_row
from auth import get_db_connection


def create_audit(scheduled_date, floor_plan_id, room_id, assigned_userid, assigned_by):
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO audits (scheduled_date, floor_plan_id, room_id, assigned_userid, assigned_by)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, scheduled_date, floor_plan_id, room_id, assigned_userid, assigned_by,
                          status, scanner_id, started_at, completed_at, created_at
                """,
                (scheduled_date, floor_plan_id, room_id, assigned_userid, assigned_by),
            )
            created = cur.fetchone()
            conn.commit()
            return dict(created)
    except Exception as e:
        print(f"create_audit error: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        conn.close()


def list_audits(assigned_userid=None, scheduled_date=None, include_all=False):
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            conditions = []
            params = []
            if scheduled_date:
                conditions.append("a.scheduled_date = %s")
                params.append(scheduled_date)
            if assigned_userid and not include_all:
                conditions.append("a.assigned_userid = %s")
                params.append(assigned_userid)

            where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

            cur.execute(
                f"""
                SELECT
                    a.id,
                    a.scheduled_date,
                    a.floor_plan_id,
                    a.room_id,
                    a.assigned_userid,
                    a.assigned_by,
                    a.status,
                    a.scanner_id,
                    a.started_at,
                    a.completed_at,
                    a.created_at,
                    r.room_name,
                    f.floor_title,
                    u.name AS assigned_name
                FROM audits a
                LEFT JOIN rooms r ON a.room_id = r.id
                LEFT JOIN floor_plans f ON a.floor_plan_id = f.id
                LEFT JOIN users u ON a.assigned_userid = u.userid
                {where_clause}
                ORDER BY a.scheduled_date DESC, a.created_at DESC
                """,
                params,
            )
            return [dict(r) for r in cur.fetchall()]
    except Exception as e:
        print(f"list_audits error: {e}")
        return []
    finally:
        conn.close()


def get_audit_by_id(audit_id):
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT
                    a.id,
                    a.scheduled_date,
                    a.floor_plan_id,
                    a.room_id,
                    a.assigned_userid,
                    a.assigned_by,
                    a.status,
                    a.scanner_id,
                    a.started_at,
                    a.completed_at,
                    a.created_at,
                    r.room_name,
                    f.floor_title,
                    u.name AS assigned_name
                FROM audits a
                LEFT JOIN rooms r ON a.room_id = r.id
                LEFT JOIN floor_plans f ON a.floor_plan_id = f.id
                LEFT JOIN users u ON a.assigned_userid = u.userid
                WHERE a.id = %s
                """,
                (audit_id,),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    except Exception as e:
        print(f"get_audit_by_id error: {e}")
        return None
    finally:
        conn.close()


def start_audit(audit_id, scanner_id):
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                UPDATE audits
                SET status = 'IN_PROGRESS', scanner_id = %s, started_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, scheduled_date, floor_plan_id, room_id, assigned_userid, assigned_by,
                          status, scanner_id, started_at, completed_at, created_at
                """,
                (scanner_id, audit_id),
            )
            updated = cur.fetchone()
            conn.commit()
            return dict(updated) if updated else None
    except Exception as e:
        print(f"start_audit error: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        conn.close()


def complete_audit(audit_id):
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                UPDATE audits
                SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, scheduled_date, floor_plan_id, room_id, assigned_userid, assigned_by,
                          status, scanner_id, started_at, completed_at, created_at
                """,
                (audit_id,),
            )
            updated = cur.fetchone()
            conn.commit()
            return dict(updated) if updated else None
    except Exception as e:
        print(f"complete_audit error: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        conn.close()


def generate_audit_report(audit_id):
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM audits WHERE id = %s", (audit_id,))
            audit = cur.fetchone()
            if not audit:
                return None

            audit = dict(audit)
            room_ids = []

            if audit.get("room_id"):
                room_ids = [audit["room_id"]]
            elif audit.get("floor_plan_id"):
                cur.execute("SELECT id FROM rooms WHERE floor_plan_id = %s", (audit["floor_plan_id"],))
                room_ids = [r[0] for r in cur.fetchall()]

            if not room_ids:
                return {
                    "audit": audit,
                    "summary": {
                        "total_expected": 0,
                        "scanned": 0,
                        "missing": 0,
                        "in_service": 0,
                        "unexpected": 0,
                        "all_present": True,
                    },
                    "missing_items": [],
                    "in_service_items": [],
                    "unexpected_items": [],
                }

            cur.execute(
                """
                SELECT i.id, i.item_name, i.rfid_uid, r.room_name, f.floor_title
                FROM inventory_items i
                LEFT JOIN rooms r ON i.room_id = r.id
                LEFT JOIN floor_plans f ON r.floor_plan_id = f.id
                WHERE i.room_id = ANY(%s)
                """,
                (room_ids,),
            )
            expected_items = [dict(r) for r in cur.fetchall()]
            expected_items = [i for i in expected_items if i.get("rfid_uid")]

            cur.execute("SELECT rfid_uid FROM service WHERE rfid_uid IS NOT NULL")
            in_service_set = {r[0] for r in cur.fetchall()}

            # Get borrowed items (items currently lent out)
            cur.execute("SELECT rfid_uid FROM lend_borrow WHERE status = 'OUT' AND rfid_uid IS NOT NULL")
            borrowed_set = {r[0] for r in cur.fetchall()}

            scanned_set = set()
            if audit.get("scanner_id") and audit.get("started_at"):
                cur.execute(
                    """
                    SELECT DISTINCT rfid_uid
                    FROM rfid_scan_logs
                    WHERE scanner_id = %s AND scanned_at >= %s
                    """,
                    (audit["scanner_id"], audit["started_at"]),
                )
                scanned_set = {r[0] for r in cur.fetchall() if r[0]}

            expected_map = {i["rfid_uid"]: i for i in expected_items}
            expected_set = set(expected_map.keys())

            in_service_items = [expected_map[uid] for uid in expected_set if uid in in_service_set]
            borrowed_items = [expected_map[uid] for uid in expected_set if uid in borrowed_set]
            # Missing items exclude those in service or borrowed (only truly missing)
            missing_uids = [uid for uid in expected_set if uid not in scanned_set and uid not in in_service_set and uid not in borrowed_set]
            missing_items = [expected_map[uid] for uid in missing_uids]
            
            # Ensure borrowed_set is defined (for backward compatibility)
            if 'borrowed_set' not in locals():
                borrowed_set = set()
            unexpected_items = [
                {"rfid_uid": uid}
                for uid in scanned_set
                if uid not in expected_set
            ]

            summary = {
                "total_expected": len(expected_set),
                "scanned": len(scanned_set),
                "missing": len(missing_items),
                "in_service": len(in_service_items),
                "borrowed": len(borrowed_items),
                "unexpected": len(unexpected_items),
                "all_present": len(missing_items) == 0,
            }

            return {
                "audit": audit,
                "summary": summary,
                "missing_items": missing_items,
                "in_service_items": in_service_items,
                "borrowed_items": borrowed_items,
                "unexpected_items": unexpected_items,
            }
    except Exception as e:
        print(f"generate_audit_report error: {e}")
        return None
    finally:
        conn.close()


def get_audit_items_status(audit_id):
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM audits WHERE id = %s", (audit_id,))
            audit = cur.fetchone()
            if not audit:
                return None

            audit = dict(audit)
            room_ids = []

            if audit.get("room_id"):
                room_ids = [audit["room_id"]]
            elif audit.get("floor_plan_id"):
                cur.execute("SELECT id FROM rooms WHERE floor_plan_id = %s", (audit["floor_plan_id"],))
                rows = cur.fetchall()
                room_ids = [r["id"] for r in rows] if rows else []

            if not room_ids:
                return {
                    "audit": audit,
                    "items": [],
                    "summary": {
                        "total_expected": 0,
                        "scanned": 0,
                        "missing": 0,
                        "in_service": 0,
                    },
                }

            # Get all items in the room(s), including those without RFID
            cur.execute(
                """
                SELECT i.id, i.item_name, i.rfid_uid, r.room_name, f.floor_title
                FROM inventory_items i
                LEFT JOIN rooms r ON i.room_id = r.id
                LEFT JOIN floor_plans f ON r.floor_plan_id = f.id
                WHERE i.room_id = ANY(%s)
                ORDER BY i.created_at
                """,
                (room_ids,),
            )
            all_items = [dict(r) for r in cur.fetchall()]
            
            # Only items with RFID can be scanned/audited
            expected_items = [i for i in all_items if i.get("rfid_uid")]
            items_without_rfid = [i for i in all_items if not i.get("rfid_uid")]

            cur.execute("SELECT rfid_uid FROM service WHERE rfid_uid IS NOT NULL")
            in_service_set = {r["rfid_uid"] for r in cur.fetchall()}

            # Get borrowed items (items currently lent out)
            cur.execute("SELECT rfid_uid FROM lend_borrow WHERE status = 'OUT' AND rfid_uid IS NOT NULL")
            borrowed_set = {r["rfid_uid"] for r in cur.fetchall()}

            scanned_set = set()
            if audit.get("scanner_id") and audit.get("started_at"):
                cur.execute(
                    """
                    SELECT DISTINCT rfid_uid
                    FROM rfid_scan_logs
                    WHERE scanner_id = %s AND scanned_at >= %s AND rfid_uid IS NOT NULL
                    """,
                    (audit["scanner_id"], audit["started_at"]),
                )
                scanned_set = {r["rfid_uid"] for r in cur.fetchall()}

            items = []
            missing = 0
            in_service = 0
            scanned = 0
            borrowed = 0

            # Process items with RFID
            for item in expected_items:
                uid = item.get("rfid_uid")
                if uid in scanned_set:
                    status = "SCANNED"
                    scanned += 1
                elif uid in in_service_set:
                    status = "IN_SERVICE"
                    in_service += 1
                elif uid in borrowed_set:
                    status = "BORROWED"
                    borrowed += 1
                else:
                    status = "MISSING"
                    missing += 1
                items.append({**item, "status": status})
            
            # Add items without RFID with NO_RFID status
            for item in items_without_rfid:
                items.append({**item, "status": "NO_RFID"})

            summary = {
                "total_expected": len(expected_items),
                "scanned": scanned,
                "missing": missing,
                "in_service": in_service,
                "borrowed": borrowed,
                "no_rfid": len(items_without_rfid),
            }

            return {
                "audit": audit,
                "items": items,
                "summary": summary,
            }
    except Exception as e:
        print(f"get_audit_items_status error: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        conn.close()
