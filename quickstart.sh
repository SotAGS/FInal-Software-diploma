#!/bin/bash
# Quick Start Script for Final Software Diploma

echo "🚀 Sistema de Gestión Empresarial - Quick Start"
echo "==============================================="

# Check Node.js
echo "✓ Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    exit 1
fi
echo "✓ Node.js $(node -v) instalado"

# Check npm
echo "✓ Verificando npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado"
    exit 1
fi
echo "✓ npm $(npm -v) instalado"

# Install dependencies
echo ""
echo "📦 Instalando dependencias..."
npm install

# Check .env file
echo ""
echo "⚙️ Configurando variables de entorno..."
if [ ! -f .env ]; then
    echo "Creando .env archivo de ejemplo..."
    cp .env.example .env 2>/dev/null || cat > .env << 'EOL'
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=final_software_diploma
DB_PORT=3306
PORT=3000
SESSION_SECRET=tu_llave_super_secreta_aqui
NODE_ENV=development
EOL
    echo "⚠️ Actualiza .env con tus credenciales de BD"
    echo "Presiona Enter para continuar..."
    read
fi

# Check MySQL connection
echo ""
echo "🔌 Verificando conexión a MySQL..."
# This is a simple check - in production you'd do more
mysql --version &> /dev/null && echo "✓ MySQL instalado" || echo "⚠️ MySQL no encontrado (necesario para correr)"

# Run migrations
echo ""
echo "📊 Ejecutando migraciones de BD..."
npm run migrate

# Compile TypeScript
echo ""
echo "⚙️ Compilando TypeScript..."
npm run build

# Run tests (optional)
read -p "¿Ejecutar pruebas? (s/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    npm test
fi

# Start server
echo ""
echo "✅ Iniciando servidor..."
echo "📍 Accede a: http://localhost:3000/login"
echo "👤 Email: admin@empresa.com"
echo "🔐 Contraseña: admin123"
echo ""
echo "Presiona Ctrl+C para detener el servidor"
echo ""

npm run dev
