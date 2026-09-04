from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# --- Auth ---
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    username: str = ""
    message: str = ""


# --- Orders ---
class OrderCreate(BaseModel):
    customer_name: str
    phone: str = ""
    item_desc: str
    qty: int = 1
    price: float = 0.0
    deadline: str = ""


class OrderOut(BaseModel):
    id: int
    customer_name: str
    phone: str
    item_desc: str
    qty: int
    price: float
    stage: int
    deadline: str
    payment_status: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class CompletedOrderOut(BaseModel):
    id: int
    customer_name: str
    phone: str
    item_desc: str
    qty: int
    price: float
    deadline: str
    payment_status: str
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- Waiting List ---
class WaitingCreate(BaseModel):
    customer_name: str
    phone: str = ""
    item_desc: str
    notes: str = ""


class WaitingOut(BaseModel):
    id: int
    customer_name: str
    phone: str
    item_desc: str
    notes: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- Todos ---
class TodoCreate(BaseModel):
    title: str
    category: str = "Calculator"
    priority: str = "medium"
    notes: str = ""


class TodoUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    is_done: Optional[int] = None
    notes: Optional[str] = None


class TodoOut(BaseModel):
    id: int
    title: str
    category: str
    priority: str
    is_done: int
    notes: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- Expenses ---
class ExpenseCreate(BaseModel):
    amount: float
    category: str
    date: str
    notes: str = ""


class ExpenseOut(BaseModel):
    id: int
    amount: float
    category: str
    date: str
    notes: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- Dashboard ---
class DashboardStats(BaseModel):
    total_revenue: float
    total_expenses: float
    net_profit: float
    completed_count: int
    avg_margin: float


# --- Calculator Formula Config ---
class FormulaConfigSchema(BaseModel):
    filament_cost_per_g: float = 1.2
    machine_hourly_rate: float = 25.0
    electricity_hourly_rate: float = 8.0
    failure_margin_pct: float = 10.0
    markup_multiplier: float = 2.5
    purge_waste_grams_per_color: float = 15.0
    color_swap_fee: float = 30.0
    color_swap_time_pct: float = 10.0

    model_config = {"from_attributes": True}


# --- Products Catalog ---
class ProductCreate(BaseModel):
    name: str
    price: float = 0.0


class ProductOut(BaseModel):
    id: int
    name: str
    price: float
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- Filament Spools ---
class FilamentCreate(BaseModel):
    name: str
    material: str = "PLA"
    color_name: str = "Black"
    color_hex: str = "#3b82f6"
    remaining_grams: float = 1000.0
    total_grams: float = 1000.0
    cost_per_kg: float = 1200.0


class FilamentDeduct(BaseModel):
    grams: float
    reason: str = "Usage / Waste"


class FilamentOut(BaseModel):
    id: int
    name: str
    material: str
    color_name: str
    color_hex: str
    remaining_grams: float
    total_grams: float
    cost_per_kg: float
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

