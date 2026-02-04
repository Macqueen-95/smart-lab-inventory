#!/usr/bin/env python3
"""
Database migration script
Run this to add lend/borrow and profile features
"""
from auth import get_db_connection

def run_migrations():
    conn = get_db_connection()
    if not conn:
        print("❌ Failed to connect to database")
        return
    
    try:
        cur = conn.cursor()
        
        # Add columns to users table
        print("1. Adding profile_picture_url to users...")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT")
        
        print("2. Adding user_rfid_uid to users...")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS user_rfid_uid VARCHAR(100) UNIQUE")
        
        # Create lend_borrow table
        print("3. Creating lend_borrow table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS lend_borrow (
                id SERIAL PRIMARY KEY,
                item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
                rfid_uid VARCHAR(100) NOT NULL,
                user_rfid_uid VARCHAR(100),
                userid VARCHAR(50) REFERENCES users(userid),
                out_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                in_datetime TIMESTAMP,
                status VARCHAR(20) DEFAULT 'OUT',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes
        print("4. Creating indexes...")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_lend_borrow_status ON lend_borrow(status)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_lend_borrow_user ON lend_borrow(userid)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_lend_borrow_rfid ON lend_borrow(rfid_uid)")
        
        conn.commit()
        print("\n✅ All migrations completed successfully!")
        
        # Verify
        print("\nVerifying...")
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('profile_picture_url', 'user_rfid_uid')")
        user_cols = [row[0] for row in cur.fetchall()]
        print(f"  Users new columns: {user_cols}")
        
        cur.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'lend_borrow'")
        lb_exists = cur.fetchone()[0]
        print(f"  Lend/borrow table exists: {lb_exists == 1}")
        
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    run_migrations()
