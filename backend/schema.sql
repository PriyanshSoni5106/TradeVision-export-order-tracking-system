-- Run npm run setup to create the configured database and admin.
-- Alternatively, create/select a database in Workbench and execute these tables,
-- then run npm run setup to create the admin account.
CREATE TABLE IF NOT EXISTS admins (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 username VARCHAR(60) NOT NULL UNIQUE,
 password_hash VARCHAR(200) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS products (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(120) NOT NULL,
 description VARCHAR(500) NOT NULL DEFAULT '',
 unit_price DECIMAL(10,2) NOT NULL,
 CONSTRAINT positive_price CHECK (unit_price > 0)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS customers (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(120) NOT NULL,
 company VARCHAR(120) NOT NULL,
 country VARCHAR(80) NOT NULL,
 email VARCHAR(160) NOT NULL,
 phone VARCHAR(30) NOT NULL DEFAULT ''
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS orders (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 customer_id INT UNSIGNED NOT NULL,
 product_id INT UNSIGNED NOT NULL,
 quantity INT UNSIGNED NOT NULL,
 order_price DECIMAL(10,2) NOT NULL,
 total_amount DECIMAL(16,2) NOT NULL,
 order_date DATE NOT NULL,
 status ENUM('Pending','Processing','Shipped','Delivered') NOT NULL DEFAULT 'Pending',
 FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
 FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
 CONSTRAINT positive_quantity CHECK (quantity > 0),
 INDEX idx_order_date (order_date)
) ENGINE=InnoDB;
