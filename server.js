require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const crypto = require('crypto');
const app = express();
const port = process.env.PORT || 3000;

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Database connection
const dbUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
console.log('DATABASE_URL length:', dbUrl ? dbUrl.length : 'undefined');

// SSL configuration (needed for Koyeb and external Postgres)
const poolConfig = {
  connectionString: dbUrl,
};

if (dbUrl && (dbUrl.includes('proxy.rlwy.net') || dbUrl.includes('koyeb.app') || process.env.NODE_ENV === 'production')) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Root route to serve index.html explicitly (required for Vercel/some serverless)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize database schema
const initDB = async (retries = 5) => {
  while (retries > 0) {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS customers (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            mobile TEXT,
            UNIQUE(name, mobile)
          );
          
          CREATE TABLE IF NOT EXISTS bills (
            id SERIAL PRIMARY KEY,
            transaction_id UUID DEFAULT gen_random_uuid(),
            bill_no TEXT,
            customer_id INTEGER REFERENCES customers(id),
            article_name TEXT NOT NULL,
            pieces INTEGER NOT NULL,
            amount_per_piece DECIMAL(10, 2) NOT NULL,
            total DECIMAL(10, 2) NOT NULL,
            grand_total DECIMAL(10, 2) NOT NULL,
            bill_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS suppliers (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            mobile TEXT,
            address TEXT,
            UNIQUE(name, mobile)
          );

          CREATE TABLE IF NOT EXISTS purchases (
            id SERIAL PRIMARY KEY,
            supplier_id INTEGER REFERENCES suppliers(id),
            article_name TEXT NOT NULL,
            pieces INTEGER NOT NULL,
            base_amount DECIMAL(10, 2) NOT NULL,
            gst_amount DECIMAL(10, 2) NOT NULL,
            total_amount DECIMAL(10, 2) NOT NULL,
            payment_mode TEXT NOT NULL,
            purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          -- E-commerce Prototype Tables
          CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            price DECIMAL(10, 2) NOT NULL,
            image_url TEXT,
            category TEXT,
            stock_quantity INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS ecommerce_orders (
            id SERIAL PRIMARY KEY,
            customer_name TEXT,
            customer_mobile TEXT,
            address TEXT,
            total_amount DECIMAL(10, 2),
            status TEXT DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS order_items (
            id SERIAL PRIMARY KEY,
            order_id INTEGER REFERENCES ecommerce_orders(id),
            product_id INTEGER REFERENCES products(id),
            quantity INTEGER,
            price DECIMAL(10, 2)
          );

          -- Migration: Add bill_date if it doesn't exist
          DO $$ 
          BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bills' AND column_name='bill_date') THEN
              ALTER TABLE bills ADD COLUMN bill_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            END IF;
          END $$;

          -- Migration: Add transaction_id if it doesn't exist
          DO $$ 
          BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bills' AND column_name='transaction_id') THEN
              ALTER TABLE bills ADD COLUMN transaction_id UUID DEFAULT gen_random_uuid();
            END IF;
          END $$;

          -- Migration: Ensure all rows have a transaction_id (for those missed by column addition)
          UPDATE bills SET transaction_id = gen_random_uuid() WHERE transaction_id IS NULL;

          -- Migration: Add bill_no if it doesn't exist
          DO $$ 
          BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bills' AND column_name='bill_no') THEN
              ALTER TABLE bills ADD COLUMN bill_no TEXT;
            END IF;
          END $$;

          -- Re-number all bills sequentially starting from 1
          -- Based on transaction groups, ordered by date
          WITH numbered_transactions AS (
            SELECT transaction_id, ROW_NUMBER() OVER (ORDER BY MIN(bill_date) ASC, MIN(id) ASC) as seq_no
            FROM bills
            GROUP BY transaction_id
          )
          UPDATE bills b
          SET bill_no = n.seq_no::TEXT
          FROM numbered_transactions n
          WHERE b.transaction_id = n.transaction_id;
        `);
        console.log("Database tables initialized and bills re-numbered.");
        return;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error(`Error initializing database (${retries} retries left):`, err);
      retries -= 1;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

initDB();

app.post('/api/bills', async (req, res) => {
  const { name, mobile, billDate, billNo, items, grandTotal, transactionId } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get or Create Customer
    let customerResult = await client.query(
      'SELECT id FROM customers WHERE name = $1 AND mobile = $2',
      [name, mobile]
    );

    let customerId;
    if (customerResult.rows.length === 0) {
      const newCustomer = await client.query(
        'INSERT INTO customers (name, mobile) VALUES ($1, $2) RETURNING id',
        [name, mobile]
      );
      customerId = newCustomer.rows[0].id;
    } else {
      customerId = customerResult.rows[0].id;
    }

    // 2. Determine Bill Number
    let finalBillNo = billNo;
    if (!finalBillNo) {
      const maxNoResult = await client.query('SELECT MAX(CAST(bill_no AS INTEGER)) as max_no FROM bills WHERE bill_no ~ \'^[0-9]+$\'');
      const maxNo = maxNoResult.rows[0].max_no || 0;
      finalBillNo = (maxNo + 1).toString();
    }

    // If updating, delete old items first
    const finalTransactionId = transactionId || crypto.randomUUID();
    if (transactionId) {
      await client.query('DELETE FROM bills WHERE transaction_id = $1', [transactionId]);
    }

    // 3. Insert Bills (Multiple items from the table)
    for (const item of items) {
      await client.query(`
        INSERT INTO bills (transaction_id, bill_no, customer_id, article_name, pieces, amount_per_piece, total, grand_total, bill_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [finalTransactionId, finalBillNo, customerId, item.article, item.pieces, item.pricePerPiece, item.total, grandTotal, billDate || new Date()]);
    }

    await client.query('COMMIT');
    res.json({ success: true, transactionId: finalTransactionId, billNo: finalBillNo });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error saving bill:", err);
    res.status(500).json({ error: 'Failed to save bill' });
  } finally {
    client.release();
  }
});

app.get('/api/bills', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.transaction_id::TEXT as transaction_id, b.bill_no, b.bill_date, b.grand_total, COALESCE(c.name, 'Walk-in') as customer_name, c.mobile
      FROM bills b
      LEFT JOIN customers c ON b.customer_id = c.id
      GROUP BY b.transaction_id, b.bill_no, b.bill_date, b.grand_total, c.name, c.mobile
      ORDER BY CASE WHEN b.bill_no ~ '^[0-9]+$' THEN CAST(b.bill_no AS INTEGER) ELSE 0 END DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching all bills:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bills/:transactionId', async (req, res) => {
  const { transactionId } = req.params;
  console.log(`Fetching bill details for transactionId: ${transactionId}`);
  try {
    const billItems = await pool.query(`
      SELECT b.*, b.transaction_id::TEXT as transaction_id, COALESCE(c.name, 'Walk-in') as customer_name, c.mobile
      FROM bills b
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE b.transaction_id::TEXT = $1
    `, [transactionId]);
    
    if (billItems.rows.length === 0) {
      console.log(`No bill found for transactionId: ${transactionId}`);
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    console.log(`Found ${billItems.rows.length} items for transactionId: ${transactionId}`);
    res.json({
      transactionId,
      billNo: billItems.rows[0].bill_no,
      customerName: billItems.rows[0].customer_name,
      customerMobile: billItems.rows[0].mobile,
      billDate: billItems.rows[0].bill_date,
      grandTotal: billItems.rows[0].grand_total,
      items: billItems.rows.map(item => ({
        article: item.article_name,
        pieces: item.pieces,
        pricePerPiece: item.amount_per_piece,
        total: item.total
      }))
    });
  } catch (err) {
    console.error(`Error fetching bill details for ${transactionId}:`, err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/bills/:transactionId', async (req, res) => {
  const { transactionId } = req.params;
  console.log(`Attempting to delete bill with transactionId: ${transactionId}`);
  try {
    const result = await pool.query('DELETE FROM bills WHERE transaction_id = $1', [transactionId]);
    console.log(`Successfully deleted items for transactionId: ${transactionId}. Rows affected: ${result.rowCount}`);
    res.json({ success: true, rowsAffected: result.rowCount });
  } catch (err) {
    console.error(`Error deleting bill ${transactionId}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Suppliers API
app.get('/api/suppliers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suppliers ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/suppliers', async (req, res) => {
  const { name, mobile, address } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO suppliers (name, mobile, address) VALUES ($1, $2, $3) RETURNING *',
      [name, mobile, address]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Purchases API
app.get('/api/purchases', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, s.name as supplier_name 
      FROM purchases p 
      JOIN suppliers s ON p.supplier_id = s.id 
      ORDER BY p.purchase_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/purchases', async (req, res) => {
  const { supplier_id, article_name, pieces, base_amount, gst_amount, total_amount, payment_mode, purchase_date } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO purchases (supplier_id, article_name, pieces, base_amount, gst_amount, total_amount, payment_mode, purchase_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `, [supplier_id, article_name, pieces, base_amount, gst_amount, total_amount, payment_mode, purchase_date || new Date()]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard', async (req, res) => {
  console.log("Dashboard API hit. DATABASE_URL length:", process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 'undefined');
  let client;
  try {
    client = await pool.connect();
    console.log("Database connection successful in dashboard handler.");
    // 1. Last 10 bills (grouped by transaction_id to get unique transactions)
    const lastBills = await client.query(`
      SELECT * FROM (
        SELECT DISTINCT ON (b.transaction_id) 
               b.transaction_id::TEXT as transaction_id, 
               b.bill_no, 
               b.bill_date, 
               COALESCE(c.name, \'Walk-in\') as customer_name, 
               b.grand_total, 
               b.created_at
        FROM bills b
        LEFT JOIN customers c ON b.customer_id = c.id
        ORDER BY b.transaction_id, CASE WHEN b.bill_no ~ \'^[0-9]+$\' THEN CAST(b.bill_no AS INTEGER) ELSE 0 END DESC
      ) sub
      ORDER BY CASE WHEN bill_no ~ \'^[0-9]+$\' THEN CAST(bill_no AS INTEGER) ELSE 0 END DESC
      LIMIT 10
    `);

    // 2. Summary stats
    const stats = await client.query(`
      WITH unique_bills AS (
        SELECT DISTINCT ON (transaction_id) 
               transaction_id, customer_id, bill_date, grand_total 
        FROM bills
        ORDER BY transaction_id
      ),
      monthly_totals AS (
        SELECT 
          date_trunc('month', bill_date) as month,
          SUM(grand_total) as total
        FROM unique_bills
        WHERE bill_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY 1
      )
      SELECT 
        (SELECT COALESCE(SUM(grand_total), 0) FROM unique_bills WHERE date_trunc('month', bill_date) = date_trunc('month', CURRENT_DATE)) as current_month_total,
        (SELECT COALESCE(SUM(grand_total), 0) FROM unique_bills WHERE date_trunc('month', bill_date) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')) as last_month_total,
        (SELECT COALESCE(MAX(total), 0) FROM monthly_totals) as best_month_total,
        (SELECT COALESCE(SUM(grand_total), 0) FROM unique_bills WHERE date_trunc('year', bill_date) = date_trunc('year', CURRENT_DATE)) as year_total,
        (SELECT COALESCE(SUM(grand_total), 0) FROM unique_bills) as lifetime_total,
        (SELECT name FROM (
          SELECT COALESCE(c.name, 'Walk-in') as name, SUM(b.grand_total) as total_spent 
          FROM unique_bills b 
          LEFT JOIN customers c ON b.customer_id = c.id 
          GROUP BY 1 ORDER BY total_spent DESC LIMIT 1
        ) t) as top_customer,
        (SELECT COALESCE(SUM(total_amount), 0) FROM purchases) as total_investment
    `);

    console.log("Dashboard Stats Calculated:", stats.rows[0]);

    res.json({
      recentBills: lastBills.rows,
      summary: stats.rows[0]
    });
  } catch (err) {
    console.error("Error fetching dashboard:", err);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  } finally {
    client.release();
  }
});

// Store front routes
app.get('/store', (req, res) => {
  res.sendFile(path.join(__dirname, 'store.html'));
});

app.get('/admin-store', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin_store.html'));
});

// E-commerce API Routes
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  const { name, description, price, image_url, category, stock_quantity } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO products (name, description, price, image_url, category, stock_quantity) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, description, price, image_url, category, stock_quantity]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const { customer_name, customer_mobile, address, items, total_amount } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderResult = await client.query(
      'INSERT INTO ecommerce_orders (customer_name, customer_mobile, address, total_amount) VALUES ($1, $2, $3, $4) RETURNING id',
      [customer_name, customer_mobile, address, total_amount]
    );
    const orderId = orderResult.rows[0].id;

    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, item.product_id, item.quantity, item.price]
      );
      // Update stock
      await client.query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2', [item.quantity, item.product_id]);
    }
    await client.query('COMMIT');
    res.json({ success: true, orderId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, 
             (SELECT json_agg(json_build_object('name', p.name, 'quantity', oi.quantity, 'price', oi.price))
              FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id) as items
      FROM ecommerce_orders o ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - NOT FOUND: ${req.method} ${req.url}`);
  res.status(404).send(`Route ${req.url} not found`);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
