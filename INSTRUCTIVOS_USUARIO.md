# Instructivos de Usuario - Sistema de Gestión Empresarial

## Tabla de Contenidos
1. [Autenticación](#autenticación)
2. [Módulo de Usuarios](#módulo-de-usuarios)
3. [Módulo de Productos](#módulo-de-productos)
4. [Módulo de Reportes](#módulo-de-reportes)
5. [Módulo de Auditoría](#módulo-de-auditoría)

---

## Autenticación

### Iniciar Sesión
1. Acceda a la página de login (http://localhost:3000/login)
2. Ingrese su **email** registrado en el sistema
3. Ingrese su **contraseña**
4. Haga clic en el botón **"Iniciar Sesión"**

**Credenciales de ejemplo:**
- Email: `admin@empresa.com`
- Contraseña: `admin123`

### Cerrar Sesión
1. En la esquina superior derecha, encontrará el botón **"Cerrar sesión"**
2. Haga clic para salir del sistema

---

## Módulo de Usuarios

### Acceder al Módulo
1. Desde el menú lateral, seleccione **"Usuarios"**
2. Verá un listado de todos los usuarios activos del sistema

### Crear Nuevo Usuario
1. Haga clic en el botón **"+ Crear Usuario"**
2. Complete los siguientes campos:
   - **Nombre:** Nombre completo del usuario
   - **Email:** Correo electrónico único
   - **Contraseña:** Contraseña segura
   - **Rol:** Seleccione uno de los siguientes:
     - **ADMIN:** Acceso total al sistema
     - **GERENTE:** Acceso a compras, inventario y reportes
     - **EMPLEADO:** Acceso limitado a consultas
3. Haga clic en **"Crear Usuario"**

### Editar Usuario
1. En el listado de usuarios, haga clic en el botón **"Editar"** del usuario que desea modificar
2. Puede cambiar:
   - Nombre
   - Email
   - Rol
3. **Nota:** La contraseña no puede cambiar desde aquí por seguridad
4. Haga clic en **"Actualizar Usuario"**

### Eliminar Usuario
1. En el listado de usuarios, haga clic en el botón **"Eliminar"**
2. Confirme la acción en el diálogo de confirmación
3. El usuario será marcado como inactivo (no se elimina permanentemente)

---

## Módulo de Productos

### Acceder al Módulo
1. Desde el menú lateral, seleccione **"Inventario"**
2. Verá el listado de todos los productos activos

### Crear Producto
1. Haga clic en **"Crear Producto"**
2. Complete los campos:
   - **Nombre:** Nombre del producto
   - **SKU:** Código único de identificación
   - **Descripción:** Detalles del producto
   - **Stock Inicial:** Cantidad disponible
   - **Precio Unitario:** Costo del producto
   - **Categoría:** Tipo de producto
3. Haga clic en **"Crear"**

### Editar Producto
1. En el listado, haga clic en **"Editar"** al lado del producto
2. Modifique los campos necesarios
3. Haga clic en **"Guardar"**

### Ver Detalles
1. Haga clic en el nombre del producto para ver más información
2. Verá el historial de movimientos

---

## Módulo de Reportes

### Acceder a Reportes
1. Desde el menú lateral, seleccione **"Reportes"**
2. Verá tres opciones principales:

### 1. Desempeño de Compras
- **Qué muestra:** Análisis de completitud de órdenes por proveedor
- **Período:** Últimos 30 días
- **Métricas:**
  - Total de órdenes por proveedor
  - Órdenes completadas
  - Órdenes con faltantes
  - Tasa de completitud (%)
- **Uso:** Evaluar el desempeño de proveedores

### 2. Rotación de Inventario
- **Qué muestra:** Estado actual del stock de todos los productos
- **Indicadores de estado:**
  - 🔴 **CRÍTICO:** Menos de 10 unidades
  - 🟠 **BAJO:** 10 a 50 unidades
  - 🔵 **NORMAL:** 50 a 100 unidades
  - 🟢 **ALTO:** Más de 100 unidades
- **Información:** Valor total de inventario, precio unitario
- **Uso:** Identificar productos con bajo stock y hacer recompras

### 3. Auditoría de Accesos
- **Qué muestra:** Registro de logins, logouts e intentos fallidos
- **Período:** Últimos 7 días
- **Información:**
  - Fecha del acceso
  - Usuario que accedió
  - Email del usuario
  - Cantidad de accesos
  - Cantidad de salidas
  - Intentos fallidos de login
- **Uso:** Monitorear seguridad y actividad de usuarios

### Descargar Reportes
1. Los reportes pueden exportarse en formato JSON a través de las API endpoints:
   - `/Reportes/api/desempenio-compras`
   - `/Reportes/api/rotacion-inventario`
   - `/Reportes/api/auditoria-accesos`

---

## Módulo de Auditoría

### Acceder a Auditoría
1. Desde el menú lateral, seleccione **"Auditoría"**
2. Verá un registro detallado de todos los cambios en el sistema

### Información Registrada
Se registra automáticamente:
- **Quién:** Usuario que realizó el cambio
- **Qué:** Tipo de entidad modificada (Producto, Usuario, Orden, etc.)
- **Cuándo:** Fecha y hora exacta
- **Acción:** Tipo de operación (CREAR, ACTUALIZAR, ELIMINAR)
- **Valor Anterior:** Estado previo del registro
- **Valor Nuevo:** Estado posterior del registro

### Filtrar Auditoría
1. Busque por:
   - Tipo de entidad
   - ID de la entidad
   - Usuario específico
   - Rango de fechas

### Descargar Reportes de Auditoría
- Los datos de auditoría se pueden exportar a través de la API en formato JSON

---

## Seguridad y Mejores Prácticas

### Contraseñas
- Utilice contraseñas con al menos 8 caracteres
- Combine letras mayúsculas, minúsculas, números y símbolos
- Cambie su contraseña regularmente
- No comparta su contraseña con otros usuarios

### Roles y Permisos
- **ADMIN:** 
  - Crear, editar y eliminar usuarios
  - Gestionar todos los módulos
  - Ver todos los reportes
  
- **GERENTE:**
  - Crear órdenes de compra
  - Ver inventario
  - Acceder a reportes
  
- **EMPLEADO:**
  - Ver inventario
  - Realizar consultas básicas

### Auditoría
- Todos los cambios quedan registrados en el sistema
- La auditoría NO puede ser modificada por seguridad
- Cada acción se vincula al usuario que la realizó

---

## Solución de Problemas

### "Credenciales incorrectas"
- Verifique que el email sea correcto
- Verifique que la contraseña sea correcta (es sensible a mayúsculas)
- Contacte al administrador si olvidó su contraseña

### "Usuario no tiene permisos"
- Este módulo requiere un rol específico
- Contacte al administrador para solicitar acceso

### "Error al cargar datos"
- Recargue la página (F5)
- Verifique su conexión a internet
- Intente cerrar sesión y volver a iniciar

---

## Contacto de Soporte
Para reportar problemas o solicitar asistencia, contacte al administrador del sistema.

**Última actualización:** 2024
