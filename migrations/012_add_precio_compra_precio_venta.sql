-- Migración 012: Separar precio de compra y precio de venta en productos
-- Fecha: 2026-07-22
-- Descripción: agrega columnas independientes y migra datos desde precio (legacy)

USE gestion_empresarial;

SET @existe_precio_compra := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'productos'
      AND COLUMN_NAME = 'precio_compra'
);

SET @sql_precio_compra := IF(
    @existe_precio_compra = 0,
    'ALTER TABLE productos ADD COLUMN precio_compra DECIMAL(10, 2) NOT NULL DEFAULT 0',
    'SELECT 1'
);

PREPARE stmt_precio_compra FROM @sql_precio_compra;
EXECUTE stmt_precio_compra;
DEALLOCATE PREPARE stmt_precio_compra;

SET @existe_precio_venta := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'productos'
      AND COLUMN_NAME = 'precio_venta'
);

SET @sql_precio_venta := IF(
    @existe_precio_venta = 0,
    'ALTER TABLE productos ADD COLUMN precio_venta DECIMAL(10, 2) NOT NULL DEFAULT 0',
    'SELECT 1'
);

PREPARE stmt_precio_venta FROM @sql_precio_venta;
EXECUTE stmt_precio_venta;
DEALLOCATE PREPARE stmt_precio_venta;

-- Copiar el precio existente como valor inicial para ambos campos
UPDATE productos
SET
    precio_compra = CASE WHEN precio_compra = 0 THEN COALESCE(precio, 0) ELSE precio_compra END,
    precio_venta = CASE WHEN precio_venta = 0 THEN COALESCE(precio, 0) ELSE precio_venta END;
