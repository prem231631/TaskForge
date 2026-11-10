from sqlalchemy import text
from app.db.session import engine

with engine.connect() as connection:
    rows = connection.execute(text("""
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'users'
    """)).fetchall()

    print("Indexes found:", len(rows))

    for row in rows:
        print(f"\nName: {row.indexname}")
        print(f"Definition: {row.indexdef}")

    email_info = connection.execute(text("""
        SELECT
            COUNT(*) AS total_users,
            COUNT(email) AS non_null_emails,
            COUNT(DISTINCT lower(email)) AS unique_emails
        FROM users
    """)).one()

    print("\nUser statistics:", email_info)
