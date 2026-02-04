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

            cur.execute("SELECT rfid_uid FROM service")
            in_service_set = {r[0] for r in cur.fetchall()}

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
            missing_uids = [uid for uid in expected_set if uid not in scanned_set and uid not in in_service_set]
            missing_items = [expected_map[uid] for uid in missing_uids]
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
                "unexpected": len(unexpected_items),
                "all_present": len(missing_items) == 0,
            }

            return {
                "audit": audit,
                "summary": summary,
                "missing_items": missing_items,
                "in_service_items": in_service_items,
                "unexpected_items": unexpected_items,
            }
    except Exception as e:
        print(f"generate_audit_report error: {e}")
        return None
    finally:
        conn.close()
