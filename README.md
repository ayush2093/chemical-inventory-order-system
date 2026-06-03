# AasaMedChem Inventory & Order Management System

A high-precision, real-time chemical inventory and quotation management portal built with **Next.js**, **Prisma ORM (v7.8.0)**, **Neon-hosted PostgreSQL**, and styled with **Vanilla CSS & CSS Modules**.

## 🚀 Live Demo URL
Deploy directly to Vercel and set environment variables. Once deployed, the system is fully operational.

---

## 🛠️ Tech Stack & System Architecture

```mermaid
graph TD
  User[Seller Agent / Administrator] -->|Access Web UI| NextJS[Next.js App Router Frontend]
  NextJS -->|Guards Routes| Middleware[Next.js Middleware JWT Auth]
  Middleware -->|Invokes API| API[Next.js API Routes]
  API -->|Performs Queries| Prisma[Prisma ORM Client with PG Adapter]
  Prisma -->|TCP Pool Connection| NeonDB[(Neon PostgreSQL Database)]
```

- **Frontend / Backend**: Next.js 14 App Router (React Server Components, API routes).
- **Database**: Neon Serverless PostgreSQL.
- **ORM**: Prisma 7.8.0 with `@prisma/adapter-pg` driver adapter.
- **Authentication**: JWT-based session cookies with Edge-compatible `jose` library, guarded via `middleware.ts`.
- **Styling**: Vanilla CSS with custom properties (CSS variables) for slate-dark theme design and micro-animations.

---

## 💾 Database Schema

The database uses PostgreSQL `NUMERIC` types to avoid binary floating-point rounding errors and handle highly precise quantities and prices (critical for chemical compounding).

```mermaid
erDiagram
    User ||--o{ Order : places
    Product ||--o{ OrderItem : details
    Order ||--|{ OrderItem : contains
```

### Key Tables

#### 1. `User`
Stores system accounts with credentials and roles.
- `id` (UUID): Primary Key.
- `email` (VARCHAR, UNIQUE): Login identifier.
- `passwordHash` (VARCHAR): Hashed password.
- `name` (VARCHAR): Display name.
- `role` (VARCHAR): Access level (`admin` or `seller`).

#### 2. `Product`
Stores compound records, stock levels, and price rates.
- `id` (UUID): Primary Key.
- `sku` (VARCHAR, UNIQUE): Stock Keeping Unit.
- `name` (VARCHAR): Product name.
- `description` (TEXT, Nullable): Grade, purity, or hazards.
- `category` (VARCHAR, Nullable): Solvent, acid, glassware, etc.
- `dimension` (VARCHAR): `WEIGHT`, `VOLUME`, or `COUNT`.
- `baseUnit` (VARCHAR): `g`, `mL`, or `items`.
- `inventoryBalance` (NUMERIC(20, 8)): Current stock level in `baseUnit`.
- `basePrice` (NUMERIC(15, 4)): Cost in INR per 1 unit of `baseUnit`.

#### 3. `Order`
Represents quotation contracts submitted by sellers.
- `id` (UUID): Primary Key.
- `userId` (UUID): Reference to the creator (`User`).
- `status` (VARCHAR): `pending`, `approved`, `rejected`, or `completed`.
- `totalPrice` (NUMERIC(15, 4)): Grand total of the quotation in INR.

#### 4. `OrderItem`
Stores historical lines of placed orders, capturing exact user input and base conversions for audit.
- `id` (UUID): Primary Key.
- `orderId` (UUID): Reference to `Order`.
- `productId` (UUID): Reference to `Product`.
- `orderedQuantity` (NUMERIC(20, 8)): User input quantity (e.g. `2.5`).
- `orderedUnit` (VARCHAR): User selected unit (e.g. `kg`).
- `quantityInBaseUnit` (NUMERIC(20, 8)): Auto-converted quantity in base unit (e.g. `2500.00000000`).
- `unitPriceInOrderedUnit` (NUMERIC(15, 4)): Cost per 1 unit of `orderedUnit` at order time (e.g. `5000.0000`).
- `totalItemPrice` (NUMERIC(15, 4)): Cost subtotal (orderedQuantity * unitPriceInOrderedUnit).

---

## ⚖️ Unit Storage & Conversion Strategy

To maintain database consistency and eliminate precision losses, the system stores **all stock and rates in base units internally** while offering flexible units on the UI.

### 1. Dimension and Unit Matrix
| Dimension | Base Unit (Internal DB) | Supported UI Units | Conversion Factor to Base |
| :--- | :--- | :--- | :--- |
| **WEIGHT** | Grams (`g`) | `g`, `kg` | `1 kg = 1000 g` |
| **VOLUME** | Milliliters (`mL`) | `mL`, `L` | `1 L = 1000 mL` |
| **COUNT** | Items (`items`) | `items` | `1 item = 1 item` |

### 2. Price and Rate Calculations
- **Internal storage rate**: Price per 1 Gram, 1 Milliliter, or 1 Item (INR).
- **Target Price Conversion**:
  - $\text{Price per kg} = \text{Base Price per g} \times 1000$
  - $\text{Price per L} = \text{Base Price per mL} \times 1000$

### 3. Application Lifecycle Flow

#### A. Creating Products (Admin Dashboard)
1. Admin enters price rate and stock quantity in any unit (e.g., Inventory: `10 kg`, Rate: `450 INR per kg`).
2. The server converts these to base units before saving:
   - `inventoryBalance` = $10 \times 1000 = 10000.00000000\text{ g}$
   - `basePrice` = $450 / 1000 = 0.4500\text{ INR/g}$
3. DB holds: `inventoryBalance = 10000`, `basePrice = 0.4500`.

#### B. Placing Orders (Seller Dashboard)
1. Seller selects `Ethanol` and enters `1.5 L` in their shopping panel.
2. The UI performs a **real-time rate preview**:
   - Fetches base price `1.2000 INR/mL` from API.
   - Calculates L price = $1.2000 \times 1000 = 1200.00\text{ INR/L}$.
   - Shows live calculation: `1.5 L @ 1200.00 INR/L = 1800.00 INR`. Shows internal conversion equivalent `(1500 mL)`.
3. Checkout: The server executes a database transaction `prisma.$transaction`:
   - Checks stock: converts $1.5\text{ L} \to 1500\text{ mL}$ and checks if `inventoryBalance >= 1500` (e.g., `50000 mL` available).
   - Deducts stock: decrement `inventoryBalance` by `1500` ($50000 \to 48500$).
   - Creates the order and logs both original entries (`1.5 L`) and calculated subtotals (`1800 INR`) for auditing.

#### C. Quotation Approval & Auto-Reversion (Admin Review)
- If an admin rejects a pending/approved quote, the system **automatically reinstates the inventory** back into the product stock inside a concurrency-safe database transaction.
- If a rejected quote is reinstated, the system re-evaluates the stock levels, checks availability, and deducts the balance.

---

## 🛠️ Local Development Setup

### Prerequisites
- Node.js (v18 or higher)
- A Neon PostgreSQL account or a local PostgreSQL database

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/<your-username>/inventory.git
cd inventory
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://username:password@hostname:5432/dbname?sslmode=require"
JWT_SECRET="generate-a-secure-random-key-here"
```

### 3. Generate Database Client & Migrations
Synchronize your schema with Neon:
```bash
# Push schema to database
npx prisma db push

# Generate client classes
npx prisma generate
```

### 4. Seed Test Accounts
Load initial compound data and default accounts (Admin and Seller):
```bash
npx prisma db seed
```

### 5. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your browser.

---

## 🔑 Demo Login Credentials

You can log in directly using the accounts created by the seeder script:

| Role | Username / Email | Password | Allowed Dashboards |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@example.com` | `admin123` | `/admin/products` & `/admin/orders` |
| **Seller Agent** | `seller@example.com` | `seller123` | `/seller/dashboard` & `/seller/orders` |

New accounts registered via the `/register` sign-up form default to the **Seller** role.

---

## 🚢 Deploying to Vercel

1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com) and create a new project.
3. Import the repository.
4. Configure the **Environment Variables** in Vercel:
   - `DATABASE_URL` (your Neon connection string).
   - `JWT_SECRET` (a random secure token string).
5. Click **Deploy**.
6. Post-deployment, run migrations/seeding by triggering them through local terminal configurations pointing to the production database:
   ```bash
   DATABASE_URL="your-production-neon-url" npx prisma db push
   DATABASE_URL="your-production-neon-url" npx prisma db seed
   ```
