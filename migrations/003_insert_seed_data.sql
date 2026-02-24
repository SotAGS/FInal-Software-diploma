-- Migración 003: Insertar datos iniciales
-- Fecha: 2026-02-23
-- Descripción: Inserta roles y usuario administrador de prueba

USE gestion_empresarial;

-- Insertar roles iniciales
INSERT IGNORE INTO roles (id, nombre, descripcion) VALUES 
(1, 'Administrador', 'Administrador del sistema'),
(2, 'Gerente', 'Gerente de compras'),
(3, 'Usuario', 'Usuario estándar');

-- Insertar usuario administrador de prueba (contraseña: admin123)
INSERT IGNORE INTO usuarios (id, nombre, email, password, rol, activo, fecha_creacion) VALUES 
(1, 'Administrador', 'admin@empresa.com', 'admin123', 'ADMIN', TRUE, NOW());
