# TradeVision — Export Order Tracking System

A basic full-stack college project using HTML, Bootstrap, browser JavaScript, Node.js, Express, and MySQL. No ML, payment services, courier APIs, Docker, or frontend build process is required.

## Features

- One administrator: login, logout, hashed passwords, session authentication.
- Product and customer create/read/update/delete with search.
- Orders: one customer and one product, quantity, order date, current price snapshot, exact server-calculated total in USD.
- Manual status updates: Pending, Processing, Shipped, Delivered. The admin can correct a status in either direction.
- Only Pending orders can be deleted. Referenced products/customers cannot be deleted.
- Dashboard: customer count, order count, Pending count, total order value, latest 12 months with orders, and country totals.
- Responsive pages, validation messages, empty states, local Bootstrap assets.

## Prerequisites

1. Node.js 22 or newer, with npm.
2. MySQL Community Server 8.0.16 or newer, running locally. MySQL Workbench is optional; Workbench alone is not a database server.
3. A browser and optionally VS Code.

Internet access is needed for `npm ci`. Afterwards the app and Bootstrap run locally.

## Windows quick start (PowerShell)

Extract the ZIP. Open a terminal **inside the TradeVision folder**. Your existing `.env` is preserved at the project root; backend scripts load it automatically.

```powershell
notepad .env
cd backend
npm ci
```

Edit these values in `.env`:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=tradevision
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YOUR_OWN_PASSWORD_AT_LEAST_10_CHARACTERS
SESSION_SECRET=YOUR_OWN_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
```

Generate a random session secret with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy the printed value into SESSION_SECRET. Do not share your `.env` file. If a password contains `#`, surround its value with double quotes in `.env`.

Then run:

```powershell
npm run setup
npm run seed
npm start
```

Open **http://localhost:3000** and log in using ADMIN_USERNAME and ADMIN_PASSWORD from your `.env`.

`npm run setup` creates the database, tables, and administrator. The MySQL account needs permission to create the database and tables. No manual SQL import is necessary. Running setup again preserves existing data and passwords.

`npm run seed` is optional. It adds 3 products, 3 customers, and 8 orders. It refuses to change a database that already contains business records. Skip it if you want to enter your own data.

For later runs, start MySQL and run only `npm start`. Keep the terminal open. Press Ctrl+C to stop.

### macOS / Linux

Edit the existing root `.env` with your preferred editor, then run `cd backend`. All npm commands are identical.

## How to use

1. Products: add a name, unit price, and optional unit description (for example, price per box).
2. Customers: add contact name, company, country, email, and optional phone.
3. Orders: select customer and product, enter whole-number quantity and date, then Save.
4. Change the order's status in the order table. Search or filter the list as needed.
5. Overview: inspect totals and monthly/country summaries.

The browser's order estimate is informational; the server calculates the saved amount. Changing a product price does not change existing orders. Product/customer names and customer countries are live references, so editing those details changes their display on old orders. All financial values are USD. Dashboard order value includes all statuses and does not represent cash received or recognized accounting revenue.

## Structure

The root contains `.env`, this README, and two folders:

- `frontend/`: HTML pages, `css/style.css`, and browser JavaScript in `js/`.
- `backend/`: `server.js`, `app.js`, `db.js`, `auth.js`, `validation.js`, `schema.sql`, package manifests, database scripts in `scripts/`, and automated tests in `test/`.

The backend serves the frontend and API together at http://localhost:3000. Open that URL rather than opening HTML files directly. Bootstrap CSS is served from the installed backend dependency at `/vendor/bootstrap.min.css`.

All npm commands must run inside `backend/`. Installed dependencies (`node_modules`) are omitted from this ZIP; `npm ci` restores them. The lockfile is retained for reproducible installation. Redundant START_HERE.txt, TESTING.md, and the unused .env.example were removed; setup and verification instructions are consolidated here. Tests and setup/seed scripts remain because they are useful project tooling.

## Main API endpoints

All business APIs require a logged-in session. POST, PUT, PATCH, and DELETE requests also require the X-CSRF-Token returned by GET /api/session. Login regenerates the session and returns a new token.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/session | Authentication state and CSRF token |
| POST | /api/login | Admin authentication |
| POST | /api/logout | End session |
| GET, POST | /api/products | List/create products |
| PUT, DELETE | /api/products/:id | Edit/delete product |
| GET, POST | /api/customers | List/create customers |
| PUT, DELETE | /api/customers/:id | Edit/delete customer |
| GET, POST | /api/orders | List/create orders |
| PATCH | /api/orders/:id/status | Update shipment status |
| DELETE | /api/orders/:id | Delete a Pending order |
| GET | /api/dashboard | Totals and summaries |

## Database relationships

`customers.id` → `orders.customer_id` (one customer, many orders)

`products.id` → `orders.product_id` (one product, many orders)

`admins` holds the login account. Monetary fields are DECIMAL. Order prices are stored separately from current product prices.

## Tests

```powershell
npm test
```

Tests check input validation, exact money calculations, password hashing, and API/session behavior with a mock database. For a real MySQL check: log in, create a product and customer, create an order, update its status, inspect the dashboard, and log out.

## Troubleshooting

- **npm is not recognized:** install Node.js and open a new terminal.
- **PowerShell blocks npm.ps1:** use `npm.cmd` in place of `npm`.
- **ECONNREFUSED / startup failed:** start the MySQL service, verify DB_HOST and DB_PORT, then run setup.
- **Access denied:** verify DB_USER and DB_PASSWORD. These are MySQL credentials, not your TradeVision login.
- **Unknown database / missing tables:** run `npm run setup`.
- **Secret/password setup error:** replace the placeholders in .env with your own values.
- **Port already in use:** change PORT in .env (for example 3001), restart, and open the matching URL.
- **Cannot delete record:** it is linked to an order. This is intentional.
- **Changed ADMIN_PASSWORD but old password still works:** setup does not reset existing accounts. For a forgotten local assignment password, delete only that admin row in Workbench, set ADMIN_PASSWORD, and rerun setup; business records remain intact.
- **Seed refuses to run:** the database already has business data; use the existing data or a new DB_NAME.

## Scope and security

This is a single-process local classroom application, bound to 127.0.0.1 by default. Passwords use scrypt with random salts. SQL values use parameterized queries; output is HTML-escaped. Sessions use HttpOnly/SameSite cookies, CSRF tokens, and a login rate limit. Session storage is in memory, so restarting the server logs you out. Credentials are not bundled.

For public deployment, first configure HTTPS, a persistent session store, an appropriate restricted database user, backups, deployment-specific cookie/proxy settings, and operational monitoring. NODE_ENV=production enables secure cookies and therefore requires HTTPS. These deployment features are outside this basic project.
