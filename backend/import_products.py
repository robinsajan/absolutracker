import json
from datetime import datetime
from database import SessionLocal
from models import Product

raw_items = [
    {"idx": 0, "id": "thing-001", "name": "BlockIcon: Jesus", "price": 199.0, "created_at": "2026-06-08 12:26:17.693848"},
    {"idx": 1, "id": "thing-002", "name": "Project Hail Mary: Rocky", "price": 499.0, "created_at": "2026-06-08 12:26:18.052602"},
    {"idx": 2, "id": "thing-003", "name": "Monitor buddy: Toothless", "price": 99.0, "created_at": "2026-06-13 18:13:02.47618"},
    {"idx": 3, "id": "thing-004", "name": "Cable Binder", "price": 159.0, "created_at": "2026-06-13 18:13:02.844572"},
    {"idx": 4, "id": "thing-005", "name": "Monkey D luffy: 2D shillouete", "price": 209.0, "created_at": "2026-06-13 18:13:03.218995"},
    {"idx": 5, "id": "thing-006", "name": "Batman (chibi edition)", "price": 299.0, "created_at": "2026-07-09 05:38:29.190596"},
    {"idx": 6, "id": "thing-007", "name": "7 Mood Cats", "price": 389.0, "created_at": "2026-07-13 03:51:59.514583"},
    {"idx": 7, "id": "thing-008", "name": "Meccha Chamelon", "price": 330.0, "created_at": "2026-07-16 11:05:55.271953"},
    {"idx": 8, "id": "thing-009", "name": "Japanese Lamp", "price": 659.0, "created_at": "2026-07-25 10:51:48.591104"},
    {"idx": 9, "id": "thing-010", "name": "Jesus Light Sculpture Lamp", "price": 999.0, "created_at": "2026-08-08 08:51:34.415462"},
    {"idx": 10, "id": "thing-011", "name": "Manchester United Keychain", "price": 199.0, "created_at": "2026-08-29 08:12:16.960393"}
]

db = SessionLocal()
added = []

for item in raw_items:
    name = item['name']
    price = float(item['price'])
    created_at_str = item.get('created_at')
    dt = None
    if created_at_str:
        for fmt in ('%Y-%m-%d %H:%M:%S.%f', '%Y-%m-%d %H:%M:%S'):
            try:
                dt = datetime.strptime(created_at_str, fmt)
                break
            except ValueError:
                pass
    
    prod = db.query(Product).filter(Product.name == name).first()
    if not prod:
        prod = Product(name=name, price=price, created_at=dt or datetime.utcnow())
        db.add(prod)
        added.append((name, price))
    else:
        prod.price = price
        if dt:
            prod.created_at = dt

db.commit()
print(f'Processed {len(raw_items)} products. Added {len(added)} new products:')
for name, price in added:
    print(f'  - {name} : Rs. {price}')

all_products = db.query(Product).order_by(Product.name.asc()).all()
print(f'Total products in catalog: {len(all_products)}')
for p in all_products:
    print(f'  #{p.id} {p.name} -> Rs. {p.price}')
db.close()
