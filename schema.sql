-- Create the quotes table
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_number VARCHAR(255) UNIQUE NOT NULL,
    customer_first_name VARCHAR(255),
    customer_surname VARCHAR(255),
    customer_mobile VARCHAR(255),
    customer_email VARCHAR(255),
    zoho_id VARCHAR(255),
    spot_price_gold_gram_nzd DECIMAL(10, 4),
    spot_price_silver_gram_nzd DECIMAL(10, 4),
    spot_price_gold_ounce_nzd DECIMAL(10, 4),
    spot_price_silver_ounce_nzd DECIMAL(10, 4),
    totals JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the quote_items table
CREATE TABLE quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    item_name TEXT,
    metal_type VARCHAR(50),
    percent DECIMAL(5, 2),
    weight DECIMAL(10, 2)
);

-- Create the sequences table for quote numbers
CREATE TABLE sequences (
    name TEXT PRIMARY KEY,
    value INTEGER NOT NULL
);

-- Initialize the quote number sequence
INSERT INTO sequences (name, value) VALUES ('quote_number', 283);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at timestamp on quotes table
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON quotes
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Add indexes for performance
CREATE INDEX idx_quotes_customer_mobile ON quotes(customer_mobile);
CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);
