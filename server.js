const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

let pool;
const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
};

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

if (dbUrl && (dbUrl.includes('proxy.rlwy.net') || dbUrl.includes('koyeb.app') || dbUrl.includes('supabase.co') || process.env.NODE_ENV === 'production')) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Root route to serve index.html explicitly (required for Vercel/some serverless)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize database schema
const initDB = async (retries = 5) => {
  if (!process.env.DATABASE_URL && !process.env.DATABASE_PUBLIC_URL) {
    console.error("No DATABASE_URL found. Skipping DB initialization.");
    return;
  }
  while (retries > 0) {
    try {
      const client = await getPool().connect();
      try {
        await client.query(`
          CREATE EXTENSION IF NOT EXISTS pgcrypto;
          
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
          );`);
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
  const { name, mobile, billDate, billNo, items, grandTotal, transactionId, customerId: providedCustomerId } = req.body;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    // 1. Get or Create Customer
    let customerId = providedCustomerId;
    if (!customerId) {
      let customerResult = await client.query(
        'SELECT id FROM customers WHERE name = $1 AND mobile = $2',
        [name, mobile]
      );

      if (customerResult.rows.length === 0) {
        const newCustomer = await client.query(
          'INSERT INTO customers (name, mobile) VALUES ($1, $2) RETURNING id',
          [name, mobile]
        );
        customerId = newCustomer.rows[0].id;
      } else {
        customerId = customerResult.rows[0].id;
      }
    }

    // 2. Determine Bill Number
    let finalBillNo = billNo;
    if (!finalBillNo) {
      const maxNoResult = await client.query('SELECT MAX(CAST(bill_no AS INTEGER)) as max_no FROM bills WHERE bill_no ~ \'^\\[0-9]+$\'');
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

app.get('/api/customers/search', async (req, res) => {
  const { name } = req.query;
  if (!name) return res.json([]);
  try {
    // Prioritize results that start with the query, then those that contain it
    const result = await getPool().query(
      `SELECT id, name, mobile FROM customers 
       WHERE name ILIKE $1 
       ORDER BY (CASE WHEN name ILIKE $2 THEN 0 ELSE 1 END), name ASC 
       LIMIT 10`,
      [`%${name}%`, `${name}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error searching customers:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bills', async (req, res) => {
  try {
    const result = await getPool().query(`
      SELECT b.transaction_id::TEXT as transaction_id, b.bill_no, b.bill_date, b.grand_total, 
             COALESCE(c.name, 'Walk-in') as customer_name, c.mobile,
             SUM(b.pieces) as total_pieces
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

app.get('/api/bills/next-number', async (req, res) => {
  try {
    const result = await getPool().query("SELECT MAX(CAST(bill_no AS INTEGER)) as max_no FROM bills WHERE bill_no ~ '^[0-9]+$'");
    const nextNo = (result.rows[0].max_no || 0) + 1;
    res.json({ nextBillNo: nextNo.toString() });
  } catch (err) {
    console.error("Error fetching next bill number:", err);
    res.status(500).json({ error: 'Failed to fetch next bill number' });
  }
});

app.get('/api/bills/:transactionId', async (req, res) => {
  const { transactionId } = req.params;
  console.log(`Fetching bill details for transactionId: ${transactionId}`);
  try {
    const billItems = await getPool().query(`
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
    const result = await getPool().query('DELETE FROM bills WHERE transaction_id = $1', [transactionId]);
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
    const result = await getPool().query('SELECT * FROM suppliers ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/suppliers', async (req, res) => {
  const { name, mobile, address } = req.body;
  try {
    const result = await getPool().query(
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
    const result = await getPool().query(`
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
    const result = await getPool().query(`
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
    client = await getPool().connect();
    console.log("Database connection successful in dashboard handler.");
    // 1. Last 10 bills (grouped by transaction_id to get unique transactions)
    const lastBills = await client.query(`
      SELECT b.transaction_id::TEXT as transaction_id, 
             b.bill_no, 
             b.bill_date, 
             COALESCE(c.name, 'Walk-in') as customer_name, 
             b.grand_total, 
             SUM(b.pieces) as total_pieces
      FROM bills b
      LEFT JOIN customers c ON b.customer_id = c.id
      GROUP BY b.transaction_id, b.bill_no, b.bill_date, b.grand_total, c.name
      ORDER BY CASE WHEN b.bill_no ~ '^[0-9]+$' THEN CAST(b.bill_no AS INTEGER) ELSE 0 END DESC
      LIMIT 10
    `);

    // 2. Summary stats
    const stats = await client.query(`
      WITH unique_bills AS (
        SELECT DISTINCT ON (transaction_id) 
               transaction_id, customer_id, bill_date, grand_total 
        FROM bills
        ORDER BY transaction_id, id ASC
      ),
      basket_data AS (
        SELECT transaction_id, SUM(pieces) as total_pieces
        FROM bills
        GROUP BY transaction_id
      ),
      lifetime_data AS (
        SELECT 
          COALESCE(SUM(grand_total), 0) as total_rev,
          COALESCE(COUNT(*), 0) as total_bills
        FROM unique_bills
      ),
      pieces_data AS (
        SELECT COALESCE(SUM(pieces), 0) as total_pieces FROM bills
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
        ld.total_rev as lifetime_total,
        (SELECT name FROM (
          SELECT COALESCE(c.name, 'Walk-in') as name, SUM(b.grand_total) as total_spent 
          FROM unique_bills b 
          LEFT JOIN customers c ON b.customer_id = c.id 
          GROUP BY 1 ORDER BY total_spent DESC LIMIT 1
        ) t) as top_customer,
        (SELECT COALESCE(SUM(total_amount), 0) FROM purchases) as total_investment,
        pd.total_pieces as total_pieces_sold,
        CASE WHEN ld.total_bills > 0 THEN ld.total_rev / ld.total_bills ELSE 0 END as avg_bill_value,
        (SELECT COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY grand_total), 0) FROM unique_bills) as median_bill_value,
        (SELECT COALESCE(STDDEV_SAMP(grand_total), 0) FROM unique_bills) as std_dev_bill_value,
        CASE WHEN pd.total_pieces > 0 THEN ld.total_rev / pd.total_pieces ELSE 0 END as avg_selling_price,
        CASE WHEN ld.total_bills > 0 THEN CAST(pd.total_pieces AS DECIMAL) / ld.total_bills ELSE 0 END as avg_basket_size,
        (SELECT COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_pieces), 0) FROM basket_data) as median_basket_size,
        (SELECT COALESCE(STDDEV_SAMP(total_pieces), 0) FROM basket_data) as std_dev_basket_size
      FROM lifetime_data ld, pieces_data pd
    `);

    console.log("Calculated Dashboard Stats:", stats.rows[0]);

    // 3. Bill distribution for charts
    const billDistribution = await client.query(`
      SELECT
        range,
        COUNT(*) as count
      FROM (
        SELECT
          CASE
            WHEN grand_total < 2000 THEN '0-2000'
            WHEN grand_total >= 2000 AND grand_total < 3000 THEN '2000-3000'
            WHEN grand_total >= 3000 AND grand_total < 4000 THEN '3000-4000'
            WHEN grand_total >= 4000 AND grand_total < 5000 THEN '4000-5000'
            WHEN grand_total >= 5000 AND grand_total < 6000 THEN '5000-6000'
            WHEN grand_total >= 6000 AND grand_total < 7000 THEN '6000-7000'
            WHEN grand_total >= 7000 AND grand_total < 8000 THEN '7000-8000'
            WHEN grand_total >= 8000 AND grand_total < 9000 THEN '8000-9000'
            WHEN grand_total >= 9000 AND grand_total < 10000 THEN '9000-10000'
            ELSE '10000+'
          END as range,
          CASE
            WHEN grand_total < 2000 THEN 1
            WHEN grand_total < 3000 THEN 2
            WHEN grand_total < 4000 THEN 3
            WHEN grand_total < 5000 THEN 4
            WHEN grand_total < 6000 THEN 5
            WHEN grand_total < 7000 THEN 6
            WHEN grand_total < 8000 THEN 7
            WHEN grand_total < 9000 THEN 8
            WHEN grand_total < 10000 THEN 9
            ELSE 10
          END as sort_order
        FROM (
            SELECT DISTINCT ON (transaction_id) grand_total
            FROM bills
            ORDER BY transaction_id, id ASC
        ) unique_bills
      ) ranges
      GROUP BY range, sort_order
      ORDER BY sort_order
    `);

    // 4. Article distribution (Basket Size)
    const articleDistribution = await client.query(`
      SELECT
        CASE
          WHEN total_pieces = 1 THEN '1 Article'
          WHEN total_pieces = 2 THEN '2 Articles'
          WHEN total_pieces = 3 THEN '3 Articles'
          WHEN total_pieces = 4 THEN '4 Articles'
          ELSE '5+ Articles'
        END as range,
        COUNT(*) as count,
        MIN(total_pieces) as sort_val
      FROM (
        SELECT transaction_id, SUM(pieces) as total_pieces
        FROM bills
        GROUP BY transaction_id
      ) t
      GROUP BY 1
      ORDER BY sort_val ASC
    `);

    res.json({
      recentBills: lastBills.rows,
      summary: { ...stats.rows[0], __debug_ver: 3 },
      billDistribution: billDistribution.rows,
      articleDistribution: articleDistribution.rows
    });
  } catch (err) {
    console.error("Error fetching dashboard:", err);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  } finally {
    client.release();
  }
});

// Store front routes
// 404 handler
app.use((req, res) => {
  console.log(`404 - NOT FOUND: ${req.method} ${req.url}`);
  res.status(404).send(`Route ${req.url} not found`);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
