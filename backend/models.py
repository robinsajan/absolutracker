from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(200), nullable=False)
    phone = Column(String(20), default="")
    item_desc = Column(String(500), nullable=False)
    qty = Column(Integer, default=1)
    price = Column(Float, default=0.0)
    stage = Column(Integer, default=1)  # 1=Ordered, 2=Designed, 3=Printed, 4=Packed, 5=Delivered, 6=Payment
    deadline = Column(String(20), default="")
    payment_status = Column(String(20), default="pending")  # pending / paid
    created_at = Column(DateTime, server_default=func.now())


class CompletedOrder(Base):
    __tablename__ = "completed_orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(200), nullable=False)
    phone = Column(String(20), default="")
    item_desc = Column(String(500), nullable=False)
    qty = Column(Integer, default=1)
    price = Column(Float, default=0.0)
    deadline = Column(String(20), default="")
    payment_status = Column(String(20), default="paid")
    created_at = Column(DateTime)
    completed_at = Column(DateTime, server_default=func.now())


class WaitingItem(Base):
    __tablename__ = "waiting_list"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(200), nullable=False)
    phone = Column(String(20), default="")
    item_desc = Column(String(500), nullable=False)
    notes = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())


class TodoItem(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    category = Column(String(100), default="General")  # e.g., Calculator, Orders, Features, Materials
    priority = Column(String(20), default="medium")    # low, medium, high
    is_done = Column(Integer, default=0)              # 0 = active, 1 = completed
    notes = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    category = Column(String(100), nullable=False)
    date = Column(String(20), nullable=False)
    notes = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())


class FormulaConfig(Base):
    __tablename__ = "formula_config"

    id = Column(Integer, primary_key=True, index=True)
    filament_cost_per_g = Column(Float, default=1.2)
    machine_hourly_rate = Column(Float, default=25.0)
    electricity_hourly_rate = Column(Float, default=8.0)
    failure_margin_pct = Column(Float, default=10.0)
    markup_multiplier = Column(Float, default=2.5)
    purge_waste_grams_per_color = Column(Float, default=15.0)
    color_swap_fee = Column(Float, default=30.0)
    color_swap_time_pct = Column(Float, default=10.0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(250), nullable=False)
    price = Column(Float, default=0.0)
    created_at = Column(DateTime, server_default=func.now())


class FilamentSpool(Base):
    __tablename__ = "filament_spools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(250), nullable=False)
    material = Column(String(50), default="PLA")  # PLA, PETG, ABS, TPU, ASA, etc.
    color_name = Column(String(100), default="Black")
    color_hex = Column(String(20), default="#3b82f6")
    remaining_grams = Column(Float, default=1000.0)
    total_grams = Column(Float, default=1000.0)
    cost_per_kg = Column(Float, default=1200.0)
    created_at = Column(DateTime, server_default=func.now())
