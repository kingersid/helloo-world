# API Documentation

The Hello World Billing System provides a JSON-based REST API for managing invoices, suppliers, purchases, and dashboard data.

## 📊 Dashboard API

### `GET /api/dashboard`

Retrieves summary statistics and the 10 most recent transactions.

**Response Body:**
```json
{
  "recentBills": [
    {
      "transaction_id": "uuid",
      "bill_no": "123",
      "bill_date": "timestamp",
      "name": "Customer Name",
      "grand_total": 5000,
      "created_at": "timestamp"
    }
  ],
  "summary": {
    "current_month_total": 15000.00,
    "last_month_total": 12000.00,
    "best_month_total": 20000.00,
    "year_total": 150000.00,
    "lifetime_total": 250000.00,
    "top_customer": "John Doe",
    "total_investment": 50000.00
  }
}
```

## 🧾 Billing API

### `GET /api/bills`

Lists all unique bill transactions, grouped by `transaction_id`.

**Response Body:**
```json
[
  {
    "transaction_id": "uuid",
    "bill_no": "123",
    "bill_date": "timestamp",
    "grand_total": 5000,
    "customer_name": "Customer Name",
    "mobile": "9876543210"
  }
]
```

### `GET /api/bills/:transactionId`

Retrieves detailed items for a specific transaction.

**Response Body:**
```json
{
  "transactionId": "uuid",
  "billNo": "123",
  "customerName": "Customer Name",
  "customerMobile": "9876543210",
  "billDate": "timestamp",
  "grandTotal": 5000,
  "items": [
    {
      "article": "Item Name",
      "pieces": 2,
      "pricePerPiece": 2500,
      "total": 5000
    }
  ]
}
```

### `POST /api/bills`

Creates a new bill or updates an existing one if `transactionId` is provided.

**Request Body:**
```json
{
  "name": "Customer Name",
  "mobile": "9876543210",
  "billDate": "2024-03-21T10:00",
  "billNo": "123",
  "items": [
    {
      "article": "Item Name",
      "pieces": 2,
      "pricePerPiece": 2500,
      "total": 5000
    }
  ],
  "grandTotal": 5000,
  "transactionId": "uuid" (optional)
}
```

### `DELETE /api/bills/:transactionId`

Deletes all bill items associated with the specified `transactionId`.

---

## 📦 Suppliers API

### `GET /api/suppliers`

Lists all verified suppliers.

### `POST /api/suppliers`

Adds a new supplier.

**Request Body:**
```json
{
  "name": "Supplier Name",
  "mobile": "1122334455",
  "address": "Supplier Address"
}
```

---

## 💰 Purchases API

### `GET /api/purchases`

Lists all recorded stock purchases.

### `POST /api/purchases`

Logs a new stock purchase.

**Request Body:**
```json
{
  "supplier_id": 1,
  "article_name": "Item Name",
  "pieces": 10,
  "base_amount": 5000,
  "gst_amount": 900,
  "total_amount": 5900,
  "payment_mode": "Cash",
  "purchase_date": "2024-03-21T10:00"
}
```
