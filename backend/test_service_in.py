#!/usr/bin/env python
"""Test the complete service in flow"""

from auth import get_db_connection
from serviceandrepair import get_items_out_for_service, receive_item_from_service, get_item_by_rfid_for_service
from psycopg.rows import dict_row

print("\n=== TESTING SERVICE IN FLOW ===\n")

# Step 1: Get items currently out for service
print("Step 1: Get items out for service")
out_items = get_items_out_for_service()
print(f"  Found {len(out_items)} items out for service")
for item in out_items:
    print(f"    - {item['item_name']} ({item['rfid_uid']}) item_id={item['item_id']}")

if not out_items:
    print("  ❌ No items out for service to test with")
    exit(1)

# Step 2: Pick first item and get it by RFID
test_item = out_items[0]
test_rfid = test_item['rfid_uid']
print(f"\nStep 2: Get item by RFID ({test_rfid})")
item_by_rfid = get_item_by_rfid_for_service(test_rfid)
if item_by_rfid:
    print(f"  ✅ Found: {item_by_rfid}")
else:
    print(f"  ❌ Item not found by RFID")
    exit(1)

# Step 3: Try to receive the item
print(f"\nStep 3: Receive item from service")
item_id = item_by_rfid['id']
print(f"  Using item_id={item_id}")
try:
    result = receive_item_from_service(item_id)
    if result:
        print(f"  ✅ Success: {result}")
    else:
        print(f"  ❌ Failed: Function returned False")
except Exception as e:
    print(f"  ❌ Exception: {e}")
    import traceback
    traceback.print_exc()

# Step 4: Verify item was removed from service
print(f"\nStep 4: Verify item removed from service")
out_items_after = get_items_out_for_service()
remaining = [i for i in out_items_after if i['rfid_uid'] == test_rfid]
if remaining:
    print(f"  ❌ Item still in service: {remaining}")
else:
    print(f"  ✅ Item successfully removed from service")
    print(f"  Items remaining: {len(out_items_after)}")

print("\n=== TEST COMPLETE ===\n")
