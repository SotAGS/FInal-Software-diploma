# Sistema de Gestión Empresarial - Diploma de Software

Un sistema completo de gestión empresarial con auditoría integrada, reportes inteligentes y gestión de usuarios.

## 🎯 Características

- ✅ **Autenticación de Usuarios:** Sistema de login con auditoría de accesos
- ✅ **Gestión de Usuarios CRUD:** Crear, editar, eliminar usuarios con roles y permisos
- ✅ **Gestión de Roles:** Crear roles y editar sus permisos desde la aplicación (solo ADMIN)
- ✅ **Auditoría Completa:** Registro persistente de todos los cambios en la BD
- ✅ **3 Reportes Funcionales:** Con gráficos interactivos (Chart.js)
  - Desempeño de Compras (30 días)
  - Rotación de Inventario (alertas por stock)
  - Auditoría de Accesos (7 días)
- ✅ **Pruebas Unitarias:** Jest con pruebas de caja blanca y negra
- ✅ **State Pattern:** Para gestionar estados de órdenes de compra
- ✅ **Repository Pattern:** Acceso a datos normalizado
- ✅ **Permissions System:** Composite pattern para permisos granulares

## 🛠 Stack Tecnológico

- **Backend:** Node.js, Express.js, TypeScript
- **Base de Datos:** MySQL 8 con mysql2 (async/await)
- **Frontend:** EJS, CSS3
- **Gráficos:** Chart.js
- **Testing:** Jest, ts-jest
- **Patrones:** Design Patterns (State, Repository, Composite, Singleton)

## 📋 Requisitos

- Node.js v14+
- MySQL 8+
- npm o yarn

## 🚀 Instalación y Ejecución

### 1. Clonar el repositorio
```bash
git clone https://github.com/SotAGS/FInal-Software-diploma.git
cd FInal-Software-diploma
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crear archivo `.env` en la raíz:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=final_software_diploma
DB_PORT=3306
PORT=3000
SESSION_SECRET=tu_llave_de_sesion_secreta
NODE_ENV=development
```

### 4. Ejecutar migraciones
```bash
npm run migrate
```

Esto creará:
- Base de datos
- Tablas (usuarios, productos, órdenes, auditoría, etc.)
- Datos de prueba (usuarios admin, productos, etc.)

### 5. Iniciar servidor de desarrollo
```bash
npm run dev
```

El servidor estará disponible en: `http://localhost:3000`

### 6. Credenciales de prueba
- Email: `admin@empresa.com`
- Password: `admin123`

## 📁 Estructura del Proyecto

```
final-software-diploma/
├── Controladoras/              # Controladores (lógica de negocio)
│   ├── controladoraSeguridad.ts
│   ├── controladoraReportes.ts
│   └── ...
├── Modelo/
│   ├── Entidades/             # Clases de dominio
│   ├── Repositorios/          # Data access layer (async)
│   ├── Servicios/             # ServicioAuditoria
│   ├── Seguridad/             # Permisos y Roles
│   └── State/                 # State pattern para órdenes
├── Middlewares/               # Express middlewares (auth)
├── Rutas/                     # Definición de rutas
├── Vista/views/               # Templates EJS
├── public/                    # Assets estáticos (CSS)
├── __tests__/                 # Pruebas unitarias Jest
│   ├── ServicioAuditoria.test.ts
│   ├── RepositorioUsuario.test.ts
│   └── Login.test.ts
├── migrations/                # SQL migrations
├── app.ts                     # Punto de entrada
├── package.json
└── tsconfig.json
```

## 🧪 Pruebas

### Ejecutar todas las pruebas
```bash
npm test
```

### Modo watch (recarga automática)
```bash
npm run test:watch
```

### Cobertura de pruebas
```bash
npm run test:coverage
```

### Tipos de Pruebas Incluidas
- **Unitarias:** ServicioAuditoria, RepositorioUsuario
- **Caja Blanca:** Login con auditoría integrada
- **Caja Negra:** Comportamiento externo del login

## 📊 Reportes Disponibles

### 1. Desempeño de Compras
- **Endpoint:** `GET /Reportes/desempenio-compras`
- **API JSON:** `GET /Reportes/api/desempenio-compras`
- **Datos:** Completitud por proveedor (últimos 30 días)

### 2. Rotación de Inventario
- **Endpoint:** `GET /Reportes/rotacion-inventario`
- **API JSON:** `GET /Reportes/api/rotacion-inventario`
- **Datos:** Stock actual con alertas de bajo nivel

### 3. Auditoría de Accesos
- **Endpoint:** `GET /Reportes/auditoria-accesos`
- **API JSON:** `GET /Reportes/api/auditoria-accesos`
- **Datos:** Logins, logouts, intentos fallidos (7 días)

## 🔒 Seguridad

### Auditoría Persistente
- Todos los cambios se registran en la BD
- Tabla `auditoria` con: usuario, entidad, acción, valores antes/después
- Tabla `login_logout` con: tipo (LOGIN/LOGOUT/LOGIN_FAIL), fecha, usuario

### Login Auditing
- ✅ LOGIN exitoso registrado
- ✅ LOGIN_FAIL registrado con motivo
- ✅ LOGOUT registrado

### Roles y Permisos
- ADMIN: Acceso total
- GERENTE: Compras, inventario, reportes
- EMPLEADO: Consultas básicas

## 🗄 Base de Datos

### Tablas Principales
- `usuarios` (id, nombre, email, password, rol, activo)
- `productos` (id, nombre, sku, stock, precio, activo)
- `ordenes_compra` (id, proveedor_id, estado, fecha_creacion)
- `auditoria` (id, usuario_id, entidad, id_entidad, accion, valor_anterior, valor_nuevo)
- `login_logout` (id, usuario_id, tipo, email, motivo, fecha_hora)

## 🚂 Migraciones

Ejecutar manualmente:
```bash
npm run migrate
```

Las migraciones en `/migrations/`:
1. `001_create_database.sql` - Crea BD y estructura básica
2. `002_create_tables.sql` - Todas las tablas
3. `003_insert_seed_data.sql` - Datos de prueba

## 🔧 Compilación

### Compilar TypeScript a JavaScript
```bash
npm run build
```

Output en carpeta `dist/`

### Ejecutar versión compilada
```bash
npm start
```

## 📱 API Endpoints

### Autenticación
- `POST /login` - Iniciar sesión
- `GET /logout` - Cerrar sesión

### Usuarios
- `GET /Usuarios` - Listar usuarios
- `GET /Usuarios/crear` - Formulario crear
- `POST /Usuarios` - Guardar usuario
- `GET /Usuarios/:id/editar` - Formulario editar
- `POST /Usuarios/:id` - Actualizar
- `POST /Usuarios/:id/eliminar` - Eliminar

### Roles
- `GET /Roles` - Menú de roles (solo ADMIN)
- `GET /Roles/crear` - Formulario crear rol (solo ADMIN)
- `POST /Roles` - Guardar rol (solo ADMIN)
- `GET /Roles/:id/editar` - Formulario editar rol/permisos (solo ADMIN)
- `POST /Roles/:id` - Actualizar rol/permisos (solo ADMIN)
- `POST /Roles/:id/eliminar` - Eliminar rol (solo ADMIN, excepto ADMIN)

### Reportes
- `GET /Reportes` - Página de reportes
- `GET /Reportes/desempenio-compras` - Reporte desempeño
- `GET /Reportes/rotacion-inventario` - Reporte stock
- `GET /Reportes/auditoria-accesos` - Reporte accesos
- `GET /Reportes/api/*` - Versiones JSON

## 📚 Documentación Adicional

- [INSTRUCTIVOS_USUARIO.md](./INSTRUCTIVOS_USUARIO.md) - Guía de uso para usuarios finales
- [tsconfig.json](./tsconfig.json) - Configuración TypeScript
- [jest.config.js](./jest.config.js) - Configuración de pruebas

## 🐛 Troubleshooting

### Error de conexión a BD
```bash
# Verificar que MySQL está corriendo
# Verificar credenciales en .env
# Ejecutar migraciones: npm run migrate
```

### Errores de TypeScript
```bash
npm run build
```

### Puertos en uso
```bash
# Cambiar PORT en .env a otro valor (ej: 3001)
```

## 📝 Licencia

ISC

## 👤 Autor

Alejandro - Final Software Project

---

**Última actualización:** 2024
**Versión:** 1.0.0
