-- Example spec file for the querysnap_demo database (examples/shop_demo.sql).
-- Run it with:  node snap.js examples/example-queries.sql screenshots

-- @problem 1
-- @db querysnap_demo
SELECT cust_id, first_name, last_name, city, state, balance
FROM customer
WHERE state IN ('NJ', 'NY')
ORDER BY balance DESC;

-- @problem 2
-- @db querysnap_demo
SELECT c.cust_id, c.first_name, c.last_name,
       COUNT(DISTINCT o.order_id) AS orders,
       SUM(l.quantity * l.unit_price) AS total_spent
FROM customer c
     JOIN orders o ON o.cust_id = c.cust_id
     JOIN order_line l ON l.order_id = o.order_id
GROUP BY c.cust_id, c.first_name, c.last_name
ORDER BY total_spent DESC;

-- @problem 3
-- @db querysnap_demo
SELECT c.cust_id, c.first_name, c.last_name, o.order_id, o.order_date
FROM customer c
     LEFT JOIN orders o ON o.cust_id = c.cust_id
WHERE o.order_id IS NULL
ORDER BY c.cust_id;

-- @problem 4
-- @db querysnap_demo
UPDATE product
SET in_stock = in_stock - 1
WHERE sku = 'MN-270';
-- @verify
SELECT sku, name, in_stock FROM product WHERE sku = 'MN-270';

-- @problem 5
-- @db querysnap_demo
DROP TABLE IF EXISTS supplier;

CREATE TABLE supplier (
    supplier_id  INT          PRIMARY KEY,
    name         VARCHAR(60)  NOT NULL,
    country      CHAR(2)      NOT NULL
);
-- @verify
DESCRIBE supplier;
