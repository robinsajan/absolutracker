"""
Migration script to safely migrate all data from local SQLite (absolut.db) to Supabase PostgreSQL.
"""
import os
import sqlite3
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from database import Base, engine as pg_engine
from models import Order, CompletedOrder, WaitingItem, TodoItem, Expense, FormulaConfig, Product, FilamentSpool

load_dotenv()

SQLITE_PATH = os.path.join(os.path.dirname(__file__), "absolut.db")

def parse_dt(dt_val):
    if not dt_val:
        return None
    if isinstance(dt_val, datetime):
        return dt_val
    for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(str(dt_val), fmt)
        except ValueError:
            pass
    return None

def migrate():
    if not os.path.exists(SQLITE_PATH):
        print(f"No local SQLite database found at {SQLITE_PATH}. Skipping data migration.")
        return

    print("1. Creating tables in PostgreSQL/Supabase if they don't exist...")
    Base.metadata.create_all(bind=pg_engine)
    print("   Tables verified.")

    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    PgSession = sessionmaker(bind=pg_engine)
    pg_db = PgSession()

    try:
        # 1. FormulaConfig
        sqlite_cur.execute("SELECT * FROM formula_config")
        rows = sqlite_cur.fetchall()
        for r in rows:
            existing = pg_db.query(FormulaConfig).filter(FormulaConfig.id == r["id"]).first()
            if not existing:
                cfg = FormulaConfig(
                    id=r["id"],
                    filament_cost_per_g=r["filament_cost_per_g"],
                    machine_hourly_rate=r["machine_hourly_rate"],
                    electricity_hourly_rate=r["electricity_hourly_rate"],
                    failure_margin_pct=r["failure_margin_pct"],
                    markup_multiplier=r["markup_multiplier"],
                    purge_waste_grams_per_color=r["purge_waste_grams_per_color"],
                    color_swap_fee=r["color_swap_fee"],
                    color_swap_time_pct=r["color_swap_time_pct"],
                    updated_at=parse_dt(r["updated_at"]),
                )
                pg_db.add(cfg)
        pg_db.commit()
        print(f"   Migrated formula_config ({len(rows)} rows).")

        # 2. Products
        sqlite_cur.execute("SELECT * FROM products")
        rows = sqlite_cur.fetchall()
        for r in rows:
            existing = pg_db.query(Product).filter(Product.id == r["id"]).first()
            if not existing:
                p = Product(
                    id=r["id"],
                    name=r["name"],
                    price=r["price"],
                    created_at=parse_dt(r["created_at"]),
                )
                pg_db.add(p)
        pg_db.commit()
        print(f"   Migrated products ({len(rows)} rows).")

        # 3. FilamentSpool
        sqlite_cur.execute("SELECT * FROM filament_spools")
        rows = sqlite_cur.fetchall()
        for r in rows:
            existing = pg_db.query(FilamentSpool).filter(FilamentSpool.id == r["id"]).first()
            if not existing:
                fs = FilamentSpool(
                    id=r["id"],
                    name=r["name"],
                    material=r["material"],
                    color_name=r["color_name"],
                    color_hex=r["color_hex"],
                    remaining_grams=r["remaining_grams"],
                    total_grams=r["total_grams"],
                    cost_per_kg=r["cost_per_kg"],
                    created_at=parse_dt(r["created_at"]),
                )
                pg_db.add(fs)
        pg_db.commit()
        print(f"   Migrated filament_spools ({len(rows)} rows).")

        # 4. Expenses
        sqlite_cur.execute("SELECT * FROM expenses")
        rows = sqlite_cur.fetchall()
        for r in rows:
            existing = pg_db.query(Expense).filter(Expense.id == r["id"]).first()
            if not existing:
                exp = Expense(
                    id=r["id"],
                    amount=r["amount"],
                    category=r["category"],
                    date=r["date"],
                    notes=r["notes"] or "",
                    created_at=parse_dt(r["created_at"]),
                )
                pg_db.add(exp)
        pg_db.commit()
        print(f"   Migrated expenses ({len(rows)} rows).")

        # 5. Orders
        sqlite_cur.execute("SELECT * FROM orders")
        rows = sqlite_cur.fetchall()
        for r in rows:
            existing = pg_db.query(Order).filter(Order.id == r["id"]).first()
            if not existing:
                ord = Order(
                    id=r["id"],
                    customer_name=r["customer_name"],
                    phone=r["phone"] or "",
                    item_desc=r["item_desc"],
                    qty=r["qty"],
                    price=r["price"],
                    stage=r["stage"],
                    deadline=r["deadline"] or "",
                    payment_status=r["payment_status"] or "pending",
                    created_at=parse_dt(r["created_at"]),
                )
                pg_db.add(ord)
        pg_db.commit()
        print(f"   Migrated active orders ({len(rows)} rows).")

        # 6. Completed Orders
        sqlite_cur.execute("SELECT * FROM completed_orders")
        rows = sqlite_cur.fetchall()
        for r in rows:
            existing = pg_db.query(CompletedOrder).filter(CompletedOrder.id == r["id"]).first()
            if not existing:
                cord = CompletedOrder(
                    id=r["id"],
                    customer_name=r["customer_name"],
                    phone=r["phone"] or "",
                    item_desc=r["item_desc"],
                    qty=r["qty"],
                    price=r["price"],
                    deadline=r["deadline"] or "",
                    payment_status=r["payment_status"] or "paid",
                    created_at=parse_dt(r["created_at"]),
                    completed_at=parse_dt(r["completed_at"]),
                )
                pg_db.add(cord)
        pg_db.commit()
        print(f"   Migrated completed_orders ({len(rows)} rows).")

        # 7. Waiting List
        sqlite_cur.execute("SELECT * FROM waiting_list")
        rows = sqlite_cur.fetchall()
        for r in rows:
            existing = pg_db.query(WaitingItem).filter(WaitingItem.id == r["id"]).first()
            if not existing:
                wi = WaitingItem(
                    id=r["id"],
                    customer_name=r["customer_name"],
                    phone=r["phone"] or "",
                    item_desc=r["item_desc"],
                    notes=r["notes"] or "",
                    created_at=parse_dt(r["created_at"]),
                )
                pg_db.add(wi)
        pg_db.commit()
        print(f"   Migrated waiting_list ({len(rows)} rows).")

        # 8. Todos
        sqlite_cur.execute("SELECT * FROM todos")
        rows = sqlite_cur.fetchall()
        for r in rows:
            existing = pg_db.query(TodoItem).filter(TodoItem.id == r["id"]).first()
            if not existing:
                td = TodoItem(
                    id=r["id"],
                    title=r["title"],
                    category=r["category"],
                    priority=r["priority"],
                    is_done=r["is_done"],
                    notes=r["notes"] or "",
                    created_at=parse_dt(r["created_at"]),
                )
                pg_db.add(td)
        pg_db.commit()
        print(f"   Migrated todos ({len(rows)} rows).")

        # Fix PostgreSQL auto-increment sequences so subsequent inserts don't collide with existing IDs
        tables = [
            "orders", "completed_orders", "waiting_list",
            "expenses", "todos", "formula_config",
            "products", "filament_spools"
        ]
        with pg_engine.connect() as conn:
            for t in tables:
                seq_query = text(f"SELECT setval(pg_get_serial_sequence('{t}', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM {t};")
                try:
                    conn.execute(seq_query)
                    conn.commit()
                except Exception as seq_err:
                    print(f"   Sequence update warning for {t}: {seq_err}")

        print("\nAll data migrated to Supabase PostgreSQL successfully!")

    finally:
        sqlite_conn.close()
        pg_db.close()

if __name__ == "__main__":
    migrate()
