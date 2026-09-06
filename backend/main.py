import json
import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func as sql_func
from sqlalchemy.orm import Session

load_dotenv()


from database import get_db, init_db, SessionLocal
from models import Order, CompletedOrder, WaitingItem, TodoItem, Expense, FormulaConfig, Product, FilamentSpool
from schemas import (
    LoginRequest, LoginResponse,
    OrderCreate, OrderOut, CompletedOrderOut,
    WaitingCreate, WaitingOut,
    TodoCreate, TodoUpdate, TodoOut,
    ExpenseCreate, ExpenseOut,
    DashboardStats,
    FormulaConfigSchema,
    ProductCreate, ProductOut,
    FilamentCreate, FilamentDeduct, FilamentOut,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Seed default products if table is empty
    db = SessionLocal()
    try:
        if db.query(Product).count() == 0:
            defaults = [
                Product(name="Phone Stand / Desk Holder", price=350.0),
                Product(name="Articulated Dragon (Multi-Color)", price=750.0),
                Product(name="Custom Electronic Enclosure", price=480.0),
                Product(name="Lithophane Night Lamp", price=1200.0),
                Product(name="Keychain / Fidget Spinner", price=150.0),
                Product(name="Headphone Desk Hanger", price=320.0),
            ]
            db.add_all(defaults)
            db.commit()

    except Exception as e:
        print("Error initializing data:", e)
    finally:
        db.close()
    yield

app = FastAPI(title="AbsoluTracker API", lifespan=lifespan)

# Load CORS origins
raw_origins = os.getenv("FRONTEND_URL", "*")
if raw_origins and raw_origins != "*":
    origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
    origins.extend(["http://localhost:3000", "http://127.0.0.1:3000"])
    origins = list(set(origins))
else:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load users from .env

def get_auth_users() -> dict:
    raw = os.getenv("APP_USERS")
    if raw:
        try:
            return json.loads(raw)
        except Exception:
            pass
    return {
        "robinsajan4": "hakabak@13245@bak",
        "jasonjohnson": "hakabak@13245@bak",
    }

USERS = get_auth_users()


STAGE_NAMES = {1: "Designed", 2: "Printed", 3: "Packed", 4: "Delivered", 5: "Payment"}


# ──────────────────────────── AUTH ────────────────────────────


@app.post("/auth/login", response_model=LoginResponse)
def login(req: LoginRequest):
    if req.username in USERS and USERS[req.username] == req.password:
        return LoginResponse(success=True, username=req.username)
    raise HTTPException(status_code=401, detail="Invalid credentials")


# ──────────────────────────── ORDERS ────────────────────────────


@app.get("/orders", response_model=List[OrderOut])
def get_orders(db: Session = Depends(get_db)):
    return db.query(Order).order_by(Order.created_at.desc()).all()


@app.post("/orders", response_model=OrderOut)
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    db_order = Order(**order.model_dump())
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order


@app.patch("/orders/{order_id}/stage", response_model=OrderOut)
def advance_stage(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.stage >= 6:
        raise HTTPException(status_code=400, detail="Order already at final stage")
    order.stage += 1
    db.commit()
    db.refresh(order)
    return order


@app.patch("/orders/{order_id}/revert", response_model=OrderOut)
def revert_stage(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.stage <= 1:
        raise HTTPException(status_code=400, detail="Order already at first stage")
    order.stage -= 1
    db.commit()
    db.refresh(order)
    return order


@app.post("/orders/{order_id}/complete", response_model=CompletedOrderOut)
def complete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    completed = CompletedOrder(
        customer_name=order.customer_name,
        phone=order.phone,
        item_desc=order.item_desc,
        qty=order.qty,
        price=order.price,
        deadline=order.deadline,
        payment_status="paid",
        created_at=order.created_at,
    )
    db.add(completed)
    db.delete(order)
    db.commit()
    db.refresh(completed)
    return completed


@app.delete("/orders/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()
    return {"detail": "deleted"}


# ──────────────────────────── COMPLETED ────────────────────────────


@app.get("/completed", response_model=List[CompletedOrderOut])
def get_completed(db: Session = Depends(get_db)):
    return db.query(CompletedOrder).order_by(CompletedOrder.completed_at.desc()).all()


# ──────────────────────────── WAITING LIST ────────────────────────────


@app.get("/waiting", response_model=List[WaitingOut])
def get_waiting(db: Session = Depends(get_db)):
    return db.query(WaitingItem).order_by(WaitingItem.created_at.desc()).all()


@app.post("/waiting", response_model=WaitingOut)
def add_waiting(item: WaitingCreate, db: Session = Depends(get_db)):
    db_item = WaitingItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.delete("/waiting/{item_id}")
def delete_waiting(item_id: int, db: Session = Depends(get_db)):
    item = db.query(WaitingItem).filter(WaitingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"detail": "deleted"}


@app.post("/waiting/{item_id}/promote", response_model=OrderOut)
def promote_waiting(item_id: int, db: Session = Depends(get_db)):
    item = db.query(WaitingItem).filter(WaitingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    order = Order(
        customer_name=item.customer_name,
        phone=item.phone,
        item_desc=item.item_desc,
        qty=1,
        price=0.0,
        stage=1,
    )
    db.add(order)
    db.delete(item)
    db.commit()
    db.refresh(order)
    return order


# ──────────────────────────── TODOS (WAITING / TODO LIST) ────────────────────────────


@app.get("/todos", response_model=List[TodoOut])
def get_todos(db: Session = Depends(get_db)):
    return db.query(TodoItem).order_by(TodoItem.is_done.asc(), TodoItem.created_at.desc()).all()


@app.post("/todos", response_model=TodoOut)
def add_todo(item: TodoCreate, db: Session = Depends(get_db)):
    db_item = TodoItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.patch("/todos/{todo_id}/toggle", response_model=TodoOut)
def toggle_todo(todo_id: int, db: Session = Depends(get_db)):
    item = db.query(TodoItem).filter(TodoItem.id == todo_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Todo not found")
    item.is_done = 1 if item.is_done == 0 else 0
    db.commit()
    db.refresh(item)
    return item


@app.delete("/todos/{todo_id}")
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    item = db.query(TodoItem).filter(TodoItem.id == todo_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Todo not found")
    db.delete(item)
    db.commit()
    return {"detail": "deleted"}


# ──────────────────────────── EXPENSES ────────────────────────────


@app.get("/expenses", response_model=List[ExpenseOut])
def get_expenses(db: Session = Depends(get_db)):
    return db.query(Expense).order_by(Expense.date.desc()).all()


@app.post("/expenses", response_model=ExpenseOut)
def add_expense(exp: ExpenseCreate, db: Session = Depends(get_db)):
    db_exp = Expense(**exp.model_dump())
    db.add(db_exp)
    db.commit()
    db.refresh(db_exp)
    return db_exp


@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    exp = db.query(Expense).filter(Expense.id == expense_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(exp)
    db.commit()
    return {"detail": "deleted"}


# ──────────────────────────── DASHBOARD ────────────────────────────


@app.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    revenue = db.query(sql_func.coalesce(sql_func.sum(CompletedOrder.price), 0)).scalar()
    expenses = db.query(sql_func.coalesce(sql_func.sum(Expense.amount), 0)).scalar()
    count = db.query(sql_func.count(CompletedOrder.id)).scalar()
    profit = revenue - expenses
    avg_margin = (profit / revenue * 100) if revenue > 0 else 0.0

    return DashboardStats(
        total_revenue=round(revenue, 2),
        total_expenses=round(expenses, 2),
        net_profit=round(profit, 2),
        completed_count=count,
        avg_margin=round(avg_margin, 1),
    )


# ──────────────────────────── CALCULATOR CONFIG ────────────────────────────


@app.get("/calculator/config", response_model=FormulaConfigSchema)
def get_calculator_config(db: Session = Depends(get_db)):
    config = db.query(FormulaConfig).first()
    if not config:
        config = FormulaConfig()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@app.post("/calculator/config", response_model=FormulaConfigSchema)
def save_calculator_config(new_config: FormulaConfigSchema, db: Session = Depends(get_db)):
    config = db.query(FormulaConfig).first()
    if not config:
        config = FormulaConfig(**new_config.model_dump())
        db.add(config)
    else:
        for key, val in new_config.model_dump().items():
            setattr(config, key, val)
    db.commit()
    db.refresh(config)
    return config


# ──────────────────────────── PRODUCTS CATALOG ────────────────────────────


@app.get("/products", response_model=List[ProductOut])
def get_products(db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.name.asc()).all()


@app.post("/products", response_model=ProductOut)
def create_product(prod: ProductCreate, db: Session = Depends(get_db)):
    db_prod = Product(**prod.model_dump())
    db.add(db_prod)
    db.commit()
    db.refresh(db_prod)
    return db_prod


@app.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(prod)
    db.commit()
    return {"detail": "deleted"}


# --- Filament Spools API ---
@app.get("/filaments", response_model=List[FilamentOut])
def get_filaments(db: Session = Depends(get_db)):
    return db.query(FilamentSpool).order_by(FilamentSpool.id.asc()).all()


@app.post("/filaments", response_model=FilamentOut)
def create_filament(spool: FilamentCreate, db: Session = Depends(get_db)):
    db_spool = FilamentSpool(**spool.model_dump())
    db.add(db_spool)

    # Automatically log spool purchase as an Expense
    cost = round((db_spool.total_grams / 1000.0) * db_spool.cost_per_kg, 2)
    today_str = datetime.now().strftime("%Y-%m-%d")
    expense = Expense(
        amount=cost,
        category="Filament / Materials",
        date=today_str,
        notes=f"Spool Purchase: {db_spool.name} ({db_spool.material}, {db_spool.color_name}, {db_spool.total_grams}g)",
    )
    db.add(expense)

    db.commit()
    db.refresh(db_spool)
    return db_spool


@app.post("/filaments/{spool_id}/deduct", response_model=FilamentOut)
def deduct_filament(spool_id: int, payload: FilamentDeduct, db: Session = Depends(get_db)):
    spool = db.query(FilamentSpool).filter(FilamentSpool.id == spool_id).first()
    if not spool:
        raise HTTPException(status_code=404, detail="Filament spool not found")
    
    # Deduct weight, ensure floor of 0
    new_remaining = max(0.0, spool.remaining_grams - payload.grams)
    spool.remaining_grams = new_remaining
    db.commit()
    db.refresh(spool)
    return spool


@app.delete("/filaments/{spool_id}")
def delete_filament(spool_id: int, db: Session = Depends(get_db)):
    spool = db.query(FilamentSpool).filter(FilamentSpool.id == spool_id).first()
    if not spool:
        raise HTTPException(status_code=404, detail="Filament spool not found")
    db.delete(spool)
    db.commit()
    return {"detail": "deleted"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

