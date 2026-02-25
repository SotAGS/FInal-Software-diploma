# Deploy en Railway (preparado)

## 1) Crear proyecto en Railway
- Entra a Railway y crea un proyecto nuevo desde el repo de GitHub.
- Selecciona esta rama principal (`main`).

## 2) Variables de entorno necesarias
Configura estas variables en Railway:

- `NODE_ENV=production`
- `PORT` (Railway la inyecta automáticamente)
- `SESSION_SECRET` (obligatoria, valor largo y privado)
- `APP_BASE_URL=https://<tu-dominio-railway>`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

## 3) Comandos ya preparados
El proyecto ya quedó configurado para Railway con:
- Build: `npm install && npm run build`
- Start: `npm run start:railway`

`start:railway` ejecuta:
1. migraciones compiladas (`npm run migrate:prod`)
2. arranque del servidor (`npm start`)

## 4) Healthcheck
Railway verificará:
- `GET /health`

Debe responder `200` con `{ "ok": true }`.

## 5) Verificación rápida post-deploy
1. Abrir `/login`
2. Iniciar sesión
3. Abrir `/Reportes`
4. Descargar un PDF de reporte y validar que se descargue correctamente

## Notas
- La ruta técnica `/fix-tabla-usuarios` quedó deshabilitada en producción.
- Si no defines `APP_BASE_URL`, la generación de PDF puede apuntar a localhost y fallar.
