import sqlite3
import json
import os
from datetime import datetime, timedelta

# Vercel's deployed source is read-only. Keep the demo database in writable
# temporary storage there; local development continues to use the project DB.
DB_PATH = (
    os.path.join("/tmp", "restro.db")
    if os.environ.get("VERCEL") == "1"
    else os.path.join(os.path.dirname(__file__), "restro.db")
)

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cur = conn.cursor()

    # Restaurant Profiles table
    cur.execute('''
    CREATE TABLE IF NOT EXISTS restaurants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        tagline TEXT,
        cuisine TEXT,
        city TEXT,
        address TEXT,
        contact_phone TEXT,
        contact_email TEXT,
        fssai_license TEXT,
        gstin TEXT,
        operating_status TEXT DEFAULT 'Open',
        kitchen_status TEXT DEFAULT 'Normal Pace',
        total_tables INTEGER DEFAULT 18,
        active_tables INTEGER DEFAULT 11,
        active_staff INTEGER DEFAULT 7,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Inventory Items with Wastage Guard metadata
    cur.execute('''
    CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        restaurant_id INTEGER DEFAULT 1,
        name TEXT NOT NULL,
        category TEXT, -- 'Dairy', 'Produce', 'Grain', 'Oil', 'Meat', 'Spice'
        unit TEXT, -- 'kg', 'litres', 'packets'
        current_stock REAL,
        min_safety_stock REAL,
        avg_daily_consumption REAL,
        cost_per_unit REAL,
        is_perishable BOOLEAN, -- Wastage Guard: True for paneer/cream, False for rice/oil
        shelf_life_days INTEGER,
        reorder_batch_size REAL,
        preferred_supplier TEXT,
        supplier_phone TEXT,
        days_in_stock INTEGER DEFAULT 0, -- Dead stock detection
        last_ordered_date TEXT
    )
    ''')

    # Menu Items with Recipe Linkage and Engineering Classification
    cur.execute('''
    CREATE TABLE IF NOT EXISTS menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        restaurant_id INTEGER DEFAULT 1,
        name TEXT NOT NULL,
        category TEXT,
        price REAL,
        cost_of_ingredients REAL,
        margin_percent REAL,
        units_sold_30d INTEGER,
        total_revenue_30d REAL,
        total_profit_30d REAL,
        bcg_classification TEXT, -- 'Star', 'Plow-horse', 'Puzzle', 'Dog'
        recommended_action TEXT,
        recipe_json TEXT, -- JSON mapping ingredients and quantities per dish
        image_url TEXT
    )
    ''')

    # Historical & Live Orders
    cur.execute('''
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        restaurant_id INTEGER DEFAULT 1,
        order_number TEXT,
        channel TEXT, -- 'Dine-In', 'Swiggy', 'Zomato'
        customer_name TEXT,
        items_json TEXT,
        total_amount REAL,
        commission_fee REAL,
        net_profit REAL,
        status TEXT, -- 'Preparing', 'Ready', 'Completed', 'Cancelled'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Wastage / Theft Anomalies
    cur.execute('''
    CREATE TABLE IF NOT EXISTS wastage_anomalies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        restaurant_id INTEGER DEFAULT 1,
        ingredient_name TEXT,
        expected_consumption REAL,
        actual_consumption REAL,
        variance_percent REAL,
        estimated_loss_inr REAL,
        severity TEXT, -- 'High', 'Medium', 'Low'
        reasoning TEXT,
        detected_date TEXT
    )
    ''')

    # Festival & Holiday Calendar
    cur.execute('''
    CREATE TABLE IF NOT EXISTS festival_calendar (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date_str TEXT,
        demand_factor REAL, -- e.g. 1.25 for +25%
        perishable_safety_multiplier REAL, -- e.g. 1.12
        category_boost_json TEXT, -- JSON map: e.g. {"Sweets": 1.45, "Dairy": 1.35, "Biryani": 1.25}
        reasoning_template TEXT
    )
    ''')

    # Purchase Orders
    cur.execute('''
    CREATE TABLE IF NOT EXISTS purchase_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        restaurant_id INTEGER DEFAULT 1,
        po_code TEXT,
        supplier_name TEXT,
        supplier_contact TEXT,
        items_json TEXT,
        total_cost REAL,
        status TEXT DEFAULT 'Draft', -- 'Draft', 'Approved', 'Dispatched', 'Received'
        reasoning_summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Users for Authentication
    cur.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'manager', -- 'admin', 'manager', 'kitchen'
        full_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Sessions / Auth tokens
    cur.execute('''
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    ''')

    # Staff Details & Work Progress
    cur.execute('''
    CREATE TABLE IF NOT EXISTS staff_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        restaurant_id INTEGER DEFAULT 1,
        name TEXT NOT NULL,
        role TEXT NOT NULL, -- 'Head Chef', 'Line Cook', 'Lead Steward', 'Expeditor', 'Cashier'
        shift TEXT DEFAULT 'Evening Shift',
        phone TEXT,
        status TEXT DEFAULT 'Active', -- 'Active', 'On Break', 'Off Duty'
        orders_handled INTEGER DEFAULT 0,
        efficiency_score INTEGER DEFAULT 95, -- percentage progress
        current_task TEXT DEFAULT 'Preparing Main Orders'
    )
    ''')

    # Invoices & Line items for Task 5
    cur.execute('''
    CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        restaurant_id INTEGER DEFAULT 1,
        invoice_number TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        invoice_date TEXT NOT NULL,
        subtotal REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        grand_total REAL DEFAULT 0,
        status TEXT DEFAULT 'Verified', -- 'Verified', 'Flagged', 'Draft'
        validation_flags_json TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    cur.execute('''
    CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        matched_stock_id INTEGER,
        quantity REAL NOT NULL,
        unit TEXT DEFAULT 'kg',
        unit_price REAL NOT NULL,
        line_total REAL NOT NULL,
        expected_price REAL,
        expected_qty REAL,
        flag_status TEXT DEFAULT 'OK', -- 'OK', 'Warning', 'Error'
        flag_message TEXT,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    )
    ''')

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
