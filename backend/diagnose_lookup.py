import time
from sqlalchemy import select
from app.db.session import SessionLocal
from app.models import User

email = input("Account email: ").strip().lower()

with SessionLocal() as db:
    for attempt in range(1, 6):
        start = time.perf_counter()

        user = db.scalar(
            select(User).where(User.email == email)
        )

        elapsed = time.perf_counter() - start

        print(
            f"Attempt {attempt}: {elapsed:.3f}s | "
            f"User found: {user is not None}"
        )
