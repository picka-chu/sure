# Supabase Database Setup

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account)
2. Click **New Project**
3. Enter:
   - **Name**: `sure` (or any name)
   - **Database Password**: Create a strong password (save this)
   - **Region**: Pick one close to Ethiopia (e.g., `South Africa` or `Europe West`)
4. Click **Create new project** (takes ~2 minutes)

## Step 2: Get Connection String

1. In your Supabase project dashboard, go to **Project Settings** (gear icon) > **Database**
2. Under **Connection string**, find the **URI** section
3. Copy the connection string; it looks like:
   ```
   postgresql://postgres:password@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
   ```
4. Edit it to use the asyncpg driver:
   - Change `postgresql://` to `postgresql+asyncpg://`

## Step 3: Configure .env

Edit `.env` in the project root:

```env
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
DATABASE_SSL=true
```

Replace `YOUR_PASSWORD` and the host with your actual credentials.

## Step 4: Create Tables

Run the seed script to create all tables and demo data:

```bash
cd backend
py -3.12 -m app.seed
```

## Step 5: Verify Connection

```bash
cd backend
py -3.12 -c "from app.database import engine; print('DB config OK')"
```

Then start the backend:

```bash
py -3.12 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Troubleshooting

### SSL Error
If you see `SSL connection error`, make sure:
- `.env` has `DATABASE_SSL=true`
- You're using the correct host from Supabase

### Connection Timeout
- Supabase may block connections from some regions
- Check Supabase Dashboard > Authentication > Policies if needed
- Ensure your IP is not blocked

### Password Issues
- If your password contains special characters, URL-encode them:
  - `@` → `%40`
  - `#` → `%23`
  - `!` → `%21`
  - `$` → `%24`
