-- إنشاء قاعدة بيانات نظام المحل
-- هذا الملف للمرجع فقط، الجداول يتم إنشاؤها تلقائياً في server.js

-- جدول الأصناف
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    size TEXT,
    color TEXT,
    purchase_price REAL NOT NULL,
    selling_price REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    min_quantity INTEGER DEFAULT 5,
    barcode TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول العملاء
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول المبيعات
CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    total_amount REAL NOT NULL,
    discount REAL DEFAULT 0,
    final_amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'نقدي',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers (id)
);

-- جدول تفاصيل المبيعات
CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales (id),
    FOREIGN KEY (product_id) REFERENCES products (id)
);



-- عدّل جدول المشتريات:
CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_name TEXT,
    invoice_number TEXT,
    purchase_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- احذف المرجع الخارجي من purchase_items إذا كان موجوداً
-- إدراج بيانات تجريبية
INSERT OR IGNORE INTO products (name, category, size, color, purchase_price, selling_price, quantity, barcode) VALUES
('قميص قطني', 'قمصان', 'L', 'أبيض', 50.00, 80.00, 20, '1001'),
('بنطلون جينز', 'بناطيل', '32', 'أزرق', 80.00, 120.00, 15, '1002'),
('فستان صيفي', 'فساتين', 'M', 'أحمر', 70.00, 110.00, 10, '1003');

INSERT OR IGNORE INTO customers (name, phone, address) VALUES
('أحمد محمد', '01234567890', 'القاهرة'),
('فاطمة علي', '01098765432', 'الجيزة');