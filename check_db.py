import sqlite3
conn = sqlite3.connect('restro.db')
tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print('Tables:', [t[0] for t in tables])
try:
    users = conn.execute('SELECT username, role FROM users').fetchall()
    print('Users:', users)
except Exception as e:
    print('No users table:', e)
try:
    staff = conn.execute('SELECT COUNT(*) FROM staff_members').fetchone()
    print('Staff count:', staff[0])
except Exception as e:
    print('No staff_members:', e)
conn.close()
