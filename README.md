# Hello World Billing System

A professional billing and stock management system designed for businesses, built with Node.js and PostgreSQL, and optimized for deployment on [Railway](https://railway.app/).

## 🚀 Features

### 📊 Comprehensive Dashboard
- **Sales Summaries:** Real-time tracking of current month, last month, and annual revenue.
- **Performance Metrics:** Highlights the "Best Month" in the last 12 months and lifetime total sales.
- **Stock Tracking:** Monitor total investment in stock.
- **Top Client:** Identifies your most valuable customer.
- **Recent Transactions:** Quick view of the latest 10 bills with easy edit/delete actions.

### 🧾 Invoice Management
- **Professional Invoices:** Create, edit, and manage professional-grade invoices.
- **Handwritten Aesthetic:** Beautifully designed using Merriweather and Caveat (handwriting) fonts for a personalized feel.
- **Auto-numbering:** Intelligent sequential bill numbering.
- **Multi-item Support:** Add multiple articles to a single invoice with automatic total calculation.
- **WhatsApp Integration:** Send invoices directly to customers via WhatsApp with pre-filled professional messages.
- **PDF Generation:** Download professional PDF invoices to your local machine for printing or manual sharing.

### 📦 Stock & Supplier Management
- **Supplier Directory:** Maintain a database of verified suppliers with contact and address details.
- **Purchase Logging:** Track all stock purchases, including base amounts, GST, and payment modes.
- **Investment Tracking:** Automatically calculate total investment based on purchase history.

### 🛠️ Technical Excellence
- **Database Migrations:** Automatic schema initialization and migrations on startup.
- **Transaction Safety:** Uses SQL transactions (BEGIN/COMMIT/ROLLBACK) to ensure data integrity.
- **RESTful API:** Clean API endpoints for bills, suppliers, purchases, and dashboard data.

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL (`pg` client)
- **Frontend:** Vanilla JavaScript, HTML5, CSS3 (Modern SPA architecture)
- **Deployment:** Railway CLI & Platform
- **Fonts:** Google Fonts (Merriweather, Caveat)

## 📁 Project Structure

```text
├── server.js           # Express server and API endpoints
├── index.html          # Main frontend (SPA)
├── package.json        # Node.js dependencies and scripts
├── seed.js             # Initial database seeding script
├── import_data.js      # Legacy data import script
├── verify.js           # Database verification script
├── start_local.sh      # Local startup script using Railway environment
├── assets/             # Static assets (logo, etc.)
├── public/             # Publicly accessible images
└── railway-cli/        # Custom Gemini CLI skill for Railway management
```

## ⚙️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v14+)
- [Railway CLI](https://docs.railway.app/guides/cli)
- A PostgreSQL database (Railway Postgres service recommended)

### Local Setup
1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd hello-world
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Ensure you have a `DATABASE_URL` environment variable. If using Railway, you can use the provided script.

4. **Run the application:**
   ```bash
   # Using Railway CLI to fetch environment variables
   ./start_local.sh
   
   # Or manually
   export DATABASE_URL=your_postgres_url
   node server.js
   ```

5. **Access the UI:**
   Open `http://localhost:3000` in your browser.

## 💾 Database Schema

### `customers`
- `id`: Primary Key
- `name`: Text (Not Null)
- `mobile`: Text

### `bills`
- `id`: Primary Key
- `transaction_id`: UUID (Grouped items in one bill)
- `bill_no`: Text
- `customer_id`: Foreign Key to `customers`
- `article_name`: Text
- `pieces`: Integer
- `amount_per_piece`: Decimal
- `total`: Decimal
- `grand_total`: Decimal
- `bill_date`: Timestamp

### `suppliers`
- `id`: Primary Key
- `name`: Text
- `mobile`: Text
- `address`: Text

### `purchases`
- `id`: Primary Key
- `supplier_id`: Foreign Key to `suppliers`
- `article_name`: Text
- `pieces`: Integer
- `base_amount`: Decimal
- `gst_amount`: Decimal
- `total_amount`: Decimal
- `payment_mode`: Text
- `purchase_date`: Timestamp

## 📡 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard` | `GET` | Get summary statistics and recent bills |
| `/api/bills` | `GET` | List all unique bill transactions |
| `/api/bills` | `POST` | Create or update a bill transaction |
| `/api/bills/:id` | `GET` | Get detailed items for a specific transaction |
| `/api/bills/:id` | `DELETE`| Delete a bill transaction |
| `/api/suppliers` | `GET` | List all suppliers |
| `/api/suppliers` | `POST` | Add a new supplier |
| `/api/purchases` | `GET` | List all purchase records |
| `/api/purchases` | `POST` | Log a new stock purchase |

## 🚢 Deployment (Railway)

The project is optimized for Railway. Use the following commands:

```bash
# Link to your Railway project
railway link

# Deploy the application
railway up
```

Ensure your Railway project has a **Postgres** service and its `DATABASE_URL` is automatically linked to your web service.

## 🤝 Contributing

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.
