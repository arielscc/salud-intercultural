-- Creates the isolated test database when the local PostgreSQL volume is initialized.
-- This script runs only on first container initialization. If the named volume
-- already exists, recreate it with: docker compose down -v && docker compose up -d postgres

SELECT 'CREATE DATABASE salud_intercultural_test OWNER salud_intercultural'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'salud_intercultural_test'
)\gexec
