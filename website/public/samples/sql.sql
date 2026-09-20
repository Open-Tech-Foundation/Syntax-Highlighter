-- Showcase: SQL — DDL, DML, joins, CTEs, and window functions.
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       VARCHAR(320) NOT NULL UNIQUE,
    name        VARCHAR(120) NOT NULL DEFAULT 'anonymous',
    age         SMALLINT CHECK (age >= 0 AND age <= 150),
    score       DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata    JSON
);

CREATE TABLE IF NOT EXISTS orders (
    id          BIGINT PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    total       NUMERIC(12, 2) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    placed_at   DATE NOT NULL,
    CONSTRAINT positive_total CHECK (total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status, placed_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

CREATE VIEW IF NOT EXISTS active_users AS
SELECT id, email, name
FROM users
WHERE is_active = TRUE;

-- Seed data inside one transaction.
BEGIN TRANSACTION;

INSERT INTO users (email, name, age, score, is_active) VALUES
    ('ada@example.com', 'Ada', 36, 98.50, TRUE),
    ('grace@example.com', 'Grace', 85, 99.90, TRUE),
    ('alan@example.com', 'Alan', 41, 87.25, FALSE),
    ('katherine@example.com', 'Katherine', 28, NULL, TRUE);

INSERT INTO orders (id, user_id, total, status, placed_at) VALUES
    (1, 1, 19.99, 'shipped', '2026-01-04'),
    (2, 1, 5.49, 'pending', '2026-02-11'),
    (3, 2, 250.00, 'shipped', '2026-01-20'),
    (4, 3, 12.00, 'cancelled', '2026-03-02');

COMMIT;

-- Aggregates with grouping, having, and ordering.
SELECT
    u.name AS customer,
    COUNT(o.id) AS order_count,
    COALESCE(SUM(o.total), 0) AS lifetime_value,
    AVG(o.total) AS average_order,
    MAX(o.placed_at) AS last_order
FROM users AS u
LEFT JOIN orders AS o ON o.user_id = u.id
WHERE u.is_active = TRUE
GROUP BY u.id, u.name
HAVING COUNT(o.id) >= 1
ORDER BY lifetime_value DESC, customer ASC
LIMIT 10 OFFSET 0;

-- Common table expression plus a window function.
WITH monthly AS (
    SELECT
        strftime('%Y-%m', placed_at) AS month,
        SUM(total) AS revenue
    FROM orders
    WHERE status <> 'cancelled'
    GROUP BY month
)
SELECT
    month,
    revenue,
    SUM(revenue) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) AS running_total,
    RANK() OVER (ORDER BY revenue DESC) AS revenue_rank
FROM monthly;

-- Correlated subquery and set operators.
SELECT email
FROM users
WHERE id IN (SELECT user_id FROM orders WHERE total > 100.00)
UNION
SELECT email
FROM users
WHERE score IS NULL
EXCEPT
SELECT email
FROM users
WHERE is_active = FALSE;

-- Conditional expressions and string functions.
SELECT
    id,
    UPPER(SUBSTR(name, 1, 1)) || LOWER(SUBSTR(name, 2)) AS display_name,
    CASE
        WHEN score >= 90 THEN 'A'
        WHEN score >= 75 THEN 'B'
        WHEN score IS NULL THEN 'ungraded'
        ELSE 'C'
    END AS grade,
    LENGTH(email) - LENGTH(REPLACE(email, '@', '')) AS at_count
FROM users;

-- Updates, upserts, and deletes with returning.
UPDATE users SET score = score * 1.05 WHERE is_active = TRUE;

INSERT INTO users (email, name)
VALUES ('ada@example.com', 'Ada Lovelace')
ON CONFLICT (email) DO UPDATE SET name = excluded.name;

DELETE FROM orders WHERE status = 'cancelled' RETURNING id, total;

-- Schema evolution and cleanup.
ALTER TABLE users ADD COLUMN locale VARCHAR(10) DEFAULT 'en';
DROP VIEW IF EXISTS active_users;
VACUUM;
