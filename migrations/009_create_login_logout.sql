-- Migración 009: Crear tabla de login/logout
-- Fecha: 2026-02-25
-- Descripción: Registra eventos de acceso para auditoría de accesos

CREATE TABLE IF NOT EXISTS login_logout (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NULL,
    email VARCHAR(100) NULL,
    tipo VARCHAR(20) NOT NULL,
    detalle VARCHAR(255) NULL,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_login_logout_fecha_hora (fecha_hora),
    INDEX idx_login_logout_tipo (tipo),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);
