import express from "express";
import path from "path";
import fs from "fs";
import session from "express-session";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

import { initializePool } from "./config/database";

import rutasInventario from "./Rutas/rutasInventario";
import rutasReportes from "./Rutas/rutasReportes";
import rutasUsuarios from "./Rutas/rutasUsuarios";
import rutasSeguridad from "./Rutas/rutasSeguridad";
import rutasCompras from "./Rutas/rutasCompras";
import rutasProveedores from "./Rutas/rutasProveedores";
import rutasRoles from "./Rutas/rutasRoles";
import rutasVentas from "./Rutas/rutasVentas";

import { autenticado } from "./Middlewares/autenticacion";

const expressLayouts = require("express-ejs-layouts");

const app = express();
const PORT = 3000;

/* ===========================
   INICIALIZAR BASE DE DATOS
=========================== */
initializePool().catch(err => {
  console.error('Error al conectar a la base de datos:', err);
  process.exit(1);
});

/* ===========================
   BODY PARSER
=========================== */
app.use(express.urlencoded({ extended: true }));

/* ===========================
   SESSION
=========================== */
app.use(session({
  secret: "clave_super_secreta",
  resave: false,
  saveUninitialized: false
}));

/* ===========================
   PUENTE SESSION → USUARIO
=========================== */
import { RepositorioUsuario } from "./Modelo/Repositorios/RepositorioUsuario";
import { Usuario } from "./Modelo/Entidades/Usuario";
import { Rol } from "./Modelo/Entidades/Rol";
import { PermisoCompuesto } from "./Modelo/Seguridad/PermisoCompuesto";
import { PermisoAtomico } from "./Modelo/Seguridad/PermisoAtomico";

const repoUsuario = new RepositorioUsuario();

app.use(async (req: any, res, next) => {

  const usuarioId = req.session?.usuarioId;

  if (usuarioId) {
    try {
      // ADMIN HARDCODEADO
      if (usuarioId === -1 || req.session?.isHardcodedAdmin) {
        const permisosAdmin = new PermisoCompuesto("ADMIN", "Todos los permisos");
        permisosAdmin.agregar(new PermisoAtomico("CREAR_PRODUCTO", "Crear producto"));
        permisosAdmin.agregar(new PermisoAtomico("ELIMINAR_PRODUCTO", "Eliminar producto"));
        permisosAdmin.agregar(new PermisoAtomico("EDITAR_PRODUCTO", "Editar producto"));
        permisosAdmin.agregar(new PermisoAtomico("VER_STOCK", "Ver stock"));
        permisosAdmin.agregar(new PermisoAtomico("CREAR_ORDEN_COMPRA", "Crear orden de compra"));
        permisosAdmin.agregar(new PermisoAtomico("EDITAR_ORDEN_COMPRA", "Editar orden de compra"));
        permisosAdmin.agregar(new PermisoAtomico("VER_REPORTES", "Ver reportes"));
        permisosAdmin.agregar(new PermisoAtomico("GESTIONAR_USUARIOS", "Gestionar usuarios"));
        permisosAdmin.agregar(new PermisoAtomico("GESTIONAR_ROLES", "Gestionar roles"));
        
        const rolAdmin = new Rol("ADMIN", permisosAdmin);
        const adminHardcoded = new Usuario(-1, "Administrador", "admin@empresa.com", "admin123", rolAdmin);
        req.usuario = adminHardcoded;
        res.locals.usuario = adminHardcoded;
      } else {
        // Usuario normal de BD
        const usuario = await repoUsuario.buscarPorId(usuarioId);
        req.usuario = usuario;
        res.locals.usuario = usuario;
      }
    } catch (error) {
      console.error("Error al cargar usuario:", error);
      req.usuario = null;
      res.locals.usuario = null;
    }
  } else {
    req.usuario = null;
    res.locals.usuario = null;
  }

  next();
});

/* ===========================
   MOTOR DE VISTAS
=========================== */
app.set("view engine", "ejs");
const viewsCandidateRoot = path.join(__dirname, "..", "Vista", "views");
const viewsCandidateDist = path.join(__dirname, "Vista", "views");
const viewsPath = fs.existsSync(viewsCandidateRoot) ? viewsCandidateRoot : viewsCandidateDist;
app.set("views", viewsPath);

/* ===========================
   LAYOUT
=========================== */
app.use(expressLayouts);
app.set("layout", "layout");

/* ===========================
   ESTÁTICOS
=========================== */
const publicCandidateRoot = path.join(__dirname, "..", "public");
const publicCandidateDist = path.join(__dirname, "public");
const staticPath = fs.existsSync(publicCandidateRoot) ? publicCandidateRoot : publicCandidateDist;
app.use(express.static(staticPath));

/* ===========================
   SEGURIDAD
=========================== */
app.use(rutasSeguridad);

/* ===========================
   FIX BD (TEMPORAL - ELIMINAR DESPUÉS)
=========================== */
app.get("/fix-tabla-usuarios", async (req, res) => {
  try {
    const { getPool } = await import("./config/database");
    const pool = getPool();
    
    await pool.query(`SET FOREIGN_KEY_CHECKS = 0`);
    await pool.query(`DROP TABLE IF EXISTS login_logout`);
    await pool.query(`DROP TABLE IF EXISTS usuarios`);
    
    await pool.query(`
      CREATE TABLE usuarios (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        contrasena VARCHAR(255) NOT NULL,
        rol VARCHAR(50) NOT NULL DEFAULT 'EMPLEADO',
        activo BOOLEAN DEFAULT TRUE,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE TABLE login_logout (
        id INT PRIMARY KEY AUTO_INCREMENT,
        usuario_id INT,
        tipo_evento VARCHAR(20),
        detalle VARCHAR(255),
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
      )
    `);
    
    await pool.query(`SET FOREIGN_KEY_CHECKS = 1`);
    
    res.json({ success: true, message: "Tabla usuarios recreada correctamente" });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/* ===========================
   PROTEGER TODO EL SISTEMA
=========================== */
app.use(autenticado);

/* ===========================
   MÓDULOS
=========================== */
app.use("/Inventario", rutasInventario);
app.use("/Reportes", rutasReportes);
app.use("/Usuarios", rutasUsuarios);
app.use("/Compras", rutasCompras);
app.use("/Proveedores", rutasProveedores);
app.use("/proveedores", rutasProveedores);
app.use("/Roles", rutasRoles);
app.use("/Ventas", rutasVentas);

/* ===========================
   HOME
=========================== */
app.get("/", (req, res) => {
  res.render("home", {
    titulo: "Home"
  });
});

/* ===========================
   404 CONTROLADO
=========================== */
app.use((req, res) => {
  res.status(404).render("404");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

export default app;