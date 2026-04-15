-- merge_duplicates.sql

-- Function to safely merge customer IDs
CREATE OR REPLACE FUNCTION merge_customers(canonical_id INTEGER, duplicate_id INTEGER)
RETURNS VOID AS $$
BEGIN
    IF canonical_id = duplicate_id THEN
        RETURN;
    END IF;

    RAISE NOTICE 'Merging duplicate ID % into canonical ID %', duplicate_id, canonical_id;

    -- Update all referencing tables
    UPDATE bills SET customer_id = canonical_id WHERE customer_id = duplicate_id;
    UPDATE bills_clone SET customer_id = canonical_id WHERE customer_id = duplicate_id;
    UPDATE wishlists SET customer_id = canonical_id WHERE customer_id = duplicate_id;
    UPDATE ecommerce_orders SET customer_id = canonical_id WHERE customer_id = duplicate_id;

    -- Delete the duplicate from customers table
    DELETE FROM customers WHERE id = duplicate_id;
END;
$$ LANGUAGE plpgsql;

-- Perform Merges
DO $$
BEGIN
    -- Megha Kapoor: Merge 22, 96, 97 into 68 (68 has a mobile number)
    PERFORM merge_customers(68, 22);
    PERFORM merge_customers(68, 96);
    PERFORM merge_customers(68, 97);

    -- Asha Aunty: Merge 36 into 94
    PERFORM merge_customers(94, 36);

    -- Rajvi Aagam: Merge 74 into 75
    PERFORM merge_customers(75, 74);

    -- Rimpy Vaid: Merge 63 into 56
    PERFORM merge_customers(56, 63);
    
    -- C. Sale / CSALE: Merge 32 into 83
    PERFORM merge_customers(83, 32);

END $$;

DROP FUNCTION merge_customers(INTEGER, INTEGER);
