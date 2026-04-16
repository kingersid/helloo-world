require('dotenv').config();
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
const poolConfig = {
  connectionString: dbUrl,
};

if (dbUrl && (dbUrl.includes('proxy.rlwy.net') || dbUrl.includes('koyeb.app') || dbUrl.includes('supabase.co') || process.env.NODE_ENV === 'production')) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

async function testQuery() {
  const client = await pool.connect();
  try {
    const stats = await client.query(`
      WITH unique_bills AS (
        SELECT DISTINCT ON (transaction_id) 
               transaction_id, customer_id, bill_date, grand_total 
        FROM bills
        ORDER BY transaction_id
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
        (SELECT total_rev FROM lifetime_data) as lifetime_total,
        (SELECT name FROM (
          SELECT COALESCE(c.name, 'Walk-in') as name, SUM(b.grand_total) as total_spent 
          FROM unique_bills b 
          LEFT JOIN customers c ON b.customer_id = c.id 
          GROUP BY 1 ORDER BY total_spent DESC LIMIT 1
        ) t) as top_customer,
        (SELECT COALESCE(SUM(total_amount), 0) FROM purchases) as total_investment,
        (SELECT total_pieces FROM pieces_data) as total_pieces_sold,
        (SELECT CASE WHEN total_bills > 0 THEN total_rev / total_bills ELSE 0 END FROM lifetime_data) as avg_bill_value,
        (SELECT CASE WHEN (SELECT total_pieces FROM pieces_data) > 0 THEN (SELECT total_rev FROM lifetime_data) / (SELECT total_pieces FROM pieces_data) ELSE 0 END) as avg_selling_price,
        (SELECT CASE WHEN (SELECT total_bills FROM lifetime_data) > 0 THEN CAST((SELECT total_pieces FROM pieces_data) AS DECIMAL) / (SELECT total_bills FROM lifetime_data) ELSE 0 END) as avg_basket_size
    `);
    console.log(JSON.stringify(stats.rows[0], null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

testQuery();
