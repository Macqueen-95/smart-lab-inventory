#!/usr/bin/env python
"""Test script for receive_item_from_service"""

from serviceandrepair import receive_item_from_service
from auth import get_db_connection
from psycopg.rows import dict_row

# Get an item from service
conn = get_db_connection()
with conn.cursor(row_factory=dict_row) as cur:
    cur.execute('SELECT rfid_uid FROM service LIMIT 1')
    service = cur.fetchone()
    if service:
        rfid_uid = service['rfid_uid']
        print(f"Testing with RFID: {rfid_uid}")
        
        # Get the item ID
        cur.execute('SELECT id FROM inventory_items WHERE rfid_uid = %s', (rfid_uid,))
        item = cur.fetchone()
        if item:
            item_id = item['id']
            print(f"Item ID: {item_id}")
conn.close()

# Now test receive
try:
    result = receive_item_from_service(item_id)
    print(f"✅ Result: {result}")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
