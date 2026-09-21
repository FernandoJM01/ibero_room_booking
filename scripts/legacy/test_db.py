import psycopg2
import os

try:
    conn = psycopg2.connect(
        dbname="ibero_room_booking",
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres"),
        host="localhost"
    )
    cur = conn.cursor()
    cur.execute("SELECT * FROM reservations LIMIT 1")
    colnames = [desc[0] for desc in cur.description]
    print("Columns:", colnames)
    conn.close()
except Exception as e:
    print("Error:", e)
