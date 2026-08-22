import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.db.session import engine

def migrate():
    try:
        with engine.begin() as conn:
            print("Adding risk_level, take_profit, stop_loss, tp_triggered, sl_triggered to portfolio table...")
            conn.execute(text("ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20);"))
            conn.execute(text("ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS take_profit NUMERIC(10,2);"))
            conn.execute(text("ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS stop_loss NUMERIC(10,2);"))
            conn.execute(text("ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS tp_triggered BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS sl_triggered BOOLEAN DEFAULT FALSE;"))
            print("Migration successful.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
