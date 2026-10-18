-- Run once in the Neon SQL editor of the project that holds public.public_bonds (the one the
-- main app fills every day through PUBLIC_EXPORT_DATABASE_URL), as the owner role, AFTER creating
-- the role "tenbonds_reader" in Neon's Roles screen (Neon generates its password).
-- Keep the "public" schema for that one table only: the export refuses to write if any other
-- table appears there. Accounts and subscriptions (step 2) will live in a schema called "app".
GRANT CONNECT ON DATABASE neondb TO tenbonds_reader;
GRANT USAGE ON SCHEMA public TO tenbonds_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO tenbonds_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO tenbonds_reader;
-- The website can read the bond table and nothing else; it can never write to it.
