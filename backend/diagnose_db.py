import time
from sqlalchemy import text, select
from app.db.session import engine
from app.models import User

def measure(label, operation):
    start = time.perf_counter()
    result = operation()
    print(f"{label}: {time.perf_counter() - start:.3f} seconds")
    return result

with engine.connect() as connection:
    measure("Database connection established", lambda: None)

    measure(
        "Simple SELECT 1",
        lambda: connection.execute(text("SELECT 1")).scalar()
    )

    measure(
        "User table query",
        lambda: connection.execute(
            select(User.id).limit(1)
        ).first()
    )

