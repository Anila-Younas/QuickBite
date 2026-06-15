-- Migration: Add version and last_updated columns to ORDERS table for optimistic concurrency control
ALTER TABLE ORDERS ADD (
    version NUMBER DEFAULT 1,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update existing orders to have version 1
UPDATE ORDERS SET version = 1, last_updated = created_at;

-- Create trigger to update version and last_updated on each update
CREATE OR REPLACE TRIGGER trg_orders_optimistic_locking
BEFORE UPDATE ON ORDERS
FOR EACH ROW
BEGIN
    :NEW.version := :OLD.version + 1;
    :NEW.last_updated := CURRENT_TIMESTAMP;
END;
/

COMMIT;