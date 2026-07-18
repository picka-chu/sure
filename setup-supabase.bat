@echo off
title Sure - Supabase Setup
echo ============================================
echo   Sure - Supabase Database Setup
echo ============================================
echo.
echo This script will help you configure Supabase.
echo.
echo Step 1: Go to https://supabase.com and create a project
echo Step 2: Go to Project Settings ^> Database
echo Step 3: Copy the "Connection string ^> URI"
echo.
echo The URI looks like:
echo   postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
echo.
set /p DB_URI="Paste your connection string here: "

if "%DB_URI%"=="" (
    echo No input provided. Aborting.
    pause
    exit /b 1
)

echo.
echo Converting to asyncpg format...
set DB_URI=%DB_URI:postgresql://=postgresql+asyncpg://%

echo.
echo Testing connection (this may take a few seconds)...
cd /d "%~dp0backend"
py -3.12 -c "
import asyncio
try:
    from sqlalchemy.ext.asyncio import create_async_engine
    engine = create_async_engine('%DB_URI%', connect_args={'ssl': 'require'})
    async def test():
        async with engine.connect() as conn:
            await conn.execute('SELECT 1')
        print('Connection successful!')
    asyncio.run(test())
except Exception as e:
    print(f'Connection failed: {e}')
"

echo.
echo Updating .env file...
echo DATABASE_URL=%DB_URI% > "%~dp0.env"
echo DATABASE_SSL=true >> "%~dp0.env"
echo SECRET_KEY=dev-secret-key-change-in-production >> "%~dp0.env"
echo ALGORITHM=HS256 >> "%~dp0.env"
echo ACCESS_TOKEN_EXPIRE_MINUTES=10080 >> "%~dp0.env"
echo FRONTEND_URL=http://localhost:3000 >> "%~dp0.env"
echo UPLOAD_DIR=./uploads >> "%~dp0.env"

echo.
echo .env file updated successfully!
echo.
echo Running database migration to create tables...
py -3.12 -m app.seed

echo.
echo ============================================
echo   Setup complete!
echo.
echo   Start the backend:
echo     py -3.12 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
echo ============================================
pause
