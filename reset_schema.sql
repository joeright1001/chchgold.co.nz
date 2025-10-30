-- Drop existing tables in reverse order of dependency to avoid errors
-- Drop existing tables in reverse order of dependency to avoid errors
DROP TABLE IF EXISTS quote_items;
DROP TABLE IF EXISTS quotes;
DROP TABLE IF EXISTS sequences;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS "session";

-- The rest of the schema will be sourced from schema.sql
