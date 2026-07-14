-- Migración 010: Crear tablas de ventas
-- Fecha: 2026-07-13
-- Descripción: Crea ventas y ventas_items para registrar ventas a clientes

USE gestion_empresarial;

CREATE TABLE IF NOT EXISTS ventas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cliente_nombre VARCHAR(150) NOT NULL,
    usuario_vendedor_id INT NULL,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_vendedor_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ventas_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);
