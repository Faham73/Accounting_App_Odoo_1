# Accounting Software

A modern accounting software built with Prisma and PostgreSQL.

## Prerequisites

- Docker and Docker Compose installed on your system
- Node.js 20+ (if running locally without Docker)

## Quick Start with Docker

### 1. Start the Database

```bash
docker-compose up -d postgres
```

This will start a PostgreSQL database container on port 5432.

### 2. Set Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://accounting_user:accounting_password@localhost:5432/accounting_db?schema=public"
NODE_ENV=development
```

Or use the Docker Compose connection string if running migrations from within Docker:
```env
DATABASE_URL="postgresql://accounting_user:accounting_password@postgres:5432/accounting_db?schema=public"
```

### 3. Run Database Migrations

```bash
# If running locally
npx prisma migrate dev --schema=./apps/api/prisma/schema.prisma

# Or if using Docker
docker-compose run --rm api npx prisma migrate dev --schema=./apps/api/prisma/schema.prisma
```

### 4. Seed the Database (Optional)

```bash
# If running locally
npx prisma db seed --schema=./apps/api/prisma/schema.prisma

# Or if using Docker
docker-compose run --rm api npx prisma db seed --schema=./apps/api/prisma/schema.prisma
```

### 5. Start All Services

```bash
docker-compose up
```

This will start both the PostgreSQL database and the API service.

## Docker Commands

### Start services in detached mode
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### Stop services and remove volumes (⚠️ deletes database data)
```bash
docker-compose down -v
```

### View logs
```bash
docker-compose logs -f api
docker-compose logs -f postgres
```

### Run Prisma commands in Docker
```bash
docker-compose exec api npx prisma studio --schema=./apps/api/prisma/schema.prisma
```

## Database Connection

- **Host:** localhost (or `postgres` from within Docker network)
- **Port:** 5432
- **Database:** accounting_db
- **Username:** accounting_user
- **Password:** accounting_password

## Project Structure

```
.
├── apps/
│   └── api/
│       └── prisma/
│           ├── schema.prisma    # Database schema
│           └── seed.ts          # Database seed script
├── docker-compose.yml           # Docker Compose configuration
├── Dockerfile                   # Docker image configuration
└── .dockerignore               # Files to ignore in Docker builds
```

## Development

The Docker setup includes hot-reloading for development. Any changes to your code will automatically be reflected in the running container.

## Notes

- The PostgreSQL data is persisted in a Docker volume named `postgres_data`
- Make sure port 5432 and 3000 are not in use by other services
- To reset the database, use `docker-compose down -v` and start again
