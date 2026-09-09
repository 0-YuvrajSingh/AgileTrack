-- Security migration: refresh tokens are now stored as SHA-256 hashes.
-- All existing sessions stored as raw UUID strings are invalidated.
-- Users will be required to log in again after this migration.
DELETE FROM refresh_tokens;

