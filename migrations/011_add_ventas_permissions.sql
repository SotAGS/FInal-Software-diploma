-- Migracion 011: Permisos para modulo de ventas
-- Fecha: 2026-07-14
-- Descripcion: Agrega permisos de ventas para roles base

INSERT IGNORE INTO rol_permisos (rol_id, codigo_permiso, descripcion_permiso)
SELECT r.id, p.codigo_permiso, p.descripcion_permiso
FROM roles r
JOIN (
    SELECT 'ADMIN' AS nombre_rol, 'CREAR_VENTA' AS codigo_permiso, 'Crear venta' AS descripcion_permiso
    UNION ALL SELECT 'ADMIN', 'EDITAR_VENTA', 'Editar venta'
    UNION ALL SELECT 'GERENTE', 'CREAR_VENTA', 'Crear venta'
    UNION ALL SELECT 'GERENTE', 'EDITAR_VENTA', 'Editar venta'
    UNION ALL SELECT 'EMPLEADO', 'CREAR_VENTA', 'Crear venta'
) p ON UPPER(r.nombre) = p.nombre_rol;