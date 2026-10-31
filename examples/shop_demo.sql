-- Sample database: a small online accessories shop.
-- Load it with:  mysql -u root -p < examples/shop_demo.sql

DROP DATABASE IF EXISTS querysnap_demo;
CREATE DATABASE querysnap_demo;
USE querysnap_demo;

CREATE TABLE customer (
  cust_id     INT          PRIMARY KEY,
  first_name  VARCHAR(30)  NOT NULL,
  last_name   VARCHAR(30)  NOT NULL,
  email       VARCHAR(60)  NOT NULL UNIQUE,
  city        VARCHAR(40)  NOT NULL,
  state       CHAR(2)      NOT NULL,
  balance     DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  joined_on   DATE         NOT NULL
);

CREATE TABLE product (
  sku       VARCHAR(10)  PRIMARY KEY,
  name      VARCHAR(60)  NOT NULL,
  category  VARCHAR(30)  NOT NULL,
  price     DECIMAL(8,2) NOT NULL,
  in_stock  INT          NOT NULL
);

CREATE TABLE orders (
  order_id    INT  PRIMARY KEY,
  cust_id     INT  NOT NULL,
  order_date  DATE NOT NULL,
  status      VARCHAR(12) NOT NULL,
  CONSTRAINT fk_orders_customer FOREIGN KEY (cust_id) REFERENCES customer (cust_id)
);

CREATE TABLE order_line (
  order_id    INT          NOT NULL,
  line_no     INT          NOT NULL,
  sku         VARCHAR(10)  NOT NULL,
  quantity    INT          NOT NULL,
  unit_price  DECIMAL(8,2) NOT NULL,
  PRIMARY KEY (order_id, line_no),
  CONSTRAINT fk_line_order   FOREIGN KEY (order_id) REFERENCES orders (order_id),
  CONSTRAINT fk_line_product FOREIGN KEY (sku)      REFERENCES product (sku)
);

INSERT INTO customer VALUES
  (1,  'Ava',     'Patel',    'ava.patel@example.com',     'Newark',       'NJ', 120.50, '2023-02-11'),
  (2,  'Liam',    'Chen',     'liam.chen@example.com',     'Brooklyn',     'NY',   0.00, '2023-03-04'),
  (3,  'Sofia',   'Garcia',   'sofia.garcia@example.com',  'Austin',       'TX',  45.00, '2023-04-19'),
  (4,  'Noah',    'Kim',      'noah.kim@example.com',      'Jersey City',  'NJ', 310.75, '2023-05-02'),
  (5,  'Mia',     'Johnson',  'mia.johnson@example.com',   'Buffalo',      'NY',  15.25, '2023-06-23'),
  (6,  'Ethan',   'Brown',    'ethan.brown@example.com',   'Denver',       'CO',   0.00, '2023-07-08'),
  (7,  'Olivia',  'Rossi',    'olivia.rossi@example.com',  'Princeton',    'NJ',  89.99, '2023-09-14'),
  (8,  'Lucas',   'Silva',    'lucas.silva@example.com',   'Seattle',      'WA', 220.00, '2024-01-20'),
  (9,  'Emma',    'Nguyen',   'emma.nguyen@example.com',   'Albany',       'NY',   0.00, '2024-02-27'),
  (10, 'James',   'Okafor',   'james.okafor@example.com',  'Hoboken',      'NJ',  64.10, '2024-04-05');

INSERT INTO product VALUES
  ('KB-101', 'Mechanical Keyboard',      'Peripherals',  89.99,  42),
  ('MS-210', 'Wireless Mouse',           'Peripherals',  24.50, 120),
  ('MN-270', '27-inch Monitor',          'Displays',    229.00,  15),
  ('HD-330', 'Noise-Cancelling Headset', 'Audio',       129.00,  30),
  ('CB-040', 'USB-C Cable (2 m)',        'Accessories',   9.99, 300),
  ('HB-055', '7-Port USB Hub',           'Accessories',  34.95,  80),
  ('WC-610', '1080p Webcam',             'Video',        59.00,  25),
  ('SD-512', 'Laptop Stand',             'Accessories',  39.00,  60);

INSERT INTO orders VALUES
  (5001, 1, '2024-05-02', 'shipped'),
  (5002, 4, '2024-05-03', 'shipped'),
  (5003, 2, '2024-05-07', 'shipped'),
  (5004, 1, '2024-05-15', 'delivered'),
  (5005, 7, '2024-05-21', 'delivered'),
  (5006, 4, '2024-06-01', 'delivered'),
  (5007, 8, '2024-06-03', 'shipped'),
  (5008, 3, '2024-06-10', 'processing'),
  (5009, 4, '2024-06-12', 'processing'),
  (5010, 10, '2024-06-18', 'processing');

INSERT INTO order_line VALUES
  (5001, 1, 'KB-101', 1,  89.99),
  (5001, 2, 'CB-040', 2,   9.99),
  (5002, 1, 'MN-270', 2, 229.00),
  (5002, 2, 'HB-055', 1,  34.95),
  (5003, 1, 'MS-210', 1,  24.50),
  (5004, 1, 'HD-330', 1, 129.00),
  (5004, 2, 'SD-512', 1,  39.00),
  (5005, 1, 'WC-610', 1,  59.00),
  (5005, 2, 'CB-040', 3,   9.99),
  (5006, 1, 'KB-101', 1,  89.99),
  (5006, 2, 'MS-210', 2,  24.50),
  (5006, 3, 'SD-512', 1,  39.00),
  (5007, 1, 'MN-270', 1, 229.00),
  (5008, 1, 'HB-055', 2,  34.95),
  (5009, 1, 'WC-610', 1,  59.00),
  (5010, 1, 'HD-330', 1, 129.00),
  (5010, 2, 'CB-040', 1,   9.99);
