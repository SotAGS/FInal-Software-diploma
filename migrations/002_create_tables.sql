-- Migración 002: Crear tablas
-- Fecha: 2026-02-23
-- Descripción: Crea todas las tablas de la aplicación

USE gestion_empresarial;

-- Tabla de Roles
CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255)
);

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'EMPLEADO',
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Productos
CREATE TABLE IF NOT EXISTS productos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Órdenes de Compra
CREATE TABLE IF NOT EXISTS ordenes_compra (
    id INT PRIMARY KEY AUTO_INCREMENT,
    proveedor_id INT NOT NULL,
    usuario_creador_id INT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'EstadoPendiente',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    FOREIGN KEY (usuario_creador_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Tabla de Items en Órdenes de Compra
CREATE TABLE IF NOT EXISTS ordenes_compra_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    orden_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    FOREIGN KEY (orden_id) REFERENCES ordenes_compra(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Tabla de Items Recibidos
CREATE TABLE IF NOT EXISTS ordenes_compra_recibidos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    orden_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad_recibida INT NOT NULL,
    FOREIGN KEY (orden_id) REFERENCES ordenes_compra(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Tabla de Items Faltantes
CREATE TABLE IF NOT EXISTS ordenes_compra_faltantes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    orden_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad_faltante INT NOT NULL,
    FOREIGN KEY (orden_id) REFERENCES ordenes_compra(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Tabla de Auditoría
CREATE TABLE IF NOT EXISTS auditoria (
    id INT PRIMARY KEY AUTO_INCREMENT,
    entidad VARCHAR(100) NOT NULL,
    id_entidad INT,
    accion VARCHAR(100) NOT NULL,
    usuario_id INT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valor_anterior LONGTEXT,
    valor_nuevo LONGTEXT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Tabla de recuperación de contraseña
CREATE TABLE IF NOT EXISTS password_resets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    email VARCHAR(100) NOT NULL,
    token VARCHAR(128) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_password_resets_token (token),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
