-- Run once in the Neon SQL editor of the 10BONDS project, as the owner role.
-- The main app (lm-op-model) creates and fills public.public_bonds every day through its own
-- PUBLIC_EXPORT_DATABASE_URL. Keep the "public" schema for that one table only: the export refuses
-- to write if any other table appears there. Accounts and subscriptions (step 2) will live in a
-- separate schema called "app".

-- 1. A read-only login for the public website.
CREATE ROLE tenbonds_reader LOGIN PASSWORD 'choose-a-long-random-password';
GRANT CONNECT ON DATABASE neondb TO tenbonds_reader;
GRANT USAGE ON SCHEMA public TO tenbonds_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO tenbonds_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO tenbonds_reader;
-- The website can read the bond table and nothing else; it can never write to it.
