-- Idempotency for checkout. The browser sends a random key with each checkout
-- attempt; retries (a double-click, a flaky network resend) reuse the same key.
-- UNIQUE turns "same key twice" into a constraint violation the order service
-- catches, returning the first order instead of creating a duplicate.
--
-- This is a separate migration on purpose: 002 was already applied to existing
-- databases, so editing it would never run there. Applied migrations are
-- append-only; changes always go in a new file.
ALTER TABLE orders ADD COLUMN idempotency_key TEXT UNIQUE;
