-- Set timezone to New Zealand
SET TIMEZONE='Pacific/Auckland';

-- Create the quotes table
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_id VARCHAR(8) UNIQUE NOT NULL,
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
    spot_price_updated_at TIMESTAMPTZ,
    totals JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    show_quoted_rate BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
);

-- Create the quote_items table
CREATE TABLE quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    item_name TEXT,
    metal_type VARCHAR(50),
    percent DECIMAL(5, 2),
    weight DECIMAL(10, 2),
    weight_type VARCHAR(50),
    quantity INTEGER NOT NULL DEFAULT 1
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

-- Create the settings table
CREATE TABLE settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize the spot normalisation offset setting (default 0.25%)
INSERT INTO settings (key, value) VALUES ('spot_normalisation_offset', '0.25');

-- Create the session table for connect-pg-simple
CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX "IDX_session_expire" ON "session" ("expire");

-- Add indexes for performance
CREATE INDEX idx_quotes_customer_mobile ON quotes(customer_mobile);
CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);
