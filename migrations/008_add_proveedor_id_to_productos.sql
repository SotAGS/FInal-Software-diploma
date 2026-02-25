-- Migración 008: Relación 1 proveedor -> muchos productos
-- Fecha: 2026-02-24
-- Descripción: Agrega proveedor_id en productos para asociar cada producto a una sola marca/proveedor

USE gestion_empresarial;

SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'productos'
      AND COLUMN_NAME = 'proveedor_id'
);

SET @sql_col := IF(
    @col_exists = 0,
    'ALTER TABLE productos ADD COLUMN proveedor_id INT NULL',
    'SELECT 1'
);

PREPARE stmt_col FROM @sql_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;

SET @fk_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'productos'
      AND CONSTRAINT_NAME = 'fk_productos_proveedor'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @sql := IF(
    @fk_exists = 0,
    'ALTER TABLE productos ADD CONSTRAINT fk_productos_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL',
    'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
