# Sistema de Migraciones

Este directorio contiene todas las migraciones de la base de datos para el proyecto. Las migraciones se ejecutan en orden numérico.

## Estructura

Cada archivo de migración sigue el formato: `NNN_descripcion.sql` donde NNN es un número secuencial.

```
migrations/
├── 001_create_database.sql      # Crea la base de datos
├── 002_create_tables.sql        # Crea todas las tablas
└── 003_insert_seed_data.sql     # Inserta datos iniciales
```

## Cómo ejecutar migraciones

### Opción 1: Usar el script npm (Recomendado)
```bash
npm run migrate
```

### Opción 2: Ejecutar directamente con ts-node
```bash
ts-node scripts/runMigrations.ts
```

### Opción 3: Ejecutar manualmente en MySQL
```sql
SOURCE migrations/001_create_database.sql;
SOURCE migrations/002_create_tables.sql;
SOURCE migrations/003_insert_seed_data.sql;
```

## Control de migraciones

El sistema mantiene un registro en la tabla `migrations` para evitar ejecutar dos veces la misma migración:

```sql
CREATE TABLE migrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    filename VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Cada vez que ejecutas una migración, se registra automaticamente.

## Agregar nuevas migraciones

1. **Crear un archivo nuevo** con el siguiente número secuencial:
   ```
   004_add_new_column.sql
   ```

2. **Escribir la migración** con declaraciones SQL:
   ```sql
   -- Migración 004: Agregar nueva columna
   -- Fecha: 2026-02-23

   USE gestion_empresarial;

   ALTER TABLE usuarios ADD COLUMN descripcion VARCHAR(255) DEFAULT NULL;
   ```

3. **Ejecutar migraciones**:
   ```bash
   npm run migrate
   ```

## Notas importantes

- **No editar migraciones ejecutadas**: Si necesitas deshacer cambios, crea una nueva migración.
- **Usar IF EXISTS / IF NOT EXISTS**: Para evitar errores si algo ya existe.
- **Comentarios**: Siempre documenta cada migración con comentarios descriptivos.
- **Transacciones**: El sistema ejecuta cada statement de forma independiente. Para múltiples cambios relacionados, usa una sola migración.

## Troubleshooting

Si una migración falla:

1. Revisa el error en la consola
2. Corrige el archivo SQL
3. Si ya fue parcialmente ejecutada:
   - Revierte manualmente los cambios
   - Elimina el registro de la tabla `migrations`
   - Vuelve a ejecutar `npm run migrate`

```sql
DELETE FROM migrations WHERE filename = '004_add_new_column.sql';
```
