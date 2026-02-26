-- Migración 004: Crear relación de permisos por rol
-- Fecha: 2026-02-24
-- Descripción: Permite gestionar permisos dinámicos por rol desde la aplicación

USE gestion_empresarial;

CREATE TABLE IF NOT EXISTS rol_permisos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rol_id INT NOT NULL,
    codigo_permiso VARCHAR(100) NOT NULL,
    descripcion_permiso VARCHAR(255),
    UNIQUE KEY uk_rol_permiso (rol_id, codigo_permiso),
    FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE
);

INSERT IGNORE INTO roles (nombre, descripcion) VALUES
('ADMIN', 'Administrador del sistema');

INSERT IGNORE INTO rol_permisos (rol_id, codigo_permiso, descripcion_permiso)
SELECT r.id, t.codigo_permiso, t.descripcion_permiso
FROM roles r
JOIN (
    SELECT 'ADMIN' AS nombre_rol, 'CREAR_PRODUCTO' AS codigo_permiso, 'Crear producto' AS descripcion_permiso
    UNION ALL SELECT 'ADMIN', 'ELIMINAR_PRODUCTO', 'Eliminar producto'
    UNION ALL SELECT 'ADMIN', 'EDITAR_PRODUCTO', 'Editar producto'
    UNION ALL SELECT 'ADMIN', 'VER_STOCK', 'Ver stock'
    UNION ALL SELECT 'ADMIN', 'CREAR_ORDEN_COMPRA', 'Crear orden de compra'
    UNION ALL SELECT 'ADMIN', 'EDITAR_ORDEN_COMPRA', 'Editar orden de compra'
    UNION ALL SELECT 'ADMIN', 'VER_REPORTES', 'Ver reportes'
    UNION ALL SELECT 'ADMIN', 'GESTIONAR_USUARIOS', 'Gestionar usuarios'
    UNION ALL SELECT 'ADMIN', 'GESTIONAR_ROLES', 'Gestionar roles'

    UNION ALL SELECT 'GERENTE', 'VER_STOCK', 'Ver stock'
    UNION ALL SELECT 'GERENTE', 'CREAR_ORDEN_COMPRA', 'Crear orden de compra'
    UNION ALL SELECT 'GERENTE', 'EDITAR_ORDEN_COMPRA', 'Editar orden de compra'
    UNION ALL SELECT 'GERENTE', 'VER_REPORTES', 'Ver reportes'
    UNION ALL SELECT 'GERENTE', 'GESTIONAR_USUARIOS', 'Gestionar usuarios'

    UNION ALL SELECT 'EMPLEADO', 'VER_STOCK', 'Ver stock'
) t ON r.nombre = t.nombre_rol;
