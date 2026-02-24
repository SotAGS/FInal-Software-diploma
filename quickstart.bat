@echo off
REM Quick Start Script for Final Software Diploma - Windows

echo.
echo 🚀 Sistema de Gestión Empresarial - Quick Start
echo ===============================================
echo.

REM Check Node.js
echo ✓ Verificando Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js no está instalado
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✓ Node.js %NODE_VERSION% instalado
echo.

REM Check npm
echo ✓ Verificando npm...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm no está instalado
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo ✓ npm %NPM_VERSION% instalado
echo.

REM Install dependencies
echo 📦 Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Error al instalar dependencias
    pause
    exit /b 1
)
echo.

REM Check .env file
echo ⚙️ Configurando variables de entorno...
if not exist .env (
    echo Creando .env archivo...
    (
        echo DB_HOST=localhost
        echo DB_USER=root
        echo DB_PASSWORD=root
        echo DB_NAME=final_software_diploma
        echo DB_PORT=3306
        echo PORT=3000
        echo SESSION_SECRET=tu_llave_super_secreta_aqui
        echo NODE_ENV=development
    ) > .env
    echo ⚠️ Actualiza .env con tus credenciales de BD
    pause
)
echo.

REM Check MySQL
echo 🔌 Verificando MySQL...
where mysql >nul 2>nul
if %errorlevel% equ 0 (
    echo ✓ MySQL instalado
) else (
    echo ⚠️ MySQL no encontrado (necesario para correr el proyecto)
)
echo.

REM Run migrations
echo 📊 Ejecutando migraciones de BD...
call npm run migrate
echo.

REM Compile TypeScript
echo ⚙️ Compilando TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Error compilando TypeScript
    pause
    exit /b 1
)
echo.

REM Run tests (optional)
echo ¿Ejecutar pruebas? (s/n)
set /p TEST_CHOICE=
if /i "%TEST_CHOICE%"=="s" (
    call npm test
)
echo.

REM Start server
echo.
echo ✅ Iniciando servidor...
echo 📍 Accede a: http://localhost:3000/login
echo 👤 Email: admin@empresa.com
echo 🔐 Contraseña: admin123
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

call npm run dev

pause
