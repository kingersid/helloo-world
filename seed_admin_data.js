require('dotenv').config();
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

const poolConfig = {
  connectionString: dbUrl,
};

if (dbUrl && (dbUrl.includes('proxy.rlwy.net') || dbUrl.includes('koyeb.app') || process.env.NODE_ENV === 'production')) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

const products = [
  {
    name: "Pure Mul Cotton Readymade Suit",
    description: "Elegant pure mul cotton readymade suit, breathable and handcrafted for everyday grace.",
    price: 4000.00,
    category: "Suits",
    stock_quantity: 15,
    fabric: "100% Pure Mul Cotton",
    size_options: "M,L,XL,2XL",
    garment_details: "Relaxed fit, 44 inches length, detailed with hand-done pintucks.",
    care_instructions: "Gentle machine wash cold, dry in shade.",
    image_url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Pure Mul Cotton Cord-set",
    description: "Modern and comfortable pure mul cotton cord-set, perfect for casual elegance.",
    price: 4200.00,
    category: "Cord-sets",
    stock_quantity: 12,
    fabric: "100% Pure Mul Cotton",
    size_options: "S,M,L,XL",
    garment_details: "Top length 30 inches, Pant length 38 inches, elasticated waistband.",
    care_instructions: "Gentle hand wash or dry clean recommended.",
    image_url: "https://images.unsplash.com/photo-1621335829175-95f437384d7c?auto=format&fit=crop&w=600&q=80"
  }
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log("Seeding admin products with details...");
    for (const p of products) {
      // Upsert logic (Update if exists, Insert if not)
      const exists = await client.query('SELECT id FROM products WHERE name = $1', [p.name]);
      if (exists.rows.length === 0) {
        await client.query(
          'INSERT INTO products (name, description, price, category, stock_quantity, image_url, fabric, size_options, garment_details, care_instructions) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [p.name, p.description, p.price, p.category, p.stock_quantity, p.image_url, p.fabric, p.size_options, p.garment_details, p.care_instructions]
        );
        console.log(`Inserted: ${p.name}`);
      } else {
        await client.query(
          'UPDATE products SET description=$2, price=$3, category=$4, stock_quantity=$5, image_url=$6, fabric=$7, size_options=$8, garment_details=$9, care_instructions=$10 WHERE name=$1',
          [p.name, p.description, p.price, p.category, p.stock_quantity, p.image_url, p.fabric, p.size_options, p.garment_details, p.care_instructions]
        );
        console.log(`Updated: ${p.name}`);
      }
    }
    console.log("Seeding complete.");
  } catch (err) {
    console.error("Error seeding products:", err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
