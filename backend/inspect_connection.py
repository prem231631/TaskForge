from sqlalchemy import text
from app.db.session import engine

print("SQLAlchemy pool class:", type(engine.pool).__name__)
print("Pool size:", engine.pool.size())
print("Checked out connections:", engine.pool.checkedout())

with engine.connect() as connection:
    print("\nPostgreSQL connection information:")

    rows = connection.execute(text("""
        SELECT
            version(),
            current_database(),
            current_user,
            inet_server_addr(),
            inet_server_port(),
            pg_backend_pid()
    """)).one()

    print("Database:", rows[1])
    print("Database user:", rows[2])
    print("Server address:", rows[3])
    print("Server port:", rows[4])
    print("Backend PID:", rows[5])

    print("\nConnection settings:")

    for setting in ["statement_timeout", "lock_timeout", "idle_in_transaction_session_timeout"]:
        value = connection.execute(
            text("SELECT current_setting(:setting)"),
            {"setting": setting}
        ).scalar()

        print(f"{setting}: {value}")
