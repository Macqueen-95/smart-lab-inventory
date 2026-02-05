"""
Probabilistic Inventory Confidence System for RFID-based inventory.

Computes confidence scores (0-1) for item presence based on:
- Time since last successful scan (exponential decay)
- Optional scan frequency boost from recent scans
"""
import math
from datetime import datetime, timedelta
from auth import get_db_connection
from psycopg.rows import dict_row


def calculate_confidence(
    minutes_since_last_scan: float,
    scan_count_last_hour: int = 0,
    decay_factor: float = 30.0,
    use_frequency_boost: bool = True,
) -> float:
    """
    Calculate confidence score using exponential decay with optional frequency boost.
    
    Args:
        minutes_since_last_scan: Minutes elapsed since last successful scan
        scan_count_last_hour: Number of successful scans in the last hour (for boost)
        decay_factor: Decay factor in minutes (default: 30). Higher = slower decay.
        use_frequency_boost: Whether to apply frequency boost (default: True)
    
    Returns:
        Confidence score between 0.0 and 1.0
    """
    # Exponential decay: confidence = exp(-Δt / decay_factor)
    # As time increases, confidence decreases exponentially
    base_confidence = math.exp(-minutes_since_last_scan / decay_factor)
    
    # Optional frequency boost: more recent scans increase confidence
    if use_frequency_boost and scan_count_last_hour > 0:
        # Logarithmic boost: log(1 + count) prevents excessive boost
        frequency_boost = 1 + math.log(1 + scan_count_last_hour)
        boosted_confidence = base_confidence * frequency_boost
        # Cap at 1.0
        return min(boosted_confidence, 1.0)
    
    return base_confidence


def get_confidence_status(confidence: float) -> str:
    """
    Convert confidence score to human-readable status.
    
    Args:
        confidence: Confidence score (0.0 to 1.0)
    
    Returns:
        Status string: "Present", "Likely Present", "Uncertain", or "Likely Missing"
    """
    if confidence >= 0.7:
        return "Present"
    elif confidence >= 0.4:
        return "Likely Present"
    elif confidence >= 0.1:
        return "Uncertain"
    else:
        return "Likely Missing"


def get_item_confidence(
    rfid_uid: str,
    decay_factor: float = 30.0,
    use_frequency_boost: bool = True,
) -> dict:
    """
    Calculate confidence for an item by its RFID UID.
    
    Args:
        rfid_uid: RFID UID of the item
        decay_factor: Decay factor in minutes (default: 30)
        use_frequency_boost: Whether to use frequency boost (default: True)
    
    Returns:
        Dictionary with:
            - confidence: float (0.0 to 1.0)
            - status: str (human-readable status)
            - minutes_since_last_scan: float
            - scan_count_last_hour: int
            - last_scan_at: str (ISO format) or None
    """
    conn = get_db_connection()
    if not conn:
        return {
            "confidence": 0.0,
            "status": "Likely Missing",
            "minutes_since_last_scan": None,
            "scan_count_last_hour": 0,
            "last_scan_at": None,
            "error": "Database connection failed",
        }

    try:
        with conn.cursor(row_factory=dict_row) as cur:
            # Get the latest successful scan
            cur.execute("""
                SELECT scanned_at
                FROM rfid_scan_logs
                WHERE rfid_uid = %s
                  AND scan_status IN ('OK', 'UNKNOWN')
                ORDER BY scanned_at DESC
                LIMIT 1
            """, (rfid_uid,))
            latest_scan = cur.fetchone()

            # Count successful scans in the last hour
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            cur.execute("""
                SELECT COUNT(*) as count
                FROM rfid_scan_logs
                WHERE rfid_uid = %s
                  AND scan_status IN ('OK', 'UNKNOWN')
                  AND scanned_at >= %s
            """, (rfid_uid, one_hour_ago))
            recent_scans_result = cur.fetchone()
            scan_count_last_hour = recent_scans_result["count"] if recent_scans_result else 0

        if not latest_scan or not latest_scan.get("scanned_at"):
            # No scans found - very low confidence
            return {
                "confidence": 0.0,
                "status": "Likely Missing",
                "minutes_since_last_scan": None,
                "scan_count_last_hour": scan_count_last_hour,
                "last_scan_at": None,
            }

        last_scan_at = latest_scan["scanned_at"]
        if isinstance(last_scan_at, str):
            last_scan_dt = datetime.fromisoformat(last_scan_at.replace("Z", "+00:00"))
        else:
            last_scan_dt = last_scan_at

        # Calculate minutes since last scan
        now = datetime.utcnow()
        if last_scan_dt.tzinfo:
            now = datetime.now(last_scan_dt.tzinfo)
        delta = now - last_scan_dt
        minutes_since_last_scan = delta.total_seconds() / 60.0

        # Calculate confidence
        confidence = calculate_confidence(
            minutes_since_last_scan,
            scan_count_last_hour,
            decay_factor,
            use_frequency_boost,
        )

        status = get_confidence_status(confidence)

        return {
            "confidence": round(confidence, 3),  # Round to 3 decimal places
            "status": status,
            "minutes_since_last_scan": round(minutes_since_last_scan, 1),
            "scan_count_last_hour": scan_count_last_hour,
            "last_scan_at": last_scan_at.isoformat() if hasattr(last_scan_at, "isoformat") else str(last_scan_at),
        }

    except Exception as e:
        print(f"Error calculating confidence for RFID {rfid_uid}: {e}")
        return {
            "confidence": 0.0,
            "status": "Likely Missing",
            "minutes_since_last_scan": None,
            "scan_count_last_hour": 0,
            "last_scan_at": None,
            "error": str(e),
        }
    finally:
        conn.close()


def get_items_with_confidence(
    item_ids: list[int] = None,
    rfid_uids: list[str] = None,
    decay_factor: float = 30.0,
    use_frequency_boost: bool = True,
) -> dict:
    """
    Get confidence scores for multiple items.
    
    Args:
        item_ids: List of inventory item IDs (optional)
        rfid_uids: List of RFID UIDs (optional)
        decay_factor: Decay factor in minutes (default: 30)
        use_frequency_boost: Whether to use frequency boost (default: True)
    
    Returns:
        Dictionary mapping rfid_uid -> confidence dict
    """
    conn = get_db_connection()
    if not conn:
        return {}

    try:
        with conn.cursor(row_factory=dict_row) as cur:
            # Get items with RFID UIDs
            if item_ids:
                cur.execute("""
                    SELECT id, rfid_uid
                    FROM inventory_items
                    WHERE id = ANY(%s) AND rfid_uid IS NOT NULL
                """, (item_ids,))
            elif rfid_uids:
                cur.execute("""
                    SELECT id, rfid_uid
                    FROM inventory_items
                    WHERE rfid_uid = ANY(%s)
                """, (rfid_uids,))
            else:
                cur.execute("""
                    SELECT id, rfid_uid
                    FROM inventory_items
                    WHERE rfid_uid IS NOT NULL
                """)
            items = cur.fetchall()

        results = {}
        for item in items:
            rfid_uid = item["rfid_uid"]
            if rfid_uid:
                results[rfid_uid] = get_item_confidence(
                    rfid_uid, decay_factor, use_frequency_boost
                )

        return results

    except Exception as e:
        print(f"Error getting items with confidence: {e}")
        return {}
    finally:
        conn.close()
