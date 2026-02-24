# 🗄️ Configuración MySQL - Sistema de Gestión Empresarial

## Paso 1: Instalar MySQL

### Windows
1. Descarga MySQL Community Server desde: https://dev.mysql.com/downloads/mysql/
2. Ejecuta el instalador (.msi)
3. Elige "Community Server"
4. Durante la instalación, recuerda la **contraseña de root**

### macOS (con Homebrew)
```bash
brew install mysql
brew services start mysql
```

### Linux (Debian/Ubuntu)
```bash
sudo apt-get install mysql-server
sudo mysql_secure_installation
```

---

## Paso 2: Crear la Base de Datos

### Opción A: Usando la terminal MySQL (Recomendado)

1. Abre una terminal/cmd y conectate a MySQL:
```bash
mysql -u root -p
```

2. Se te pedirá la contraseña. Ingrésala.

3. Copia y pega TODO el contenido de `schema.sql`:
```sql
-- Pega aquí TODO el contenido del archivo schema.sql
```

4. Verifica que se creó:
```sql
SHOW DATABASES;
USE gestion_empresarial;
SHOW TABLES;
```

### Opción B: Usando un cliente gráfico

1. Usa **MySQL Workbench** (gratuito) https://www.mysql.com/products/workbench/
2. Crea una nueva conexión con los datos por defecto
3. Abre un nuevo editor SQL y pega el contenido de `schema.sql`
4. Ejecuta todo

---

## Paso 3: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Configuración MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña_mysql
DB_NAME=gestion_empresarial
```

**⚠️ Importante**: 
- Si no usas contraseña en MySQL, deja `DB_PASSWORD` vacío
- No compartas este archivo en git (ya está en .gitignore)

---

## Paso 4: Compilar y Ejecutar

```bash
npm run build
npm start
```

Deberías ver en la consola:
```
✓ Pool MySQL conectado
Servidor corriendo en http://localhost:3000
```

---

## Credenciales de Prueba

Después de ejecutar `schema.sql`, tienes un usuario creado:

- **Usuario**: admin@example.com
- **Contraseña**: admin123

---

## Datos de conexión por defecto

Si ejecutas MySQL sin cambiar nada:

| Campo | Valor |
|-------|-------|
| Host | localhost |
| Usuario | root |
| Contraseña | (vacía o la que pusiste) |
| Base de datos | gestion_empresarial |
| Puerto | 3306 |

---

## 🐛 Troubleshooting

### "Access Denied" al conectar
- Verifica que `DB_USER` y `DB_PASSWORD` sean correctos en `.env`
- Asegúrate de que MySQL esté corriendo: `mysql -u root -p` desde terminal

### "Database doesn't exist"
- Ejecuta el archivo `schema.sql` para crear las tablas
- Verifica que el nombre sea `gestion_empresarial`

### Puerto 3000 en uso
```bash
# Windows
netstat -ano | findstr :3000

# macOS/Linux
lsof -i :3000
```

---

## ✅ Verificación

Una vez corriendo, el sistema debería:
1. ✓ Conectarse a MySQL al iniciar
2. ✓ Poder crear, leer, actualizar y eliminar órdenes
3. ✓ Guardar datos persistentemente en la BD
4. ✓ Mostrar datos en las vistas

---

## 📝 Notas

- El sistema ahora persiste datos en MySQL en lugar de memoria
- Los cambios en el inventario se guardan automáticamente
- Los repositorios han sido migrados para usar SQL
