import getpass
import time

from sqlalchemy import select
from app.db.session import SessionLocal
from app.models import User
from app.core.security import verify_password

email = input("Account email: ").strip().lower()
password = getpass.getpass("Account password (hidden): ")

db = SessionLocal()

try:
    start = time.perf_counter()
    user = db.scalar(select(User).where(User.email == email))
    print(f"Database lookup: {time.perf_counter() - start:.3f} seconds")

    if user is None:
        print("No matching account.")
    else:
        start = time.perf_counter()
        result = verify_password(password, user.hashed_password)
        print(f"Password verification: {time.perf_counter() - start:.3f} seconds")
        print(f"Password verification result: {result}")
        print(f"Account active: {user.is_active}")
        print(f"Email verified: {user.is_verified}")
finally:
    db.close()
