-- migration_v2_customer_billing.sql
-- This migration ensures that every bill is linked to a customer, either existing or new.

-- 1. Ensure 'customers' table has proper unique constraints
-- If duplicate (name, mobile) pairs exist, they should be merged first using merge_duplicates.sql
-- Here we just ensure the constraint is active for future insertions.
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_name_mobile_key;
ALTER TABLE customers ADD CONSTRAINT customers_name_mobile_key UNIQUE (name, mobile);

-- 2. Ensure 'bills' table correctly references 'customers'
-- (Already implemented in server.js, but good to have here for record)
-- ALTER TABLE bills ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id);

-- 3. Optimization: Add index on customer name for faster autocomplete searches
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops);
-- Note: pg_trgm extension might be needed for the above index. 
-- If not available, use a standard B-tree index:
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- 4. Linking Orphan Bills (Optional - if any bills exist without customer_id)
-- This logic would depend on whether bills have name/mobile directly (they don't in current schema, they use customer_id)
-- If there were old bills with name/mobile as columns, we would migrate them here.

-- 5. Update ecommerce_orders to also use customer_id for consistency
ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id);

-- Populate customer_id in ecommerce_orders by matching name/mobile if they exist in customers table
UPDATE ecommerce_orders eo
SET customer_id = c.id
FROM customers c
WHERE eo.customer_name = c.name AND eo.customer_mobile = c.mobile
AND eo.customer_id IS NULL;
