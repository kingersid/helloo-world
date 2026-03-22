const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const placeholders = [
  {
    name: "Midnight Silk Saree",
    description: "Hand-woven pure silk saree with intricate gold zari borders. Perfect for evening galas.",
    price: 12500,
    image_url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
    category: "Sarees",
    stock_quantity: 5
  },
  {
    name: "Royal Velvet Leheriya",
    description: "Traditional Rajasthani leheriya pattern on premium velvet fabric with stone work.",
    price: 8900,
    image_url: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=800&q=80",
    category: "Lehengas",
    stock_quantity: 3
  },
  {
    name: "Emerald Anarkali Suit",
    description: "Floor-length emerald green anarkali with delicate hand embroidery and chiffon dupatta.",
    price: 6500,
    image_url: "https://images.unsplash.com/photo-1594463536371-3604f7c8ec23?auto=format&fit=crop&w=800&q=80",
    category: "Suits",
    stock_quantity: 8
  },
  {
    name: "Pearl White Sherwani",
    description: "Elegant pearl white silk sherwani with subtle self-pattern and antique buttons.",
    price: 15000,
    image_url: "https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=800&q=80",
    category: "Menswear",
    stock_quantity: 4
  },
  {
    name: "Golden Jhumka Earrings",
    description: "Classic 22k gold-plated jhumkas with hanging pearls and floral motifs.",
    price: 2200,
    image_url: "https://images.unsplash.com/photo-1635767798638-3e25273a8236?auto=format&fit=crop&w=800&q=80",
    category: "Jewelry",
    stock_quantity: 15
  },
  {
    name: "Hand-Block Printed Kurta",
    description: "Breathable cotton kurta with traditional indigo hand-block prints from Jaipur.",
    price: 1800,
    image_url: "https://images.unsplash.com/photo-1605518216938-7c31b7b14ad0?auto=format&fit=crop&w=800&q=80",
    category: "Casuals",
    stock_quantity: 20
  }
];

async function seedProducts() {
  const client = await pool.connect();
  try {
    console.log("Seeding placeholder products...");
    for (const p of placeholders) {
      await client.query(
        'INSERT INTO products (name, description, price, image_url, category, stock_quantity) VALUES ($1, $2, $3, $4, $5, $6)',
        [p.name, p.description, p.price, p.image_url, p.category, p.stock_quantity]
      );
    }
    console.log("Seeding complete!");
  } catch (err) {
    console.error("Error seeding products:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedProducts();
