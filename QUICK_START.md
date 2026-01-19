# Quick Start Guide

## Step-by-Step Instructions

### 1. Start the Database

```bash
docker-compose up -d postgres
```

This starts PostgreSQL in a Docker container. Wait a few seconds for it to be ready.

### 2. Install Dependencies (First Time Only)

```bash
npm install
```

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

This generates the Prisma Client based on your schema.

### 4. Run Database Migrations

```bash
npm run prisma:migrate
```

This creates all the database tables. You'll be prompted to name the migration.

### 5. Seed the Database (Optional)

```bash
npm run db:seed
```

This populates your database with initial data (companies, journals, accounts).

### 6. Open Prisma Studio (Optional - Database GUI)

```bash
npm run prisma:studio
```

This opens a web interface at http://localhost:5555 to browse and edit your database.

## All-in-One Command

```bash
# Start database
docker-compose up -d postgres

# Install, generate, migrate, and seed
npm install && npm run prisma:generate && npm run prisma:migrate && npm run db:seed
```

## Useful Commands

- **Stop database:** `docker-compose down`
- **Stop database and delete data:** `docker-compose down -v`
- **View database logs:** `docker-compose logs -f postgres`
- **Open Prisma Studio:** `npm run prisma:studio`

## Verify Everything Works

After seeding, you can verify by running Prisma Studio:
```bash
npm run prisma:studio
```

You should see:
- 1 Company (Default Company)
- 4 Journals (General, Sales, Purchase, Bank)
- 6 Accounts (Cash, Bank, Accounts Receivable, etc.)
