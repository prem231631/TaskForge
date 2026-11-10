from sqlalchemy import create_engine, text
from app.db.session import engine
import time

url = engine.url.set(host="127.0.0.1")

test_engine = create_engine(url, pool_pre_ping=True)

try:
    for attempt in range(1, 4):
        start = time.perf_counter()

        with test_engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        elapsed = time.perf_counter() - start
        print(f"IPv4 attempt {attempt}: {elapsed:.3f} seconds")
finally:
    test_engine.dispose()
