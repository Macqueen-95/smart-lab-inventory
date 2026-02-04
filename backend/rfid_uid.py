"""
RFID UID management and scanning logic
Handles RFID UID assignment to items and scan event logging
"""

from db_management import assign_rfid_to_item, get_item_by_rfid, log_rfid_scan


def process_rfid_scan(rfid_uid: str, scanner_id: str):
    """
    Process an incoming RFID scan from a scanner device.
    
    Returns:
    {
        "success": bool,
        "status": "OK" or "UNKNOWN",
        "message": str,
        "item": dict (if found) or None,
        "rfid_uid": str
    }
    """
    if not rfid_uid or not scanner_id:
        return {
            "success": False,
            "status": "ERROR",
            "message": "RFID UID and scanner ID are required",
            "rfid_uid": rfid_uid
        }
    
    # Search for item by RFID UID
    item = get_item_by_rfid(rfid_uid)
    
    if item:
        # RFID UID found - Log as SUCCESS
        log_rfid_scan(
            rfid_uid=rfid_uid,
            scanner_id=scanner_id,
            scan_status="OK",
            item_name=item.get("item_name"),
            room=item.get("room_name")
        )
        
        return {
            "success": True,
            "status": "OK",
            "message": f"Item found: {item['item_name']} in {item['room_name']}",
            "item": item,
            "rfid_uid": rfid_uid
        }
    else:
        # RFID UID not found - Log as UNKNOWN
        log_rfid_scan(
            rfid_uid=rfid_uid,
            scanner_id=scanner_id,
            scan_status="UNKNOWN",
            item_name=None,
            room=None
        )
        
        return {
            "success": False,
            "status": "UNKNOWN",
            "message": f"RFID UID not found in database: {rfid_uid}",
            "item": None,
            "rfid_uid": rfid_uid
        }


def assign_rfid_uid_to_item(item_id: int, rfid_uid: str, user_id: int):
    """
    Assign a new RFID UID to an inventory item.
    
    Returns:
    {
        "success": bool,
        "message": str,
        "item": dict or None
    }
    """
    if not rfid_uid or not item_id or not user_id:
        return {
            "success": False,
            "message": "Item ID, RFID UID, and User ID are required"
        }
    
    result = assign_rfid_to_item(item_id, rfid_uid, user_id)
    return result
