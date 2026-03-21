# Database Schema Documentation

The Hello World Billing System uses a PostgreSQL database with a simple but effective schema for managing customers, invoices, and stock.

## 🗄️ Table Definitions

### `customers`
Stores information about your clients.
- `id`: `SERIAL` (Primary Key)
- `name`: `TEXT` (Not Null)
- `mobile`: `TEXT`
- **Unique Constraint:** `(name, mobile)` - Prevents duplicate customer entries.

### `bills`
Stores individual line items for an invoice. Multiple rows can share the same `transaction_id`.
- `id`: `SERIAL` (Primary Key)
- `transaction_id`: `UUID` (Defaults to `gen_random_uuid()`) - Used to group multiple items into a single invoice.
- `bill_no`: `TEXT` - A human-readable invoice number.
- `customer_id`: `INTEGER` (Foreign Key -> `customers.id`)
- `article_name`: `TEXT` (Not Null)
- `pieces`: `INTEGER` (Not Null)
- `amount_per_piece`: `DECIMAL(10, 2)` (Not Null)
- `total`: `DECIMAL(10, 2)` (Not Null) - `pieces * amount_per_piece`
- `grand_total`: `DECIMAL(10, 2)` (Not Null) - The total for the entire transaction (stored on each row for convenience).
- `bill_date`: `TIMESTAMP` (Defaults to `CURRENT_TIMESTAMP`)
- `created_at`: `TIMESTAMP` (Defaults to `CURRENT_TIMESTAMP`)

### `suppliers`
Stores contact information for stock suppliers.
- `id`: `SERIAL` (Primary Key)
- `name`: `TEXT` (Not Null)
- `mobile`: `TEXT`
- `address`: `TEXT`
- **Unique Constraint:** `(name, mobile)`

### `purchases`
Stores stock purchase records (investment).
- `id`: `SERIAL` (Primary Key)
- `supplier_id`: `INTEGER` (Foreign Key -> `suppliers.id`)
- `article_name`: `TEXT` (Not Null)
- `pieces`: `INTEGER` (Not Null)
- `base_amount`: `DECIMAL(10, 2)` (Not Null)
- `gst_amount`: `DECIMAL(10, 2)` (Not Null)
- `total_amount`: `DECIMAL(10, 2)` (Not Null) - `base_amount + gst_amount`
- `payment_mode`: `TEXT` (Not Null) - e.g., 'Cash', 'Online'
- `purchase_date`: `TIMESTAMP` (Defaults to `CURRENT_TIMESTAMP`)
- `created_at`: `TIMESTAMP` (Defaults to `CURRENT_TIMESTAMP`)

## ⚡ Key Logic & Migrations

The database is initialized and migrated automatically in `server.js` using the `initDB()` function.

### 🔄 Automatic Bill Re-numbering
On startup, the system groups all items by `transaction_id` and re-numbers them sequentially (`bill_no`) based on their date. This ensures a clean, gaps-free invoicing system even if records are deleted or imported out of order.

### 🛡️ Transactions
All bill creations and updates use SQL transactions (`BEGIN`, `COMMIT`, `ROLLBACK`) to ensure that either all items in an invoice are saved correctly or none are.
