# Deploy en Render (recomendado)

Esta app usa **MySQL**. Render no ofrece MySQL administrado en todos los planes, así que la opción más simple es:

- Deploy del **web service** en Render
- Base de datos MySQL externa

## 1) Crear servicio web en Render

1. En Render: **New +** -> **Blueprint** (si detecta `render.yaml`) o **Web Service**
2. Conectar el repo GitHub
3. Si usas Web Service manual, configurar:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Health Check Path: `/health`

## 2) Variables de entorno (Render -> Environment)

Cargar estas variables:


### DATABASE_URL

Usa la URL pública de tu proveedor MySQL externo como valor de `DATABASE_URL`.

## 3) Migraciones
 El servicio arranca con `npm start` sin ejecutar migraciones automáticamente.
Con esta configuración, el servicio arranca sin correr migraciones en startup.

Opciones para migrar:
- O abrir Shell en Render y ejecutar `npm run migrate:prod`

## 4) Validación

- Abrir `https://<tu-servicio>.onrender.com/health` -> debe responder `200` con `{ "ok": true }`
- Abrir `https://<tu-servicio>.onrender.com/login`

## 5) Problemas comunes

- Si `/health` falla: revisar logs de runtime
- Si aparece `localhost:3306`: `DATABASE_URL` no está configurada
- Si login o vistas fallan: revisar variables SMTP y `APP_BASE_URL`
