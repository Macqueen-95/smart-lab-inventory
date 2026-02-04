# Database Changes Required

Run these SQL commands in your PostgreSQL database:

## 1. Add profile picture and RFID to users table

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
ADD COLUMN IF NOT EXISTS user_rfid_uid VARCHAR(100) UNIQUE;
```

## 2. Create lend_borrow table (similar to service table)

```sql
CREATE TABLE IF NOT EXISTS lend_borrow (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
    rfid_uid VARCHAR(100) NOT NULL,
    user_rfid_uid VARCHAR(100) REFERENCES users(user_rfid_uid),
    userid VARCHAR(50) REFERENCES users(userid),
    out_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    in_datetime TIMESTAMP,
    status VARCHAR(20) DEFAULT 'OUT' CHECK (status IN ('OUT', 'RETURNED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lend_borrow_status ON lend_borrow(status);
CREATE INDEX IF NOT EXISTS idx_lend_borrow_user ON lend_borrow(userid);
CREATE INDEX IF NOT EXISTS idx_lend_borrow_rfid ON lend_borrow(rfid_uid);
```

## 3. Add delete cascade to rooms/floor_plans (optional for safety)

```sql
-- Already exists, but verify:
-- rooms table should have: floor_plan_id INTEGER REFERENCES floor_plans(id) ON DELETE CASCADE
-- inventory_items should have: room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE
```

## Summary
- Users can now have profile pictures and RFID tags
- Lend/borrow tracking works like service & repair
- Delete cascades handle cleanup when deleting rooms/floor plans
