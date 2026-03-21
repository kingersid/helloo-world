const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const verify = async () => {
  const client = await pool.connect();
  try {
    console.log('Fetching customers...');
    const customers = await client.query('SELECT * FROM customers');
    console.table(customers.rows);

    console.log('Fetching suppliers...');
    const suppliers = await client.query('SELECT * FROM suppliers');
    console.table(suppliers.rows);

    console.log('Fetching bills...');
    const bills = await client.query('SELECT * FROM bills ORDER BY bill_date DESC');
    console.table(bills.rows);

    console.log('Fetching purchases...');
    const purchases = await client.query('SELECT article_name, total_amount FROM purchases');
    console.table(purchases.rows);

  } catch (err) {
    console.error('Error fetching data:', err);
  } finally {
    client.release();
    await pool.end();
  }
};

verify();
