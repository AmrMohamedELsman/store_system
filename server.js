const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const cron = require('node-cron');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/assets', express.static('assets')); // إضافة هذا السطر

// إعداد قاعدة البيانات
const dbPath = path.join(__dirname, 'database', 'store.db');
const db = new sqlite3.Database(dbPath);

// إنشاء الجداول
db.serialize(() => {
  // جدول الأصناف
  db.run(`CREATE TABLE IF NOT EXISTS products (
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
    created_at DATETIME DEFAULT (datetime('now', 'localtime')),
    updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
  )`);

  // جدول العملاء
  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT (datetime('now', 'localtime'))
  )`);

  // جدول المبيعات
  db.run(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    total_amount REAL NOT NULL,
    discount REAL DEFAULT 0,
    individual_discounts REAL DEFAULT 0,
    additional_discount REAL DEFAULT 0,
    final_amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'نقدي',
    notes TEXT,
    created_at DATETIME DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (customer_id) REFERENCES customers (id)
  )`);

  // جدول تفاصيل المبيعات
  db.run(`CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales (id),
    FOREIGN KEY (product_id) REFERENCES products (id)
  )`);





  // جدول المصروفات
  db.run(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'نقدي',
    receipt_number TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT (datetime('now', 'localtime'))
  )`);

  // جدول المشتريات
  db.run(`CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_name TEXT,
    invoice_number TEXT,
    purchase_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT (datetime('now', 'localtime'))
  )`);

  // جدول تفاصيل المشتريات
  db.run(`CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    FOREIGN KEY (purchase_id) REFERENCES purchases (id),
    FOREIGN KEY (product_id) REFERENCES products (id)
  )`);

  // جدول المرتجعات
  db.run(`CREATE TABLE IF NOT EXISTS returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_amount REAL NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    original_invoice TEXT,
    created_at DATETIME DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (product_id) REFERENCES products (id)
  )`);

  // جدول الديون والمبيعات الآجلة
  db.run(`CREATE TABLE IF NOT EXISTS debts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    sale_id INTEGER NOT NULL,
    total_amount REAL NOT NULL,
    paid_amount REAL DEFAULT 0,
    remaining_amount REAL NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'مستحق',
    notes TEXT,
    created_at DATETIME DEFAULT (datetime('now', 'localtime')),
    updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (customer_id) REFERENCES customers (id),
    FOREIGN KEY (sale_id) REFERENCES sales (id)
  )`);
  
  // جدول دفعات الديون
  db.run(`CREATE TABLE IF NOT EXISTS debt_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    debt_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'نقدي',
    notes TEXT,
    created_at DATETIME DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (debt_id) REFERENCES debts (id)
  )`);

  // إضافة جدول البيانات المحذوفة بعد إنشاء الجداول الأخرى
  db.run(`CREATE TABLE IF NOT EXISTS deleted_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_type TEXT NOT NULL,
    original_id INTEGER NOT NULL,
    data_content TEXT NOT NULL,
    deleted_by TEXT DEFAULT 'النظام',
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deletion_reason TEXT
  )`);
  
  // إضافة الأعمدة المفقودة إذا لم تكن موجودة
  db.run(`ALTER TABLE purchases ADD COLUMN supplier_name TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.log('خطأ في إضافة عمود supplier_name:', err.message);
    }
  });
  
  db.run(`ALTER TABLE purchases ADD COLUMN invoice_number TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.log('خطأ في إضافة عمود invoice_number:', err.message);
    }
  });
  
  db.run(`ALTER TABLE purchases ADD COLUMN notes TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.log('خطأ في إضافة عمود notes:', err.message);
    }
  });
  
  db.run(`ALTER TABLE sales ADD COLUMN notes TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('خطأ في إضافة عمود notes:', err);
    }
  });
  
  // إضافة أعمدة الخصومات المفقودة
  db.run(`ALTER TABLE sales ADD COLUMN individual_discounts REAL DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('خطأ في إضافة عمود individual_discounts:', err);
    }
  });
  
  db.run(`ALTER TABLE sales ADD COLUMN additional_discount REAL DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('خطأ في إضافة عمود additional_discount:', err);
    }
  });

  // إضافة عمود المبالغ الإضافية الفردية
  db.run(`ALTER TABLE sales ADD COLUMN individual_additional_amounts REAL DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('خطأ في إضافة عمود individual_additional_amounts:', err);
    }
  });

  // إضافة عمود المبلغ الإضافي لتفاصيل المبيعات
  db.run(`ALTER TABLE sale_items ADD COLUMN additional_amount REAL DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('خطأ في إضافة عمود additional_amount:', err);
    }
  });

  // إضافة أعمدة الخصومات المفقودة
  db.run(`ALTER TABLE sales ADD COLUMN individual_discounts REAL DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('خطأ في إضافة عمود individual_discounts:', err);
    }
  });
  
  db.run(`ALTER TABLE sales ADD COLUMN additional_discount REAL DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('خطأ في إضافة عمود additional_discount:', err);
    }
  });
});

// Routes

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API للأصناف
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/products', (req, res) => {
  const { name, category, size, color, purchase_price, selling_price, quantity, min_quantity, barcode } = req.body;
  
  db.run(
    `INSERT INTO products (name, category, size, color, purchase_price, selling_price, quantity, min_quantity, barcode, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))`,
    [name, category, size, color, purchase_price, selling_price, quantity, min_quantity, barcode],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, message: 'تم إضافة المنتج بنجاح' });
    }
  );
});

// API للعملاء
app.get('/api/customers', (req, res) => {
  db.all('SELECT * FROM customers ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// إضافة عميل جديد مع التوقيت المحلي
app.post('/api/customers', (req, res) => {
  const { name, phone, address } = req.body;
  
  db.run(
    "INSERT INTO customers (name, phone, address, created_at) VALUES (?, ?, ?, datetime('now', 'localtime'))",
    [name, phone, address],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, message: 'تم إضافة العميل بنجاح' });
    }
  );
});

// تحديث بيانات عميل
app.put('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, address } = req.body;
  
  db.run(
    'UPDATE customers SET name = ?, phone = ?, address = ? WHERE id = ?',
    [name, phone, address, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (this.changes === 0) {
        res.status(404).json({ error: 'العميل غير موجود' });
        return;
      }
      
      res.json({ message: 'تم تحديث بيانات العميل بنجاح' });
    }
  );
});

// حذف عميل
app.delete('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  
  // التحقق من وجود مبيعات مرتبطة بالعميل
  db.get('SELECT COUNT(*) as count FROM sales WHERE customer_id = ?', [id], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (result.count > 0) {
      res.status(400).json({ error: 'لا يمكن حذف العميل لوجود مبيعات مرتبطة به' });
      return;
    }
    
    // جلب بيانات العميل قبل حذفه
    db.get('SELECT * FROM customers WHERE id = ?', [id], (err, customer) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!customer) {
        return res.status(404).json({ error: 'العميل غير موجود' });
      }
      
      // حفظ البيانات في جدول البيانات المحذوفة
      db.run(
        'INSERT INTO deleted_data (data_type, original_id, data_content, deletion_reason) VALUES (?, ?, ?, ?)',
        ['عميل', id, JSON.stringify(customer), 'حذف عميل'],
        function(err) {
          if (err) {
            console.error('خطأ في حفظ البيانات المحذوفة:', err);
          }
          
          // حذف العميل
          db.run('DELETE FROM customers WHERE id = ?', [id], function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            
            res.json({ message: 'تم حذف العميل بنجاح' });
          });
        }
      );
    });
  });
});

// API للمبيعات
app.post('/api/sales', (req, res) => {
  const { customer_id, items, discount, individual_discounts, additional_discount, individual_additional_amounts, payment_method } = req.body;
  
  let total_amount = 0;
  items.forEach(item => {
    // حساب السعر مع الخصم والمبلغ الإضافي
    const itemPrice = (item.unit_price - (item.discount || 0)) * item.quantity + (item.additional_amount || 0);
    total_amount += itemPrice;
  });

  // حساب المبلغ النهائي
  const final_amount = total_amount - (discount || 0);
  
  // للمبيعات الآجلة
  if (payment_method === 'آجل') {
    db.run(
      "INSERT INTO sales (customer_id, total_amount, discount, individual_discounts, additional_discount, individual_additional_amounts, final_amount, payment_method, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))",
      [customer_id, total_amount, discount || 0, individual_discounts || 0, additional_discount || 0, individual_additional_amounts || 0, 0, payment_method],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        const sale_id = this.lastID;
        
        // إضافة تفاصيل المبيعات مع المبالغ الإضافية
        items.forEach(item => {
          const itemTotal = (item.unit_price - (item.discount || 0)) * item.quantity + (item.additional_amount || 0);
          
          db.run(
            'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price, additional_amount) VALUES (?, ?, ?, ?, ?, ?)',
            [sale_id, item.product_id, item.quantity, item.unit_price, itemTotal, item.additional_amount || 0]
          );
          
          // تحديث كمية المخزون
          db.run(
            'UPDATE products SET quantity = quantity - ? WHERE id = ?',
            [item.quantity, item.product_id]
          );
        });
        
        // إنشاء دين
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        
        db.run(
          'INSERT INTO debts (customer_id, sale_id, total_amount, remaining_amount, due_date) VALUES (?, ?, ?, ?, ?)',
          [customer_id, sale_id, final_amount, final_amount, dueDate.toISOString().split('T')[0]],
          function(err) {
            if (err) {
              console.error('خطأ في إنشاء الدين:', err);
            }
          }
        );
        
        res.json({ success: true, saleId: sale_id, message: 'تم حفظ الفاتورة الآجلة بنجاح' });
      }
    );
  } else {
    // للمبيعات النقدية العادية
    db.run(
      "INSERT INTO sales (customer_id, total_amount, discount, individual_discounts, additional_discount, individual_additional_amounts, final_amount, payment_method, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))",
      [customer_id, total_amount, discount || 0, individual_discounts || 0, additional_discount || 0, individual_additional_amounts || 0, final_amount, payment_method],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        const sale_id = this.lastID;
        
        // إضافة تفاصيل المبيعات مع المبالغ الإضافية
        items.forEach(item => {
          const itemTotal = (item.unit_price - (item.discount || 0)) * item.quantity + (item.additional_amount || 0);
          
          db.run(
            'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price, additional_amount) VALUES (?, ?, ?, ?, ?, ?)',
            [sale_id, item.product_id, item.quantity, item.unit_price, itemTotal, item.additional_amount || 0]
          );
          
          // تحديث كمية المخزون
          db.run(
            'UPDATE products SET quantity = quantity - ? WHERE id = ?',
            [item.quantity, item.product_id]
          );
        });
        
        res.json({ success: true, saleId: sale_id, message: 'تم حفظ الفاتورة بنجاح' });
      }
    );
  }
});

// API للتقارير اليومية
app.get('/api/reports/daily-sales', (req, res) => {
  const salesQuery = `
    SELECT s.*, c.name as customer_name 
    FROM sales s 
    LEFT JOIN customers c ON s.customer_id = c.id 
    WHERE DATE(s.created_at) = DATE('now', 'localtime') 
    AND payment_method != 'آجل'
    ORDER BY s.created_at DESC
  `;
  
  const returnsQuery = `
    SELECT * FROM returns 
    WHERE DATE(created_at) = DATE('now', 'localtime') 
    ORDER BY created_at DESC
  `;
  
  const statsQuery = `
    SELECT 
      COALESCE(SUM(s.final_amount), 0) as total_sales,
      COALESCE(COUNT(s.id), 0) as sales_count,
      COALESCE(SUM(r.total_amount), 0) as total_returns,
      COALESCE(COUNT(r.id), 0) as returns_count,
      (COALESCE(SUM(s.final_amount), 0) - COALESCE(SUM(r.total_amount), 0)) as net_revenue
    FROM 
      (SELECT final_amount, id FROM sales WHERE DATE(created_at) = DATE('now', 'localtime') AND payment_method != 'آجل') s
    FULL OUTER JOIN 
      (SELECT total_amount, id FROM returns WHERE DATE(created_at) = DATE('now', 'localtime')) r
    ON 1=1
  `;
  
  db.all(salesQuery, (err, sales) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    db.all(returnsQuery, (err, returns) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      db.get(statsQuery, (err, stats) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        res.json({
          sales: sales,
          returns: returns,
          stats: {
            total_sales: stats.total_sales || 0,
            sales_count: stats.sales_count || 0,
            total_returns: stats.total_returns || 0,
            returns_count: stats.returns_count || 0,
            net_revenue: stats.net_revenue || 0
          }
        });
      });
    });
  });
});

// API لأفضل المنتجات مع دعم فلاتر التاريخ
app.get('/api/reports/top-products', (req, res) => {
    const { period, start, end } = req.query;
    
    let whereClause = '';
    let params = [];
    
    if (period === 'custom' && start && end) {
        whereClause = 'WHERE DATE(s.created_at) BETWEEN ? AND ?';
        params = [start, end];
    } else if (period === 'week') {
        whereClause = "WHERE DATE(s.created_at) >= DATE('now', 'localtime', '-7 days')";
    } else if (period === 'month') {
        whereClause = "WHERE DATE(s.created_at) >= DATE('now', 'localtime', 'start of month')";
    } else if (period === 'year') {
        whereClause = "WHERE DATE(s.created_at) >= DATE('now', 'localtime', 'start of year')";
    } else {
        whereClause = "WHERE DATE(s.created_at) = DATE('now', 'localtime')";
    }
    
    const query = `
        SELECT 
            p.id,
            p.name,
            p.category,
            SUM(si.quantity) as total_quantity,
            SUM(si.total_price) as total_sales,
            COUNT(DISTINCT s.id) as sales_count,
            AVG(si.unit_price) as avg_price
        FROM products p
        INNER JOIN sale_items si ON p.id = si.product_id
        INNER JOIN sales s ON si.sale_id = s.id
        ` + whereClause + ` AND s.payment_method != 'آجل'
        GROUP BY p.id, p.name, p.category
        ORDER BY total_quantity DESC
        LIMIT 10
    `;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('خطأ في استعلام أفضل المنتجات:', err.message);
            res.status(500).json({ error: 'خطأ في الخادم' });
            return;
        }
        res.json(rows);
    });
});

// API لجلب كمية المبيعات لجميع المنتجات
app.get('/api/reports/all-products-sales', (req, res) => {
    const { period, start, end, category } = req.query;
    
    let whereClause = '';
    let params = [];
    
    // بناء شرط التاريخ
    if (period === 'custom' && start && end) {
        whereClause = 'WHERE DATE(s.created_at) BETWEEN ? AND ?';
        params = [start, end];
    } else if (period === 'week') {
        whereClause = "WHERE DATE(s.created_at) >= DATE('now', 'localtime', '-7 days')";
    } else if (period === 'month') {
        whereClause = "WHERE DATE(s.created_at) >= DATE('now', 'localtime', 'start of month')";
    } else if (period === 'year') {
        whereClause = "WHERE DATE(s.created_at) >= DATE('now', 'localtime', 'start of year')";
    } else {
        whereClause = "WHERE DATE(s.created_at) = DATE('now', 'localtime')";
    }
    
    // إضافة فلتر الفئة إذا تم تحديدها
    let categoryFilter = '';
    if (category && category !== '') {
        categoryFilter = 'WHERE p.category = ?';
        params.push(category);
    }
    
    const query = `
        SELECT 
            p.id,
            p.name,
            p.category,
            p.quantity as remaining_quantity,
            p.purchase_price,
            p.selling_price,
            COALESCE(SUM(si.quantity), 0) as total_quantity_sold,
            COALESCE(SUM(si.total_price), 0) as total_sales_value,
            COALESCE(AVG(si.unit_price), 0) as avg_selling_price,
            COUNT(DISTINCT s.id) as sales_transactions
        FROM products p
        LEFT JOIN sale_items si ON p.id = si.product_id
        LEFT JOIN sales s ON si.sale_id = s.id ${
            whereClause ? 'AND ' + whereClause.replace('WHERE ', '') : ''
        }
        ${categoryFilter}
        GROUP BY p.id, p.name, p.category, p.quantity, p.purchase_price, p.selling_price
        ORDER BY total_quantity_sold DESC, p.name ASC
    `;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('خطأ في استعلام مبيعات المنتجات:', err.message);
            res.status(500).json({ error: 'خطأ في الخادم' });
            return;
        }
        res.json(rows);
    });
});

// API لأفضل العملاء مع دعم فلاتر التاريخ
app.get('/api/reports/top-customers', (req, res) => {
    const { period, start, end } = req.query;
    
    let whereClause = '';
    let params = [];
    
    if (period === 'custom' && start && end) {
        whereClause = 'WHERE DATE(s.created_at) BETWEEN ? AND ?';
        params = [start, end];
    } else if (period === 'week') {
        whereClause = "WHERE DATE(s.created_at) >= DATE('now', 'localtime', '-7 days')";
    } else if (period === 'month') {
        whereClause = "WHERE DATE(s.created_at) >= DATE('now', 'localtime', 'start of month')";
    } else if (period === 'year') {
        whereClause = "WHERE DATE(s.created_at) >= DATE('now', 'localtime', 'start of year')";
    } else {
        whereClause = "WHERE DATE(s.created_at) = DATE('now', 'localtime')";
    }
    
    const query = `
        SELECT 
            c.id,
            c.name,
            c.phone,
            c.address,
            COUNT(s.id) as total_orders,
            SUM(s.final_amount) as total_spent,
            AVG(s.final_amount) as avg_order_value,
            MAX(s.created_at) as last_purchase
        FROM customers c
        INNER JOIN sales s ON c.id = s.customer_id
        ` + whereClause + `
        GROUP BY c.id, c.name, c.phone, c.address
        ORDER BY total_spent DESC
        LIMIT 10
    `;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('خطأ في استعلام أفضل العملاء:', err.message);
            res.status(500).json({ error: 'خطأ في الخادم' });
            return;
        }
        res.json(rows);
    });
});

// API لبيانات مخطط المبيعات
app.get('/api/reports/sales-chart', (req, res) => {
  const { period, start, end } = req.query;
  let dateCondition = '';
  let params = [];
  let groupBy = '';
  
  if (period === 'custom' && start && end) {
    dateCondition = 'WHERE DATE(created_at) BETWEEN ? AND ?';
    params = [start, end];
    groupBy = 'DATE(created_at)';
  } else {
    switch(period) {
      case 'today':
        dateCondition = 'WHERE DATE(created_at) = DATE(\'now\', \'localtime\')';
        groupBy = 'strftime("%H", created_at)';
        break;
      case 'week':
        dateCondition = 'WHERE DATE(created_at) >= DATE(\'now\', \'-7 days\', \'localtime\')';
        groupBy = 'DATE(created_at)';
        break;
      case 'month':
        dateCondition = 'WHERE strftime("%Y-%m", created_at) = strftime("%Y-%m", \'now\', \'localtime\')';
        groupBy = 'DATE(created_at)';
        break;
      case 'year':
        dateCondition = 'WHERE strftime("%Y", created_at) = strftime("%Y", \'now\', \'localtime\')';
        groupBy = 'strftime("%Y-%m", created_at)';
        break;
    }
  }
  
  db.all(
    `SELECT 
       ${groupBy} as period,
       COUNT(*) as sales_count,
       SUM(final_amount) as total_sales
     FROM sales ${dateCondition}
     ${dateCondition ? 'AND' : 'WHERE'} payment_method != 'آجل'
     GROUP BY ${groupBy}
     ORDER BY period`,
    params,
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows || []);
    }
  );
});

// API لبيانات مخطط مبيعات الفئات
app.get('/api/reports/categories-chart', (req, res) => {
  const { period, start, end } = req.query;
  let dateCondition = '';
  let params = [];
  
  if (period === 'custom' && start && end) {
    dateCondition = 'AND DATE(s.created_at) BETWEEN ? AND ?';
    params = [start, end];
  } else {
    switch(period) {
      case 'today':
        dateCondition = 'AND DATE(s.created_at) = DATE(\'now\', \'localtime\')';
        break;
      case 'week':
        dateCondition = 'AND DATE(s.created_at) >= DATE(\'now\', \'-7 days\', \'localtime\')';
        break;
      case 'month':
        dateCondition = 'AND strftime("%Y-%m", s.created_at) = strftime("%Y-%m", \'now\', \'localtime\')';
        break;
      case 'year':
        dateCondition = 'AND strftime("%Y", s.created_at) = strftime("%Y", \'now\', \'localtime\')';
        break;
    }
  }
  
  db.all(
    `SELECT 
       p.category,
       SUM(si.quantity) as quantity_sold,
       SUM(si.total_price) as total_sales
     FROM sale_items si
     JOIN products p ON si.product_id = p.id
     JOIN sales s ON si.sale_id = s.id
     WHERE s.payment_method != 'آجل' ${dateCondition}
     GROUP BY p.category
     ORDER BY total_sales DESC`,
    params,
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows || []);
    }
  );
});

// API للمنتجات منخفضة المخزون
app.get('/api/reports/low-stock', (req, res) => {
  db.all(
    'SELECT * FROM products WHERE quantity <= min_quantity ORDER BY quantity ASC',
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// API لجلب جميع المبيعات مع تفاصيل العملاء
app.get('/api/sales', (req, res) => {
  const query = `
    SELECT s.*, c.name as customer_name,
           COUNT(si.id) as items_count
    FROM sales s 
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN sale_items si ON s.id = si.sale_id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// API لجلب تفاصيل فاتورة محددة
app.get('/api/sales/:id/details', (req, res) => {
  const saleId = req.params.id;
  
  // جلب بيانات الفاتورة الأساسية
  db.get(
    `SELECT s.*, c.name as customer_name 
     FROM sales s 
     LEFT JOIN customers c ON s.customer_id = c.id 
     WHERE s.id = ?`,
    [saleId],
    (err, sale) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (!sale) {
        res.status(404).json({ error: 'الفاتورة غير موجودة' });
        return;
      }
      
      // جلب أصناف الفاتورة
      db.all(
        `SELECT si.*, p.name as product_name 
         FROM sale_items si 
         JOIN products p ON si.product_id = p.id 
         WHERE si.sale_id = ?`,
        [saleId],
        (err, items) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          sale.items = items;
          res.json(sale);
        }
      );
    }
  );
});

// API لحذف فاتورة
app.delete('/api/sales/:id', (req, res) => {
  const saleId = req.params.id;
  
  // جلب بيانات الفاتورة وأصنافها قبل حذفها
  db.get('SELECT * FROM sales WHERE id = ?', [saleId], (err, sale) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!sale) {
      return res.status(404).json({ error: 'الفاتورة غير موجودة' });
    }
    
    // جلب أصناف الفاتورة
    db.all(
      `SELECT si.*, p.name as product_name 
       FROM sale_items si 
       JOIN products p ON si.product_id = p.id 
       WHERE si.sale_id = ?`,
      [saleId],
      (err, items) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // إضافة الأصناف إلى بيانات الفاتورة
        const saleWithItems = {
          ...sale,
          items: items
        };
        
        // حفظ البيانات في جدول البيانات المحذوفة
        db.run(
          'INSERT INTO deleted_data (data_type, original_id, data_content, deletion_reason) VALUES (?, ?, ?, ?)',
          ['فاتورة', saleId, JSON.stringify(saleWithItems), 'حذف فاتورة'],
          function(err) {
            if (err) {
              console.error('خطأ في حفظ البيانات المحذوفة:', err);
            }
            
            db.serialize(() => {
              // إعادة الكميات إلى المخزون قبل حذف الفاتورة
              items.forEach(item => {
                db.run(
                  'UPDATE products SET quantity = quantity + ? WHERE id = ?',
                  [item.quantity, item.product_id],
                  function(updateErr) {
                    if (updateErr) {
                      console.error('خطأ في تحديث المخزون:', updateErr);
                    }
                  }
                );
              });
              
              // حذف أصناف الفاتورة أولاً
              db.run('DELETE FROM sale_items WHERE sale_id = ?', [saleId]);
              
              // ثم حذف الفاتورة
              db.run('DELETE FROM sales WHERE id = ?', [saleId], function(err) {
                if (err) {
                  res.status(500).json({ error: err.message });
                  return;
                }
                
                if (this.changes === 0) {
                  res.status(404).json({ error: 'الفاتورة غير موجودة' });
                  return;
                }
                
                res.json({ message: 'تم حذف الفاتورة وتحديث المخزون بنجاح' });
              });
            });
          }
        );
      }
    );
  });
});

// API لتحديث منتج
app.put('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  const { name, category, size, color, purchase_price, selling_price, quantity, min_quantity, barcode } = req.body;
  
  console.log('طلب تحديث المنتج:', {
    productId,
    body: req.body,
    headers: req.headers
  });
  
  // التحقق من وجود البيانات المطلوبة
  if (!name || !category || purchase_price === undefined || selling_price === undefined || quantity === undefined) {
    console.log('بيانات مفقودة:', { name, category, purchase_price, selling_price, quantity });
    return res.status(400).json({ error: 'البيانات المطلوبة مفقودة' });
  }
  
  // التحقق من وجود المنتج أولاً
  db.get('SELECT id FROM products WHERE id = ?', [productId], (err, row) => {
    if (err) {
      console.error('خطأ في البحث عن المنتج:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (!row) {
      console.log('المنتج غير موجود:', productId);
      return res.status(404).json({ error: `المنتج رقم ${productId} غير موجود` });
    }
    
    console.log('المنتج موجود، بدء التحديث...');
    
    // تحديث المنتج
    const sql = `UPDATE products SET 
      name = ?, category = ?, size = ?, color = ?, 
      purchase_price = ?, selling_price = ?, quantity = ?, 
      min_quantity = ?, barcode = ?, updated_at = datetime('now', 'localtime') 
      WHERE id = ?`;
    
    db.run(sql, [name, category, size, color, purchase_price, selling_price, quantity, min_quantity, barcode, productId], function(err) {
      if (err) {
        console.error('خطأ في تحديث المنتج:', err);
        return res.status(500).json({ error: err.message });
      }
      
      console.log('تم تحديث المنتج بنجاح، عدد الصفوف المتأثرة:', this.changes);
      res.json({ 
        message: 'تم تحديث المنتج بنجاح', 
        changes: this.changes,
        productId: productId
      });
    });
  });
});

// API لحذف منتج
app.delete('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  
  // جلب بيانات المنتج قبل حذفه
  db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!product) {
      return res.status(404).json({ error: 'المنتج غير موجود' });
    }
    
    // حفظ البيانات في جدول البيانات المحذوفة
    db.run(
      'INSERT INTO deleted_data (data_type, original_id, data_content, deletion_reason) VALUES (?, ?, ?, ?)',
      ['منتج', productId, JSON.stringify(product), 'حذف منتج'],
      function(err) {
        if (err) {
          console.error('خطأ في حفظ البيانات المحذوفة:', err);
        }
        
        // حذف المنتج
        db.run('DELETE FROM products WHERE id = ?', [productId], function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          res.json({ message: 'تم حذف المنتج بنجاح', changes: this.changes });
        });
      }
    );
  });
});

// API للتحقق من المنتجات
app.get('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  
  db.get('SELECT * FROM products WHERE id = ?', [productId], (err, row) => {
    if (err) {
      console.error('خطأ في البحث عن المنتج:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'المنتج غير موجود' });
    }
    
    res.json(row);
  });
});

// API لجلب الفئات الفريدة
app.get('/api/categories', (req, res) => {
  const sql = 'SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != "" ORDER BY category';
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('خطأ في جلب الفئات:', err);
      return res.status(500).json({ error: err.message });
    }
    
    const categories = rows.map(row => row.category);
    res.json(categories);
  });
});

// API endpoint للإحصائيات العامة
app.get('/api/reports/stats', (req, res) => {
    const { period, start, end } = req.query;
    let whereClause = '';
    let params = [];
    
    if (period === 'custom' && start && end) {
        whereClause = "WHERE DATE(created_at) BETWEEN ? AND ?";
        params = [start, end];
    } else if (period === 'today') {
        whereClause = "WHERE DATE(created_at) = DATE('now', 'localtime')";
    } else if (period === 'week') {
        whereClause = "WHERE DATE(created_at) >= DATE('now', 'localtime', '-7 days')";
    } else if (period === 'month') {
        whereClause = "WHERE DATE(created_at) >= DATE('now', 'localtime', 'start of month')";
    } else if (period === 'year') {
        whereClause = "WHERE DATE(created_at) >= DATE('now', 'localtime', 'start of year')";
    } else {
        whereClause = "WHERE DATE(created_at) = DATE('now', 'localtime')";
    }
    
    // استعلام المبيعات - تم إصلاح المشكلة
    const salesQuery = `
        SELECT 
            COUNT(s.id) as totalSales,
            COALESCE(SUM(s.final_amount), 0) as totalRevenue,
            COALESCE(AVG(s.final_amount), 0) as averageOrderValue,
            COUNT(DISTINCT s.customer_id) as uniqueCustomers
        FROM sales s
        ` + whereClause.replace('created_at', 's.created_at') + ` AND s.final_amount > 0`;
    
    // استعلام منفصل لحساب التكلفة
    const costQuery = `
        SELECT 
            COALESCE(SUM(si.quantity * p.purchase_price), 0) as totalCost,
            COALESCE(SUM(si.total_price), 0) as totalSalesAmount
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        JOIN sales s ON si.sale_id = s.id
        ` + whereClause.replace('created_at', 's.created_at') + ` AND s.final_amount > 0`;
    
    // استعلام المشتريات
    const purchasesQuery = `
        SELECT 
            COUNT(*) as totalPurchases,
            COALESCE(SUM(total_amount), 0) as totalPurchasesAmount
        FROM purchases
        ` + whereClause;
    
    // استعلام المصروفات
    const expensesQuery = `
        SELECT 
            COUNT(*) as totalExpenses,
            COALESCE(SUM(amount), 0) as totalExpensesAmount
        FROM expenses
        ` + whereClause;
    
    // استعلام المرتجعات مع التكلفة
    const returnsQuery = `
        SELECT 
            COUNT(*) as totalReturns,
            COALESCE(SUM(r.total_amount), 0) as totalReturnsAmount,
            COALESCE(SUM(r.quantity * p.purchase_price), 0) as totalReturnsCost
        FROM returns r
        LEFT JOIN products p ON r.product_id = p.id
        ` + whereClause.replace('created_at', 'r.created_at');
    
    // تنفيذ الاستعلامات
    db.get(salesQuery, params, (err, salesRow) => {
        if (err) {
            console.error('خطأ في جلب إحصائيات المبيعات:', err);
            res.status(500).json({ error: 'خطأ في الخادم' });
            return;
        }
        
        db.get(costQuery, params, (err, costRow) => {
            if (err) {
                console.error('خطأ في جلب تكلفة المبيعات:', err);
                res.status(500).json({ error: 'خطأ في الخادم' });
                return;
            }
            
            db.get(purchasesQuery, params, (err, purchasesRow) => {
                if (err) {
                    console.error('خطأ في جلب إحصائيات المشتريات:', err);
                    res.status(500).json({ error: 'خطأ في الخادم' });
                    return;
                }
                
                db.get(expensesQuery, params, (err, expensesRow) => {
                    if (err) {
                        console.error('خطأ في جلب إحصائيات المصروفات:', err);
                        res.status(500).json({ error: 'خطأ في الخادم' });
                        return;
                    }
                    
                    db.get(returnsQuery, params, (err, returnsRow) => {
                        if (err) {
                            console.error('خطأ في جلب إحصائيات المرتجعات:', err);
                            res.status(500).json({ error: 'خطأ في الخادم' });
                            return;
                        }
                        
                        // حساب صافي الربح الصحيح
                        const totalRevenue = salesRow.totalRevenue || 0;
                        const totalSalesCost = costRow.totalCost || 0;
                        const totalReturnsAmount = returnsRow.totalReturnsAmount || 0;
                        const totalReturnsCost = returnsRow.totalReturnsCost || 0;
                        
                        // صافي الإيراد = إجمالي المبيعات - إجمالي المرتجعات
                        const netRevenue = totalRevenue - totalReturnsAmount;
                        
                        // صافي الربح = صافي الإيراد - تكلفة المبيعات + تكلفة المرتجعات
                        const profit = netRevenue - totalSalesCost + totalReturnsCost;
                        
                        const profitMargin = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;
                        
                        res.json({
                            // بيانات المبيعات - تم إصلاح إجمالي المبيعات
                            total: totalRevenue,
                            count: salesRow.totalSales || 0,
                            average: salesRow.averageOrderValue || 0,
                            customers: salesRow.uniqueCustomers || 0,
                            profitMargin: profitMargin,
                            totalProfit: profit,
                            totalCost: totalSalesCost,
                            
                            // بيانات المشتريات
                            totalPurchases: purchasesRow.totalPurchasesAmount || 0,
                            purchasesCount: purchasesRow.totalPurchases || 0,
                            
                            // بيانات المصروفات
                            totalExpenses: expensesRow.totalExpensesAmount || 0,
                            expensesCount: expensesRow.totalExpenses || 0,
                            
                            // بيانات المرتجعات
                            totalReturns: totalReturnsAmount,
                            returnsCount: returnsRow.totalReturns || 0,
                            
                            // صافي الإيراد
                            netRevenue: netRevenue
                        });
                    });
                });
            });
        });
    });
});

// API endpoint للإحصائيات الأسبوعية
app.get('/api/reports/weekly-stats', (req, res) => {
    const query = `
        SELECT 
            COUNT(*) as totalSales,
            COALESCE(SUM(final_amount), 0) as totalRevenue
        FROM sales 
        WHERE DATE(created_at) >= DATE('now', 'localtime', '-7 days')
        AND payment_method != 'آجل'
    `;
    
    db.get(query, [], (err, row) => {
        if (err) {
            console.error('خطأ في جلب الإحصائيات الأسبوعية:', err);
            res.status(500).json({ error: 'خطأ في الخادم' });
            return;
        }
        
        res.json({
            weeklyTotal: row.totalRevenue || 0,
            weeklySalesCount: row.totalSales || 0
        });
    });
});


// endpoint للاختبار
app.get('/api/test', (req, res) => {
  res.json({ message: 'الخادم يعمل بشكل صحيح', timestamp: new Date().toISOString() });
});

// بدء الخادم
app.listen(PORT, () => {
  console.log(`نظام المحل يعمل على http://localhost:${PORT}`);
  console.log('النظام جاهز للاستخدام بدون إنترنت!');
});

// إغلاق قاعدة البيانات عند إنهاء التطبيق
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('تم إغلاق قاعدة البيانات.');
    process.exit(0);
  });
});





// API للمصروفات
app.get('/api/expenses', (req, res) => {
    const { category, start_date, end_date } = req.query;
    
    let query = 'SELECT * FROM expenses WHERE 1=1';
    let params = [];
    
    if (category) {
        query += ' AND category = ?';
        params.push(category);
    }
    
    if (start_date) {
        query += ' AND DATE(created_at) >= ?';
        params.push(start_date);
    }
    
    if (end_date) {
        query += ' AND DATE(created_at) <= ?';
        params.push(end_date);
    }
    
    query += ' ORDER BY created_at DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/expenses', (req, res) => {
    const { category, description, amount, payment_method, receipt_number, notes } = req.body;
    
    db.run('INSERT INTO expenses (category, description, amount, payment_method, receipt_number, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [category, description, amount, payment_method, receipt_number, notes], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: 'تم إضافة المصروف بنجاح' });
    });
});



// تحديث مصروف
app.put('/api/expenses/:id', (req, res) => {
    const { id } = req.params;
    const { category, description, amount, payment_method, receipt_number, notes, expense_date } = req.body;
    
    const sql = `UPDATE expenses SET 
                 category = ?, description = ?, amount = ?, 
                 payment_method = ?, receipt_number = ?, notes = ?, 
                 created_at = ? 
                 WHERE id = ?`;
    
    db.run(sql, [category, description, amount, payment_method, receipt_number, notes, expense_date, id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'المصروف غير موجود' });
            return;
        }
        
        res.json({ message: 'تم تحديث المصروف بنجاح', id: id });
    });
});

// حذف مصروف
app.delete('/api/expenses/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM expenses WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'المصروف غير موجود' });
            return;
        }
        
        res.json({ message: 'تم حذف المصروف بنجاح' });
    });
});
app.post('/api/expenses', (req, res) => {
    const { category, description, amount, payment_method, receipt_number, notes } = req.body;
    
    db.run('INSERT INTO expenses (category, description, amount, payment_method, receipt_number, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [category, description, amount, payment_method, receipt_number, notes], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: 'تم إضافة المصروف بنجاح' });
    });
});
app.get('/api/purchases', (req, res) => {
  db.all(`
    SELECT p.*, 
           COUNT(pi.id) as items_count
    FROM purchases p 
    LEFT JOIN purchase_items pi ON p.id = pi.purchase_id 
    GROUP BY p.id 
    ORDER BY p.created_at DESC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/purchases', (req, res) => {
  const { supplier_name, invoice_number, purchase_date, items, notes } = req.body;
  
  let total_amount = 0;
  items.forEach(item => {
    total_amount += item.quantity * item.unit_price;
  });
  
  db.run(
    "INSERT INTO purchases (supplier_name, invoice_number, purchase_date, total_amount, notes, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))",
    [supplier_name, invoice_number, purchase_date, total_amount, notes],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      const purchase_id = this.lastID;
      let processedItems = 0;
      
      // معالجة كل صنف بدون تقسيمات
      items.forEach(item => {
        if (item.is_new_product) {
          // إضافة صنف جديد أولاً
          db.run(
            'INSERT INTO products (name, category, size, color, purchase_price, selling_price, quantity, barcode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\', \'localtime\'), datetime(\'now\', \'localtime\'))',
            [item.product_name, item.category || '', item.size || '', item.color || '', item.purchase_price, item.selling_price || item.purchase_price, item.quantity, item.barcode || null],
            function(productErr) {
              if (productErr) {
                console.error('خطأ في إضافة المنتج الجديد:', productErr);
                return;
              }
              
              const new_product_id = this.lastID;
              
              // إضافة تفاصيل المشتريات للصنف الجديد
              db.run(
                'INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
                [purchase_id, new_product_id, item.quantity, item.unit_price, item.quantity * item.unit_price],
                function(purchaseItemErr) {
                  if (purchaseItemErr) {
                    console.error('خطأ في إضافة تفاصيل المشتريات:', purchaseItemErr);
                  }
                  
                  processedItems++;
                  if (processedItems === items.length) {
                    res.json({ id: purchase_id, message: 'تم حفظ المشتريات بنجاح وإضافة الأصناف الجديدة' });
                  }
                }
              );
            }
          );
        } else {
          // صنف موجود - تحديث جميع البيانات
          db.run(
            'INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
            [purchase_id, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price],
            function(purchaseItemErr) {
              if (purchaseItemErr) {
                console.error('خطأ في إضافة تفاصيل المشتريات:', purchaseItemErr);
              }
            }
          );
          
          // تحديث جميع بيانات المنتج بما في ذلك الاسم والفئة واللون والحجم
          db.run(
            `UPDATE products SET 
             name = ?, 
             category = ?, 
             size = ?, 
             color = ?, 
             barcode = ?, 
             min_quantity = ?, 
             quantity = quantity + ?, 
             purchase_price = ?, 
             selling_price = COALESCE(?, selling_price), 
             updated_at = datetime('now', 'localtime') 
             WHERE id = ?`,
            [
              item.name, 
              item.category, 
              item.size, 
              item.color, 
              item.barcode, 
              item.min_quantity,
              item.quantity, 
              item.purchase_price, 
              item.selling_price, 
              item.product_id
            ],
            function(updateErr) {
              if (updateErr) {
                console.error('خطأ في تحديث المخزون:', updateErr);
              }
              
              processedItems++;
              if (processedItems === items.length) {
                res.json({ id: purchase_id, message: 'تم حفظ المشتريات بنجاح وتحديث المخزون' });
              }
            }
          );
        }
      });
    }
  );
});

app.get('/api/purchases/:id', (req, res) => {
  const purchaseId = req.params.id;
  
  db.get('SELECT * FROM purchases WHERE id = ?', [purchaseId], (err, purchase) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!purchase) {
      res.status(404).json({ error: 'المشتريات غير موجودة' });
      return;
    }
    
    // جلب تفاصيل المشتريات
    db.all(
      `SELECT pi.*, p.name as product_name, p.barcode 
       FROM purchase_items pi 
       JOIN products p ON pi.product_id = p.id 
       WHERE pi.purchase_id = ?`,
      [purchaseId],
      (err, items) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        res.json({
          ...purchase,
          items: items
        });
      }
    );
  });
});

app.delete('/api/purchases/:id', (req, res) => {
  const purchaseId = req.params.id;
  
  // أولاً: جلب تفاصيل المشتريات لمعرفة الكميات التي يجب خصمها
  db.all('SELECT product_id, quantity FROM purchase_items WHERE purchase_id = ?', [purchaseId], (err, items) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // خصم الكميات من المخزون
    let processedItems = 0;
    const totalItems = items.length;
    
    if (totalItems === 0) {
      // لا توجد أصناف، يمكن حذف المشتريات مباشرة
      deletePurchaseRecord();
      return;
    }
    
    items.forEach(item => {
      db.run(
        'UPDATE products SET quantity = quantity - ? WHERE id = ?',
        [item.quantity, item.product_id],
        function(err) {
          if (err) {
            console.error('خطأ في تحديث المخزون:', err);
          }
          
          processedItems++;
          
          // إذا تم معالجة جميع الأصناف، احذف المشتريات
          if (processedItems === totalItems) {
            deletePurchaseRecord();
          }
        }
      );
    });
    
    function deletePurchaseRecord() {
      // حذف تفاصيل المشتريات
      db.run('DELETE FROM purchase_items WHERE purchase_id = ?', [purchaseId], (err) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        // حذف المشتريات
        db.run('DELETE FROM purchases WHERE id = ?', [purchaseId], function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          if (this.changes === 0) {
            res.status(404).json({ error: 'المشتريات غير موجودة' });
            return;
          }
          
          res.json({ message: 'تم حذف المشتريات وتحديث المخزون بنجاح' });
        });
      });
    }
  });
});

// API لتسجيل المرتجعات
app.post('/api/returns', (req, res) => {
  const { product_id, product_name, quantity, unit_price, total_amount, reason, notes, original_invoice } = req.body;
  
  // بدء معاملة قاعدة البيانات
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // إدراج المرتجع في قاعدة البيانات
    db.run(
      `INSERT INTO returns (product_id, product_name, quantity, unit_price, total_amount, reason, notes, original_invoice, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
      [product_id, product_name, quantity, unit_price, total_amount, reason, notes, original_invoice],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          res.status(500).json({ error: err.message });
          return;
        }
        
        const return_id = this.lastID;
        
        // تحديث كمية المخزون (إضافة الكمية المرتجعة)
        db.run(
          'UPDATE products SET quantity = quantity + ? WHERE id = ?',
          [quantity, product_id],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              console.error('خطأ في تحديث المخزون:', err);
              res.status(500).json({ error: 'خطأ في تحديث المخزون' });
              return;
            }
            
            // إذا تم تحديد رقم الفاتورة الأصلية، قم بتحديث تفاصيل الفاتورة
            if (original_invoice) {
              // البحث عن العنصر في sale_items
              db.get(
                'SELECT * FROM sale_items WHERE sale_id = ? AND product_id = ?',
                [original_invoice, product_id],
                function(err, saleItem) {
                  if (err) {
                    db.run('ROLLBACK');
                    res.status(500).json({ error: 'خطأ في البحث عن العنصر' });
                    return;
                  }
                  
                  if (saleItem) {
                    const newQuantity = saleItem.quantity - quantity;
                    const newTotalPrice = newQuantity * saleItem.unit_price;
                    
                    if (newQuantity <= 0) {
                      // حذف العنصر إذا أصبحت الكمية صفر أو أقل
                      db.run(
                        'DELETE FROM sale_items WHERE sale_id = ? AND product_id = ?',
                        [original_invoice, product_id],
                        function(err) {
                          if (err) {
                            db.run('ROLLBACK');
                            res.status(500).json({ error: 'خطأ في حذف العنصر' });
                            return;
                          }
                          updateSaleTotal(original_invoice, res, return_id);
                        }
                      );
                    } else {
                      // تحديث الكمية والإجمالي
                      db.run(
                        'UPDATE sale_items SET quantity = ?, total_price = ? WHERE sale_id = ? AND product_id = ?',
                        [newQuantity, newTotalPrice, original_invoice, product_id],
                        function(err) {
                          if (err) {
                            db.run('ROLLBACK');
                            res.status(500).json({ error: 'خطأ في تحديث العنصر' });
                            return;
                          }
                          updateSaleTotal(original_invoice, res, return_id);
                        }
                      );
                    }
                  } else {
                    // إذا لم يتم العثور على العنصر، أكمل العملية بدون تحديث الفاتورة
                    db.run('COMMIT');
                    res.json({ id: return_id, message: 'تم تسجيل المرتجع بنجاح' });
                  }
                }
              );
            } else {
              // إذا لم يتم تحديد رقم الفاتورة، أكمل العملية
              db.run('COMMIT');
              res.json({ id: return_id, message: 'تم تسجيل المرتجع بنجاح' });
            }
          }
        );
      }
    );
  });
});

// دالة مساعدة لتحديث إجمالي الفاتورة
function updateSaleTotal(saleId, res, returnId) {
  // حساب الإجمالي الجديد للفاتورة
  db.get(
    'SELECT SUM(total_price) as newTotal FROM sale_items WHERE sale_id = ?',
    [saleId],
    function(err, result) {
      if (err) {
        db.run('ROLLBACK');
        res.status(500).json({ error: 'خطأ في حساب الإجمالي الجديد' });
        return;
      }
      
      const newTotal = result.newTotal || 0;
      
      // تحديث إجمالي الفاتورة
      db.run(
        'UPDATE sales SET total_amount = ?, final_amount = ? WHERE id = ?',
        [newTotal, newTotal, saleId],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            res.status(500).json({ error: 'خطأ في تحديث إجمالي الفاتورة' });
            return;
          }
          
          db.run('COMMIT');
          res.json({ 
            id: returnId, 
            message: 'تم تسجيل المرتجع وتحديث الفاتورة بنجاح',
            updatedSale: {
              saleId: saleId,
              newTotal: newTotal
            }
          });
        }
      );
    }
  );
}

// API لجلب المرتجعات
app.get('/api/returns', (req, res) => {
  db.all(
    `SELECT * FROM returns ORDER BY created_at DESC`,
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// APIs النسخ الاحتياطي المتقدم

// إنشاء نسخة احتياطية وحفظها على القرص الصلب
app.post('/api/backup/create', async (req, res) => {
  try {
    const { backupPath } = req.body;
    const backupDir = backupPath || 'D:\\store-backups';
    
    // إنشاء مجلد النسخ الاحتياطية إذا لم يكن موجوداً
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // جمع جميع البيانات من قاعدة البيانات
    const backupData = await createFullBackup();
    
    // إنشاء اسم الملف بالتاريخ والوقت
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${timestamp}.json`;
    const filePath = path.join(backupDir, fileName);
    
    // حفظ النسخة الاحتياطية
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
    
    res.json({ 
      success: true, 
      message: 'تم إنشاء النسخة الاحتياطية بنجاح',
      filePath: filePath,
      fileName: fileName
    });
  } catch (error) {
    console.error('خطأ في إنشاء النسخة الاحتياطية:', error);
    res.status(500).json({ error: 'فشل في إنشاء النسخة الاحتياطية' });
  }
});

// استعادة النسخة الاحتياطية من ملف
app.post('/api/backup/restore', async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'ملف النسخة الاحتياطية غير موجود' });
    }
    
    const backupData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // استعادة البيانات
    await restoreFromBackup(backupData);
    
    res.json({ 
      success: true, 
      message: 'تم استعادة النسخة الاحتياطية بنجاح'
    });
  } catch (error) {
    console.error('خطأ في استعادة النسخة الاحتياطية:', error);
    res.status(500).json({ error: 'فشل في استعادة النسخة الاحتياطية' });
  }
});

// الحصول على قائمة النسخ الاحتياطية المتاحة
app.get('/api/backup/list', (req, res) => {
  try {
    const { backupPath } = req.query;
    const backupDir = backupPath || 'D:\\store-backups';
    
    if (!fs.existsSync(backupDir)) {
      return res.json({ backups: [] });
    }
    
    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.json') && file.startsWith('backup-'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          fileName: file,
          filePath: filePath,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ backups: files });
  } catch (error) {
    console.error('خطأ في جلب قائمة النسخ الاحتياطية:', error);
    res.status(500).json({ error: 'فشل في جلب قائمة النسخ الاحتياطية' });
  }
});

// جلب إعدادات النسخ الاحتياطي
app.get('/api/backup/settings', (req, res) => {
  try {
    const settingsPath = path.join(__dirname, 'backup-settings.json');
    
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      res.json({ success: true, settings });
    } else {
      // إعدادات افتراضية
      const defaultSettings = {
        autoBackup: false,
        backupPath: 'D:\\store-backups',
        frequency: 'daily'
      };
      res.json({ success: true, settings: defaultSettings });
    }
  } catch (error) {
    console.error('خطأ في جلب إعدادات النسخ الاحتياطي:', error);
    res.status(500).json({ error: 'فشل في جلب الإعدادات' });
  }
});

// تحديث إعدادات النسخ الاحتياطي التلقائي
app.post('/api/backup/settings', (req, res) => {
  try {
    const { autoBackup, backupPath, frequency } = req.body;
    
    // حفظ الإعدادات في ملف
    const settingsPath = path.join(__dirname, 'backup-settings.json');
    const settings = {
      autoBackup,
      backupPath: backupPath || 'D:\\store-backups',
      frequency: frequency || 'daily',
      lastBackup: new Date().toISOString()
    };
    
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    
    // إعادة تشغيل المهمة المجدولة
    setupAutoBackup(settings);
    
    res.json({ 
      success: true, 
      message: 'تم حفظ إعدادات النسخ الاحتياطي بنجاح'
    });
  } catch (error) {
    console.error('خطأ في حفظ إعدادات النسخ الاحتياطي:', error);
    res.status(500).json({ error: 'فشل في حفظ الإعدادات' });
  }
});

// دالة إنشاء نسخة احتياطية كاملة
async function createFullBackup() {
  return new Promise((resolve, reject) => {
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      data: {}
    };
    
    const tables = ['products', 'customers', 'sales', 'sale_items', 'purchases', 'purchase_items', 'expenses', 'returns'];
    let completed = 0;
    
    tables.forEach(table => {
      db.all(`SELECT * FROM ${table}`, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        backupData.data[table] = rows;
        completed++;
        
        if (completed === tables.length) {
          resolve(backupData);
        }
      });
    });
  });
}

// دالة استعادة النسخة الاحتياطية
async function restoreFromBackup(backupData) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      try {
        // حذف البيانات الحالية
        const tables = ['products', 'customers', 'sales', 'sale_items', 'purchases', 'purchase_items', 'expenses', 'returns'];
        
        tables.forEach(table => {
          db.run(`DELETE FROM ${table}`);
        });
        
        // استعادة البيانات
        Object.keys(backupData.data).forEach(table => {
          const rows = backupData.data[table];
          
          if (rows && rows.length > 0) {
            const columns = Object.keys(rows[0]).filter(col => col !== 'id');
            const placeholders = columns.map(() => '?').join(',');
            const columnNames = columns.join(',');
            
            const stmt = db.prepare(`INSERT INTO ${table} (${columnNames}) VALUES (${placeholders})`);
            
            rows.forEach(row => {
              const values = columns.map(col => row[col]);
              stmt.run(values);
            });
            
            stmt.finalize();
          }
        });
        
        db.run('COMMIT', (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } catch (error) {
        db.run('ROLLBACK');
        reject(error);
      }
    });
  });
}

// إعداد النسخ الاحتياطي التلقائي
function setupAutoBackup(settings) {
  if (!settings.autoBackup) return;
  
  let cronPattern;
  switch (settings.frequency) {
    case 'daily':
      cronPattern = '0 2 * * *'; // كل يوم في الساعة 2 صباحاً
      break;
    case 'weekly':
      cronPattern = '0 2 * * 0'; // كل أسبوع يوم الأحد في الساعة 2 صباحاً
      break;
    case 'monthly':
      cronPattern = '0 2 1 * *'; // كل شهر في اليوم الأول في الساعة 2 صباحاً
      break;
    default:
      cronPattern = '0 2 * * *';
  }
  
  cron.schedule(cronPattern, async () => {
    try {
      console.log('بدء النسخ الاحتياطي التلقائي...');
      
      const backupDir = settings.backupPath || 'D:\\store-backups';
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const backupData = await createFullBackup();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `auto-backup-${timestamp}.json`;
      const filePath = path.join(backupDir, fileName);
      
      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
      
      console.log(`تم إنشاء النسخة الاحتياطية التلقائية: ${fileName}`);
      
      // حذف النسخ القديمة (الاحتفاظ بآخر 30 نسخة)
      cleanOldBackups(backupDir);
      
    } catch (error) {
      console.error('خطأ في النسخ الاحتياطي التلقائي:', error);
    }
  });
}

// دالة حذف النسخ القديمة
function cleanOldBackups(backupDir) {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.json') && (file.startsWith('backup-') || file.startsWith('auto-backup-')))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return { file, filePath, createdAt: stats.birthtime };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // حذف النسخ الزائدة عن 30 نسخة
    if (files.length > 30) {
      const filesToDelete = files.slice(30);
      filesToDelete.forEach(({ filePath }) => {
        fs.unlinkSync(filePath);
        console.log(`تم حذف النسخة الاحتياطية القديمة: ${filePath}`);
      });
    }
  } catch (error) {
    console.error('خطأ في حذف النسخ القديمة:', error);
  }
}


// مسح جميع البيانات (يتطلب تأكيد خاص)
app.post('/api/system/clear-all-data', (req, res) => {
  const { confirmationCode } = req.body;
  
  // كود التأكيد الخاص (يمكنك تغييره)
  if (confirmationCode !== 'CLEAR_ALL_2024') {
    return res.status(403).json({ error: 'كود التأكيد غير صحيح' });
  }
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    try {
      // حذف البيانات من جميع الجداول
      const tables = ['sale_items', 'sales', 'purchase_items', 'purchases', 'expenses', 'returns', 'products', 'customers'];
      
      tables.forEach(table => {
        db.run(`DELETE FROM ${table}`);
      });
      
      // إعادة تعيين الـ AUTO_INCREMENT للجداول
      tables.forEach(table => {
        db.run(`DELETE FROM sqlite_sequence WHERE name='${table}'`);
      });
      
      db.run('COMMIT', (err) => {
        if (err) {
          console.error('خطأ في مسح البيانات:', err);
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'فشل في مسح البيانات' });
        }
        
        console.log('تم مسح جميع البيانات بنجاح');
        res.json({ message: 'تم مسح جميع البيانات بنجاح' });
      });
      
    } catch (error) {
      console.error('خطأ في مسح البيانات:', error);
      db.run('ROLLBACK');
      res.status(500).json({ error: 'فشل في مسح البيانات' });
    }
  });
});

// إضافة API لجلب البيانات المحذوفة
app.get('/api/deleted-data', (req, res) => {
  const { type, limit = 50, offset = 0 } = req.query;
  
  let sql = 'SELECT * FROM deleted_data';
  let params = [];
  
  if (type) {
    sql += ' WHERE data_type = ?';
    params.push(type);
  }
  
  sql += ' ORDER BY deleted_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // تحويل البيانات المحفوظة من JSON إلى كائن
    const deletedData = rows.map(row => ({
      ...row,
      data_content: JSON.parse(row.data_content)
    }));
    
    res.json(deletedData);
  });
});

// API لاستعادة البيانات المحذوفة
app.post('/api/deleted-data/:id/restore', (req, res) => {
  const deletedId = req.params.id;
  
  // جلب البيانات المحذوفة
  db.get('SELECT * FROM deleted_data WHERE id = ?', [deletedId], (err, deletedItem) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!deletedItem) {
      return res.status(404).json({ error: 'البيانات المحذوفة غير موجودة' });
    }
    
    try {
      const dataContent = JSON.parse(deletedItem.data_content);
      
      // استعادة البيانات حسب النوع
      if (deletedItem.data_type === 'منتج') {
        const { name, category, size, color, purchase_price, selling_price, quantity, min_quantity, barcode } = dataContent;
        
        db.run(
          `INSERT INTO products (name, category, size, color, purchase_price, selling_price, quantity, min_quantity, barcode, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
          [name, category, size, color, purchase_price, selling_price, quantity, min_quantity, barcode],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'فشل في استعادة المنتج: ' + err.message });
            }
            
            const restoredId = this.lastID;
            
            // حذف البيانات من جدول المحذوفات
            db.run('DELETE FROM deleted_data WHERE id = ?', [deletedId], (err) => {
              if (err) {
                console.error('خطأ في حذف البيانات المحذوفة:', err);
              }
              
              res.json({ 
                message: 'تم استعادة المنتج بنجاح',
                restoredId: restoredId,
                type: 'منتج'
              });
            });
          }
        );
        
      } else if (deletedItem.data_type === 'عميل') {
        const { name, phone, address } = dataContent;
        
        db.run(
          `INSERT INTO customers (name, phone, address, created_at) 
           VALUES (?, ?, ?, datetime('now', 'localtime'))`,
          [name, phone, address],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'فشل في استعادة العميل: ' + err.message });
            }
            
            const restoredId = this.lastID;
            
            // حذف البيانات من جدول المحذوفات
            db.run('DELETE FROM deleted_data WHERE id = ?', [deletedId], (err) => {
              if (err) {
                console.error('خطأ في حذف البيانات المحذوفة:', err);
              }
              
              res.json({ 
                message: 'تم استعادة العميل بنجاح',
                restoredId: restoredId,
                type: 'عميل'
              });
            });
          }
        );
        
      } else if (deletedItem.data_type === 'فاتورة') {
        const { customer_id, total_amount, discount, final_amount, payment_method, created_at, items } = dataContent;
        
        db.run(
          `INSERT INTO sales (customer_id, total_amount, discount, final_amount, payment_method, created_at) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [customer_id, total_amount, discount, final_amount, payment_method, created_at],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'فشل في استعادة الفاتورة: ' + err.message });
            }
            
            const restoredSaleId = this.lastID;
            
            // استعادة أصناف الفاتورة وتحديث المخزون
            if (items && items.length > 0) {
              let processedItems = 0;
              const totalItems = items.length;
              
              items.forEach(item => {
                // إدراج صنف الفاتورة
                db.run(
                  `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) 
                   VALUES (?, ?, ?, ?, ?)`,
                  [restoredSaleId, item.product_id, item.quantity, item.unit_price, item.total_price],
                  function(err) {
                    if (err) {
                      console.error('خطأ في استعادة صنف الفاتورة:', err);
                    }
                    
                    // تحديث المخزون (خصم الكمية المباعة)
                    db.run(
                      'UPDATE products SET quantity = quantity - ? WHERE id = ?',
                      [item.quantity, item.product_id],
                      function(updateErr) {
                        if (updateErr) {
                          console.error('خطأ في تحديث المخزون:', updateErr);
                        }
                        
                        processedItems++;
                        
                        // إذا تم معالجة جميع الأصناف
                        if (processedItems === totalItems) {
                          // حذف البيانات من جدول المحذوفات
                          db.run('DELETE FROM deleted_data WHERE id = ?', [deletedId], (err) => {
                            if (err) {
                              console.error('خطأ في حذف البيانات المحذوفة:', err);
                            }
                            
                            res.json({ 
                              message: 'تم استعادة الفاتورة وتحديث المخزون بنجاح',
                              restoredId: restoredSaleId,
                              type: 'فاتورة'
                            });
                          });
                        }
                      }
                    );
                  }
                );
              });
            } else {
              // لا توجد أصناف، حذف البيانات من جدول المحذوفات مباشرة
              db.run('DELETE FROM deleted_data WHERE id = ?', [deletedId], (err) => {
                if (err) {
                  console.error('خطأ في حذف البيانات المحذوفة:', err);
                }
                
                res.json({ 
                  message: 'تم استعادة الفاتورة بنجاح',
                  restoredId: restoredSaleId,
                  type: 'فاتورة'
                });
              });
            }
          }
        );
        
      } else {
        res.status(400).json({ error: 'نوع البيانات غير مدعوم للاستعادة' });
      }
      
    } catch (parseError) {
      res.status(500).json({ error: 'خطأ في تحليل البيانات المحذوفة' });
    }
  });
});

// API لحذف البيانات المحذوفة نهائياً
app.delete('/api/deleted-data/:id', (req, res) => {
  const deletedId = req.params.id;
  
  db.run('DELETE FROM deleted_data WHERE id = ?', [deletedId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'البيانات المحذوفة غير موجودة' });
    }
    
    res.json({ message: 'تم حذف البيانات نهائياً' });
  });
});

// API للديون
app.get('/api/debts', (req, res) => {
  const query = `
    SELECT d.*, c.name as customer_name, c.phone as customer_phone
    FROM debts d
    LEFT JOIN customers c ON d.customer_id = c.id
    ORDER BY d.created_at DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// إضافة دفعة جديدة للدين
app.post('/api/debts/:id/payment', (req, res) => {
  const { id } = req.params;
  const { amount, payment_method, notes } = req.body;
  
  db.get('SELECT * FROM debts WHERE id = ?', [id], (err, debt) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!debt) {
      res.status(404).json({ error: 'الدين غير موجود' });
      return;
    }
    
    const newPaidAmount = debt.paid_amount + amount;
    const newRemainingAmount = debt.total_amount - newPaidAmount;
    const newStatus = newRemainingAmount <= 0 ? 'مسدد' : 'مستحق جزئياً';
    
    // إضافة الدفعة
    db.run(
      'INSERT INTO debt_payments (debt_id, amount, payment_method, notes) VALUES (?, ?, ?, ?)',
      [id, amount, payment_method, notes],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        // تحديث الدين
        db.run(
          'UPDATE debts SET paid_amount = ?, remaining_amount = ?, status = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?',
          [newPaidAmount, newRemainingAmount, newStatus, id],
          function(err) {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            
            // إضافة المبلغ المدفوع إلى المبيعات اليومية
            db.run(
              "INSERT INTO sales (customer_id, total_amount, discount, final_amount, payment_method, created_at, notes) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?)",
              [debt.customer_id, amount, 0, amount, 'تحصيل دين', `تحصيل دفعة من الدين رقم ${id}`],
              function(err) {
                if (err) {
                  console.error('خطأ في إضافة المبلغ إلى المبيعات:', err);
                }
              }
            );
            
            res.json({ message: 'تم تسجيل الدفعة بنجاح', payment_id: this.lastID });
          }
        );
      }
    );
  });
});

// الحصول على تفاصيل الدين ودفعاته
app.get('/api/debts/:id/details', (req, res) => {
  const { id } = req.params;
  
  const debtQuery = `
    SELECT d.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
    FROM debts d
    LEFT JOIN customers c ON d.customer_id = c.id
    WHERE d.id = ?
  `;
  
  const paymentsQuery = 'SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY created_at DESC';
  
  db.get(debtQuery, [id], (err, debt) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!debt) {
      res.status(404).json({ error: 'الدين غير موجود' });
      return;
    }
    
    db.all(paymentsQuery, [id], (err, payments) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      res.json({ debt, payments });
    });
  });
});

// تحميل إعدادات النسخ الاحتياطي عند بدء الخادم
const settingsPath = path.join(__dirname, 'backup-settings.json');
if (fs.existsSync(settingsPath)) {
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    setupAutoBackup(settings);
  } catch (error) {
    console.error('خطأ في تحميل إعدادات النسخ الاحتياطي:', error);
  }
}