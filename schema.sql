-- Crear base de datos
CREATE DATABASE IF NOT EXISTS gestion_empresarial;
USE gestion_empresarial;

-- Tabla de Roles
CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255)
);

-- Tabla de Permisos por Rol
CREATE TABLE IF NOT EXISTS rol_permisos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rol_id INT NOT NULL,
    codigo_permiso VARCHAR(100) NOT NULL,
    descripcion_permiso VARCHAR(255),
    UNIQUE KEY uk_rol_permiso (rol_id, codigo_permiso),
    FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    backup_email VARCHAR(100) NULL,
    contrasena VARCHAR(255) NOT NULL,
    rol_id INT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id)
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
    proveedor_id INT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL
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

-- Tabla de Login/Logout para auditoría de accesos
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

-- Insertar roles iniciales
INSERT IGNORE INTO roles (id, nombre, descripcion) VALUES 
(1, 'ADMIN', 'Administrador del sistema'),
(2, 'GERENTE', 'Gerente de compras'),
(3, 'EMPLEADO', 'Usuario estándar');

INSERT IGNORE INTO rol_permisos (rol_id, codigo_permiso, descripcion_permiso) VALUES
(1, 'CREAR_PRODUCTO', 'Crear producto'),
(1, 'ELIMINAR_PRODUCTO', 'Eliminar producto'),
(1, 'EDITAR_PRODUCTO', 'Editar producto'),
(1, 'VER_STOCK', 'Ver stock'),
(1, 'CREAR_ORDEN_COMPRA', 'Crear orden de compra'),
(1, 'EDITAR_ORDEN_COMPRA', 'Editar orden de compra'),
(1, 'VER_REPORTES', 'Ver reportes'),
(1, 'GESTIONAR_USUARIOS', 'Gestionar usuarios'),
(1, 'GESTIONAR_ROLES', 'Gestionar roles'),
(2, 'VER_STOCK', 'Ver stock'),
(2, 'CREAR_ORDEN_COMPRA', 'Crear orden de compra'),
(2, 'EDITAR_ORDEN_COMPRA', 'Editar orden de compra'),
(2, 'VER_REPORTES', 'Ver reportes'),
(2, 'GESTIONAR_USUARIOS', 'Gestionar usuarios'),
(3, 'VER_STOCK', 'Ver stock');

-- Insertar usuario administrador de prueba (contraseña: admin123)
INSERT IGNORE INTO usuarios (id, nombre, email, contrasena, rol_id) VALUES 
(1, 'Administrador', 'admin@example.com', '$2b$10$qBGMRPPaq69Uu2fj.PhRpOn/tNGsBUl2DMtt5KicOk3KIKsOReMEW', 1);