-- ============================================================
-- QUERIES MANUALES: ELIMINAR / RECUPERAR (SOFT DELETE)
-- Proyecto: Final-Software-diploma
-- Base de datos: gestion_empresarial
-- ============================================================

USE gestion_empresarial;

-- ==============================
-- 1) USUARIOS
-- ==============================

-- Ver todos (activos e inactivos)
SELECT id, nombre, email, rol, activo, fecha_creacion
FROM usuarios
ORDER BY id;

-- Ver solo eliminados
SELECT id, nombre, email, rol, activo
FROM usuarios
WHERE activo = FALSE
ORDER BY id;

-- Eliminar (soft delete) usuario por ID
-- Cambia 3 por el id que quieras
UPDATE usuarios
SET activo = FALSE
WHERE id = 3;

-- Recuperar usuario por ID
UPDATE usuarios
SET activo = TRUE
WHERE id = 3;


-- ==============================
-- 2) PRODUCTOS
-- ==============================

-- Ver todos (activos e inactivos)
SELECT id, nombre, precio_compra, precio_venta, stock, activo, fecha_creacion
FROM productos
ORDER BY id;

-- Ver solo eliminados
SELECT id, nombre, precio_compra, precio_venta, stock, activo
FROM productos
WHERE activo = FALSE
ORDER BY id;

-- Eliminar (soft delete) producto por ID
UPDATE productos
SET activo = FALSE
WHERE id = 5;

-- Recuperar producto por ID
UPDATE productos
SET activo = TRUE
WHERE id = 5;


-- ==============================
-- 3) PROVEEDORES (Vendedores)
-- ==============================

-- Ver todos (activos e inactivos)
SELECT id, nombre, telefono, email, direccion, activo, fecha_creacion
FROM proveedores
ORDER BY id;

-- Ver solo eliminados
SELECT id, nombre, telefono, email, direccion, activo
FROM proveedores
WHERE activo = FALSE
ORDER BY id;

-- Eliminar (soft delete) proveedor por ID
UPDATE proveedores
SET activo = FALSE
WHERE id = 2;

-- Recuperar proveedor por ID
UPDATE proveedores
SET activo = TRUE
WHERE id = 2;


-- ==============================
-- 4) EXTRA ÚTIL
-- ==============================

-- Confirmar base de datos actual
SELECT DATABASE() AS base_actual;

-- Ver tablas disponibles
SHOW TABLES;
