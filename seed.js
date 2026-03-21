const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Seeding customers...');
    const customers = [
      ['John Doe', '9876543210'],
      ['Jane Smith', '8765432109'],
      ['Bob Wilson', '7654321098'],
    ];

    for (const [name, mobile] of customers) {
      await client.query(
        'INSERT INTO customers (name, mobile) VALUES ($1, $2) ON CONFLICT (name, mobile) DO NOTHING',
        [name, mobile]
      );
    }

    console.log('Seeding suppliers...');
    const suppliers = [
      ['Global Textiles', '1122334455', '123 Textile Ave, NY'],
      ['Quality Fabrics', '5544332211', '456 Silk Road, CA'],
    ];

    for (const [name, mobile, address] of suppliers) {
      await client.query(
        'INSERT INTO suppliers (name, mobile, address) VALUES ($1, $2, $3) ON CONFLICT (name, mobile) DO NOTHING',
        [name, mobile, address]
      );
    }

    // Get some IDs to link
    const customerIds = (await client.query('SELECT id FROM customers')).rows.map(r => r.id);
    const supplierIds = (await client.query('SELECT id FROM suppliers')).rows.map(r => r.id);

    console.log('Seeding bills...');
    if (customerIds.length > 0) {
      const bills = [
        [customerIds[0], 'Cotton Shirt', 2, 500, 1000, 1000],
        [customerIds[1], 'Silk Scarf', 1, 1500, 1500, 1500],
      ];

      for (const [cid, article, pieces, price, total, grandTotal] of bills) {
        await client.query(
          'INSERT INTO bills (customer_id, article_name, pieces, amount_per_piece, total, grand_total) VALUES ($1, $2, $3, $4, $5, $6)',
          [cid, article, pieces, price, total, grandTotal]
        );
      }
    }

    console.log('Seeding purchases...');
    if (supplierIds.length > 0) {
      const purchases = [
        [supplierIds[0], 'Cotton Roll', 10, 2000, 360, 2360, 'Cash'],
        [supplierIds[1], 'Silk Thread', 50, 1000, 180, 1180, 'Online'],
      ];

      for (const [sid, article, pieces, base, gst, total, mode] of purchases) {
        await client.query(
          'INSERT INTO purchases (supplier_id, article_name, pieces, base_amount, gst_amount, total_amount, payment_mode) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [sid, article, pieces, base, gst, total, mode]
        );
      }
    }

    await client.query('COMMIT');
    console.log('Seeding completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding database:', err);
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
