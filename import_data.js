const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const records = [
  // IMG_2279
  { name: "Meet Khurana", pieces: 1, grand_total: 2995, status: "Paid" },
  { name: "Manish Uncle", pieces: 1, grand_total: 6990, status: "Paid" },
  { name: "Vishal Khanna", pieces: 2, grand_total: 5490, status: "Paid" },
  { name: "Avish Arya", pieces: 1, grand_total: 3000, status: "Paid" },
  { name: "Vimal Arya", pieces: 2, grand_total: 5000, status: "Unpaid" },
  { name: "Usha Aunty", pieces: 2, grand_total: 6350, status: "Paid" },
  { name: "Nisha Ji", pieces: 1, grand_total: 6295, status: "Paid" },
  { name: "Manya", pieces: 1, grand_total: 3395, status: "Paid" },
  { name: "Arpita", pieces: 2, grand_total: 6994, status: "Paid" },
  { name: "Parul", pieces: 1, grand_total: 2650, status: "Paid" },
  { name: "Shikha", pieces: 1, grand_total: 3600, status: "Paid" },
  { name: "Srishti", pieces: 1, grand_total: 3395, status: "Paid" },
  // IMG_2280
  { name: "Neetu", pieces: 2, grand_total: 5500, status: "Paid" },
  { name: "Neeti", pieces: 1, grand_total: 2995, status: "Paid" },
  { name: "Sunita Ji", pieces: 1, grand_total: 3445, status: "Paid" },
  { name: "Jyoti", pieces: 1, grand_total: 3995, status: "Paid" },
  { name: "Jamdani Neha", pieces: 2, grand_total: 4100, status: "Paid" },
  { name: "Megha Madnani", pieces: 1, grand_total: 2995, status: "Paid" },
  { name: "Megha Kapoor", pieces: 1, grand_total: 3500, status: "Paid" },
  { name: "Kritika", pieces: 5, grand_total: 15890, status: "Paid" },
  { name: "Madhu", pieces: 2, grand_total: 6490, status: "Paid" },
  { name: "Dipika Kinger", pieces: 3, grand_total: 7400, status: "Paid" },
  // IMG_2281
  { name: "Nisha Mami", pieces: 1, grand_total: 3200, status: "Paid" },
  { name: "Manisha Mami - GR", pieces: 0, grand_total: 0, status: "Cancelled" },
  { name: "Neelam Verma (Pune)", pieces: 2, grand_total: 5290, status: "Paid" },
  { name: "Sonal Khurana", pieces: 1, grand_total: 2999, status: "Paid" },
  { name: "Anjuman Swiss", pieces: 1, grand_total: 3599, status: "Paid" },
  { name: "Manish Uncle", pieces: 2, grand_total: 6850, status: "Paid" },
  { name: "Manish Uncle", pieces: 1, grand_total: 2899, status: "Paid" },
  { name: "Anju Aunty", pieces: 1, grand_total: 3000, status: "Paid" },
  { name: "Bhavisha", pieces: 1, grand_total: 6000, status: "Paid" },
  { name: "C. Sale", pieces: 1, grand_total: 2495, status: "Paid" },
  { name: "C. Sale", pieces: 1, grand_total: 1999, status: "Paid" },
  { name: "Rachita", pieces: 1, grand_total: 3000, status: "Paid" },
  // IMG_2282
  { name: "Parna Sehgal", pieces: 1, grand_total: 2050, status: "Paid" },
  { name: "Parna Sehgal", pieces: 1, grand_total: 2800, status: "Paid" },
  { name: "Kavita", pieces: 1, grand_total: 3800, status: "Paid" },
  { name: "Asha Aunty", pieces: 3, grand_total: 9000, status: "Paid" },
  { name: "Bhavisha", pieces: 1, grand_total: 6000, status: "Paid" },
  { name: "Rita", pieces: 2, grand_total: 5100, status: "Paid" },
  { name: "Ekta", pieces: 1, grand_total: 2600, status: "Paid Cash" },
  { name: "Sonal", pieces: 1, grand_total: 3500, status: "Paid Cash" },
  { name: "Savita", pieces: 1, grand_total: 3500, status: "Paid Cash" },
  { name: "Anita", pieces: 1, grand_total: 3000, status: "Paid Cash" },
  { name: "Vibha Ji", pieces: 1, grand_total: 4200, status: "Paid Cash" },
  { name: "Rachita", pieces: 2, grand_total: 5000, status: "Paid Cash" },
  { name: "Sunita", pieces: 1, grand_total: 3995, status: "Paid Cash" },
  // IMG_2283
  { name: "Sunita", pieces: 2, grand_total: 7000, status: "Cash Paid" },
  { name: "Mansi Hirani", pieces: 2, grand_total: 5800, status: "Cash Paid" },
  { name: "Asha Ji", pieces: 1, grand_total: 3000, status: "Online Paid" },
  { name: "Mintu", pieces: 2, grand_total: 4500, status: "Cash Paid" },
  { name: "Pinky Jain", pieces: 1, grand_total: 3999, status: "Cash Online" },
  { name: "Neelam", pieces: 1, grand_total: 4000, status: "Cash" },
  { name: "Simran", pieces: 2, grand_total: 5500, status: "Cash Online" },
  { name: "Tripti Ji", pieces: 1, grand_total: 3999, status: "Cash Paid" },
  { name: "Heena Nanavati", pieces: 1, grand_total: 3500, status: "Online Paid" },
  { name: "Mintu", pieces: 1, grand_total: 4000, status: "Cash Paid" },
  { name: "Maatoo Mam", pieces: 5, grand_total: 16000, status: "Online Paid" },
  { name: "Devanshi", pieces: 1, grand_total: 2899, status: "Cash Paid" },
  { name: "Sunita N. D. J.", pieces: 1, grand_total: 4500, status: "Cash" },
  { name: "Sunita N. D. J.", pieces: 0, grand_total: 85, status: "Shipping Charges" },
  // IMG_2284
  { name: "Manju Bua", pieces: 1, grand_total: 3600, status: "pending" },
  { name: "Rimpy Vaid", pieces: 1, grand_total: 3000, status: "pending" },
  { name: "Megha Kapoor", pieces: 1, grand_total: 3500, status: "" }
];

const importData = async () => {
  const client = await pool.connect();
  const crypto = require('crypto');
  try {
    await client.query('BEGIN');

    let billNoCounter = 1;
    
    for (const record of records) {
      if (record.status === 'Cancelled') continue;
      
      let customerResult = await client.query('SELECT id FROM customers WHERE name = $1', [record.name]);
      let customerId;
      
      if (customerResult.rows.length === 0) {
        const newCustomer = await client.query(
          'INSERT INTO customers (name) VALUES ($1) RETURNING id',
          [record.name]
        );
        customerId = newCustomer.rows[0].id;
      } else {
        customerId = customerResult.rows[0].id;
      }
      
      const pieces = record.pieces > 0 ? record.pieces : 1;
      const amountPerPiece = record.grand_total / pieces;
      const articleName = record.status === 'Shipping Charges' ? 'Shipping Charges' : `Item (${record.status})`;
      
      const transactionId = crypto.randomUUID();
      
      await client.query(
        `INSERT INTO bills (transaction_id, bill_no, customer_id, article_name, pieces, amount_per_piece, total, grand_total) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [transactionId, (billNoCounter++).toString(), customerId, articleName, record.pieces, amountPerPiece, record.grand_total, record.grand_total]
      );
    }

    await client.query('COMMIT');
    console.log('Imported successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error importing:', err);
  } finally {
    client.release();
    await pool.end();
  }
};

importData();
