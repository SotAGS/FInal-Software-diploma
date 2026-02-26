import { Response } from "express";
import { RepositorioUsuario } from "../Modelo/Repositorios/RepositorioUsuario";
import { Usuario } from "../Modelo/Entidades/Usuario";
import { Rol } from "../Modelo/Entidades/Rol";
import { PermisoCompuesto } from "../Modelo/Seguridad/PermisoCompuesto";
import { ServicioAuditoria } from "../Modelo/Servicios/ServicioAuditoria";
import { getPool } from "../config/database";
import crypto from "crypto";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";

const repoUsuario = new RepositorioUsuario();
const BCRYPT_ROUNDS = 10;

const pareceHashBcrypt = (valor: string): boolean => {
    return valor.startsWith("$2a$") || valor.startsWith("$2b$") || valor.startsWith("$2y$");
};

const hashPassword = async (passwordPlano: string): Promise<string> => {
    return bcrypt.hash(passwordPlano, BCRYPT_ROUNDS);
};

let tablaRecuperacionVerificada = false;

const asegurarTablaRecuperacion = async (): Promise<void> => {
    if (tablaRecuperacionVerificada) {
        return;
    }

    const pool = getPool();
    await pool.query(`
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
        )
    `);

    tablaRecuperacionVerificada = true;
};

const obtenerColumnaPassword = async (): Promise<"contrasena" | "password"> => {
    const pool = getPool();
    const [rows] = await pool.query<any[]>(
        `SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'usuarios'
           AND COLUMN_NAME IN ('contrasena', 'password')`
    );

    const columnas = (rows as any[]).map(r => String(r.COLUMN_NAME));
    if (columnas.includes("contrasena")) {
        return "contrasena";
    }

    return "password";
};

const construirResetUrl = (token: string): string => {
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    return `${baseUrl}/reset-password?token=${token}`;
};

const smtpEstaConfigurado = (): boolean => {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    return Boolean(host && user && pass && from);
};

const enviarCorreoRecuperacion = async (emailDestino: string, token: string): Promise<boolean> => {
    const resetUrl = construirResetUrl(token);

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    if (!host || !user || !pass || !from) {
        console.log("[RECUPERAR PASSWORD] SMTP no configurado. Link de recuperación:", resetUrl);
        return false;
    }

    const port = Number(process.env.SMTP_PORT || 587);
    const secure = port === 465;

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user,
            pass
        }
    });

    try {
        await transporter.sendMail({
            from,
            to: emailDestino,
            subject: "Recuperación de contraseña",
            text: `Recibimos una solicitud para restablecer tu contraseña. Usa este enlace: ${resetUrl}. El enlace vence en 1 hora.`,
            html: `
                <p>Recibimos una solicitud para restablecer tu contraseña.</p>
                <p><a href="${resetUrl}">Haz clic aquí para restablecerla</a></p>
                <p>Este enlace vence en 1 hora.</p>
            `
        });

        return true;
    } catch (error) {
        console.error("[RECUPERAR PASSWORD] Error enviando correo SMTP:", error);
        console.log("[RECUPERAR PASSWORD] Link de recuperación:", resetUrl);
        return false;
    }
};

type ResultadoRecuperacionPassword = {
    ok: boolean;
    mensaje: string;
    resetUrl: string | null;
};

const solicitarRecuperacionPorEmailPrincipal = async (emailPrincipal: string): Promise<ResultadoRecuperacionPassword> => {
    const email = emailPrincipal.trim().toLowerCase();

    if (!email) {
        return {
            ok: false,
            mensaje: "Debe ingresar un email",
            resetUrl: null
        };
    }

    await asegurarTablaRecuperacion();
    const usuario = await repoUsuario.buscarPorEmail(email);

    if (!usuario) {
        return {
            ok: false,
            mensaje: "El email no coincide con ningún usuario registrado.",
            resetUrl: null
        };
    }

    const emailDestino = (usuario.getBackupEmail() || "").trim().toLowerCase();
    if (!emailDestino) {
        return {
            ok: false,
            mensaje: "Este usuario no tiene un mail de backup válido configurado.",
            resetUrl: null
        };
    }

    const pool = getPool();
    const token = crypto.randomBytes(32).toString("hex");

    await pool.query(
        `DELETE FROM password_resets WHERE usuario_id = ? AND used_at IS NULL`,
        [usuario.getId()]
    );

    await pool.query(
        `INSERT INTO password_resets (usuario_id, email, token, expires_at)
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
        [usuario.getId(), emailDestino, token]
    );

    const resetUrl = construirResetUrl(token);

    if (!smtpEstaConfigurado()) {
        console.log("[RECUPERAR PASSWORD] SMTP no configurado. Link de recuperación:", resetUrl);
        return {
            ok: true,
            mensaje: `SMTP no configurado. Se generó un enlace para recuperar la contraseña de ${email}.`,
            resetUrl
        };
    }

    const enviado = await enviarCorreoRecuperacion(emailDestino, token);

    if (!enviado) {
        return {
            ok: false,
            mensaje: "No se pudo enviar el correo de recuperación. Intente nuevamente.",
            resetUrl: null
        };
    }

    return {
        ok: true,
        mensaje: `Correo de recuperación enviado al mail de backup de ${email}.`,
        resetUrl: null
    };
};

const buscarTokenValido = async (token: string): Promise<{ id: number; usuario_id: number } | null> => {
    const pool = getPool();
    const [rows] = await pool.query<any[]>(
        `SELECT id, usuario_id
         FROM password_resets
         WHERE token = ?
           AND used_at IS NULL
           AND expires_at > NOW()
         LIMIT 1`,
        [token]
    );

    if (!(rows as any[]).length) {
        return null;
    }

    return {
        id: Number((rows as any[])[0].id),
        usuario_id: Number((rows as any[])[0].usuario_id)
    };
};

const obtenerRolesDisponibles = async (): Promise<string[]> => {
    const roles = await repoUsuario.obtenerNombresRoles();
    if (roles.length > 0) {
        return roles;
    }

    return ["ADMIN", "GERENTE", "EMPLEADO"];
};

/* ===========================
   MOSTRAR LOGIN
=========================== */
export const mostrarLogin = (req: any, res: Response): void => {

    if (req.usuario) {
        return res.redirect("/");
    }

    res.render("seguridad/login", {
        error: typeof req.query.error === "string" ? req.query.error : null,
        success: typeof req.query.success === "string" ? req.query.success : null
    });
};

/* ===========================
   PROCESAR LOGIN
=========================== */
export const login = async (req: any, res: Response): Promise<void> => {

    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    req.session.lastLoginEmail = email;

    if (!email || !password) {
        return res.render("seguridad/login", {
            error: "Debe completar todos los campos",
            success: null
        });
    }

    // ADMIN HARDCODEADO
    if (email === 'admin@empresa.com' && password === 'admin123') {
        req.session.usuarioId = -1; // ID especial para admin hardcodeado
        req.session.isHardcodedAdmin = true;
        return res.redirect("/");
    }

    // Usuarios normales de la BD
    const usuario = await repoUsuario.buscarPorEmail(email);

    let credencialesValidas = false;
    if (usuario) {
        const passwordGuardada = usuario.getPassword();

        if (pareceHashBcrypt(passwordGuardada)) {
            credencialesValidas = await bcrypt.compare(password, passwordGuardada);
        } else {
            credencialesValidas = passwordGuardada === password;

            if (credencialesValidas) {
                try {
                    const pool = getPool();
                    const columnaPassword = await obtenerColumnaPassword();
                    const nuevoHash = await hashPassword(password);

                    await pool.query(
                        `UPDATE usuarios SET ${columnaPassword} = ? WHERE id = ?`,
                        [nuevoHash, usuario.getId()]
                    );
                } catch (error) {
                    console.error("No se pudo migrar contraseña legacy a hash:", error);
                }
            }
        }
    }

    if (!usuario || !credencialesValidas) {
        const servicio = ServicioAuditoria.obtenerInstancia();
        await servicio.registrarLoginFallido(email, "Credenciales inválidas");
        
        return res.render("seguridad/login", {
            error: "Credenciales incorrectas",
            success: null
        });
    }

    req.session.usuarioId = usuario.getId();

    const servicio = ServicioAuditoria.obtenerInstancia();
    await servicio.registrarLogin(usuario.getId());

    res.redirect("/");
};

/* ===========================
   LOGOUT
=========================== */
export const logout = async (req: any, res: Response): Promise<void> => {
    if (req.usuario) {
        const servicio = ServicioAuditoria.obtenerInstancia();
        await servicio.registrarLogout(req.usuario.getId());
    }

    req.session.destroy((err: any) => {
        if (err) {
            return res.status(500).send("Error al cerrar sesión");
        }

        res.redirect("/login");
    });
};

/* ===========================
   LISTAR USUARIOS
=========================== */
export const listarUsuarios = async (req: any, res: Response): Promise<void> => {
    try {
        const usuarios = await repoUsuario.obtenerTodos(true);
        res.render("usuarios/index", {
            usuarios: usuarios,
            error: req.query.error || null,
            success: req.query.success || null,
            titulo: "Gestión de Usuarios"
        });
    } catch (error) {
        console.error(error);
        res.status(500).render("usuarios/index", {
            usuarios: [],
            error: "Error al cargar usuarios",
            success: null,
            titulo: "Gestión de Usuarios"
        });
    }
};

/* ===========================
   MOSTRAR FORMULARIO CREAR
=========================== */
export const mostrarFormularioCrear = async (req: any, res: Response): Promise<void> => {
    const roles = await obtenerRolesDisponibles();

    res.render("usuarios/crear", {
        titulo: "Crear Usuario",
        roles,
        error: null,
        formData: {
            nombre: "",
            email: "",
            backupEmail: "",
            rol: ""
        }
    });
};

/* ===========================
   CREAR USUARIO
=========================== */
export const crearUsuario = async (req: any, res: Response): Promise<void> => {
    try {
        const { nombre, password, rol } = req.body;
        const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
        const backupEmail = typeof req.body.backupEmail === "string" && req.body.backupEmail.trim()
            ? req.body.backupEmail.trim().toLowerCase()
            : null;
        const roles = await obtenerRolesDisponibles();

        if (!nombre || !email || !password || !rol) {
            return res.render("usuarios/crear", {
                titulo: "Crear Usuario",
                roles,
                error: "Todos los campos son obligatorios",
                formData: { nombre, email, backupEmail: backupEmail || "", rol }
            });
        }

        // Si el usuario actual es GERENTE y quiere crear un ADMIN, no se permite
        const usuarioActual = req.usuario as Usuario;
        if (usuarioActual?.getRol().nombre === "GERENTE" && rol === "ADMIN") {
            return res.render("usuarios/crear", {
                titulo: "Crear Usuario",
                roles,
                error: "Los gerentes no pueden crear usuarios administradores",
                formData: { nombre, email, backupEmail: backupEmail || "", rol }
            });
        }

        // Verificar que el email no exista
        const usuarioExistente = await repoUsuario.buscarPorEmail(email);
        if (usuarioExistente) {
            return res.render("usuarios/crear", {
                titulo: "Crear Usuario",
                roles,
                error: "El email ya está registrado",
                formData: { nombre, email, backupEmail: backupEmail || "", rol }
            });
        }

        // Crear permiso compuesto simplificado para el rol
        const permisos = new PermisoCompuesto(rol, `Permisos de ${rol}`);
        const nuevoRol = new Rol(rol, permisos);

        const passwordHasheada = await hashPassword(password);
        const nuevoUsuario = new Usuario(0, nombre, email, passwordHasheada, nuevoRol, true, backupEmail);
        await repoUsuario.crear(nuevoUsuario);

        const servicio = ServicioAuditoria.obtenerInstancia();
        await servicio.registrarCambio("Usuario", 0, "CREAR", req.usuario?.getId() || 0, null, `${nombre} (${email})`);
        
        res.redirect("/Usuarios?success=Usuario creado exitosamente");
    } catch (error) {
        console.error("ERROR CREAR USUARIO:", error);
        res.status(500).render("usuarios/crear", {
            titulo: "Crear Usuario",
            roles: await obtenerRolesDisponibles(),
            error: `Error: ${(error as any).message}`,
            formData: {
                nombre: req.body?.nombre || "",
                email: req.body?.email || "",
                backupEmail: req.body?.backupEmail || "",
                rol: req.body?.rol || ""
            }
        });
    }
};

/* ===========================
   MOSTRAR FORMULARIO EDITAR
=========================== */
export const mostrarFormularioEditar = async (req: any, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const usuario = await repoUsuario.buscarPorId(parseInt(id));

        if (!usuario) {
            return res.status(404).render("404", {
                titulo: "Usuario no encontrado"
            });
        }

        res.render("usuarios/editar", {
            usuario: usuario,
            titulo: "Editar Usuario",
            roles: await obtenerRolesDisponibles(),
            error: null
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error al cargar el usuario");
    }
};

/* ===========================
   ACTUALIZAR USUARIO
=========================== */
export const actualizarUsuario = async (req: any, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { nombre, rol } = req.body;
        const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
        const backupEmail = typeof req.body.backupEmail === "string" && req.body.backupEmail.trim()
            ? req.body.backupEmail.trim().toLowerCase()
            : null;
        const roles = await obtenerRolesDisponibles();

        if (!nombre || !email || !rol) {
            return res.render("usuarios/editar", {
                titulo: "Editar Usuario",
                roles,
                error: "Todos los campos son obligatorios"
            });
        }

        const usuarioActual = await repoUsuario.buscarPorId(parseInt(id));
        if (!usuarioActual) {
            return res.status(404).render("404", {
                titulo: "Usuario no encontrado"
            });
        }

        // Si el usuario autenticado es GERENTE y el usuario a editar es ADMIN, no se permite
        const usuarioAutenticado = req.usuario as Usuario;
        if (usuarioAutenticado?.getRol().nombre === "GERENTE" && usuarioActual.getRol().nombre === "ADMIN") {
            return res.render("usuarios/editar", {
                titulo: "Editar Usuario",
                usuario: usuarioActual,
                roles,
                error: "Los gerentes no pueden editar usuarios administradores"
            });
        }

        // Si el usuario autenticado es GERENTE y quiere cambiar el rol a ADMIN, no se permite
        if (usuarioAutenticado?.getRol().nombre === "GERENTE" && rol === "ADMIN") {
            return res.render("usuarios/editar", {
                titulo: "Editar Usuario",
                usuario: usuarioActual,
                roles,
                error: "Los gerentes no pueden crear usuarios administradores"
            });
        }

        // Verificar que el email no esté en uso por otro usuario
        const usuarioEmailExistente = await repoUsuario.buscarPorEmail(email);
        if (usuarioEmailExistente && usuarioEmailExistente.getId() !== parseInt(id)) {
            return res.render("usuarios/editar", {
                titulo: "Editar Usuario",
                usuario: usuarioActual,
                roles,
                error: "El email ya está registrado por otro usuario"
            });
        }

        const permisos = new PermisoCompuesto(rol, `Permisos de ${rol}`);
        const nuevoRol = new Rol(rol, permisos);
        const usuarioActualizado = new Usuario(
            parseInt(id),
            nombre,
            email,
            usuarioActual.getPassword(),
            nuevoRol,
            usuarioActual.esActivo(),
            backupEmail
        );

        const resultado = await repoUsuario.actualizar(usuarioActualizado);

        if (resultado) {
            const servicio = ServicioAuditoria.obtenerInstancia();
            await servicio.registrarCambio("Usuario", parseInt(id), "ACTUALIZAR", req.usuario?.getId() || 0, 
                `${usuarioActual.getNombre()} (${rol})`, 
                `${nombre} (${rol})`);
            
            res.redirect("/Usuarios?success=Usuario actualizado exitosamente");
        } else {
            res.render("usuarios/editar", {
                titulo: "Editar Usuario",
                usuario: usuarioActual,
                roles,
                error: "Error al actualizar el usuario"
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Error interno del servidor");
    }
};

/* ===========================
   ELIMINAR USUARIO
=========================== */
export const eliminarUsuario = async (req: any, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const usuarioAEliminarse = await repoUsuario.buscarPorId(parseInt(id), true);

        if (!usuarioAEliminarse) {
            res.status(404).json({ error: "Usuario no encontrado" });
            return;
        }

        if (!usuarioAEliminarse.esActivo()) {
            res.redirect("/Usuarios?error=El usuario ya estaba eliminado");
            return;
        }

        // Si el usuario autenticado es GERENTE y el usuario a eliminar es ADMIN, no se permite
        const usuarioAutenticado = req.usuario as Usuario;
        if (usuarioAutenticado?.getRol().nombre === "GERENTE" && usuarioAEliminarse.getRol().nombre === "ADMIN") {
            res.redirect("/Usuarios?error=Los gerentes no pueden eliminar usuarios administradores");
            return;
        }

        const resultado = await repoUsuario.eliminar(parseInt(id));

        if (resultado) {
            const servicio = ServicioAuditoria.obtenerInstancia();
            await servicio.registrarCambio("Usuario", parseInt(id), "ELIMINAR", req.usuario?.getId() || 0, 
                usuarioAEliminarse.getNombre(), 
                "ELIMINADO");
            
            res.redirect("/Usuarios?success=Usuario eliminado exitosamente");
        } else {
            res.status(500).json({ error: "Error al eliminar el usuario" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

/* ===========================
   RECUPERAR USUARIO
=========================== */
export const recuperarUsuario = async (req: any, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const usuario = await repoUsuario.buscarPorId(parseInt(id), true);

        if (!usuario) {
            res.redirect("/Usuarios?error=Usuario no encontrado");
            return;
        }

        if (usuario.esActivo()) {
            res.redirect("/Usuarios?error=El usuario ya está activo");
            return;
        }

        const resultado = await repoUsuario.recuperar(parseInt(id));

        if (resultado) {
            const servicio = ServicioAuditoria.obtenerInstancia();
            await servicio.registrarCambio(
                "Usuario",
                parseInt(id),
                "RECUPERAR",
                req.usuario?.getId() || 0,
                "INACTIVO",
                "ACTIVO"
            );

            res.redirect("/Usuarios?success=Usuario recuperado exitosamente");
            return;
        }

        res.redirect("/Usuarios?error=Error al recuperar el usuario");
    } catch (error) {
        console.error(error);
        res.redirect("/Usuarios?error=Error interno del servidor");
    }
};

/* ===========================
   ELIMINAR USUARIO DEFINITIVO
=========================== */
export const eliminarUsuarioDefinitivo = async (req: any, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const usuarioAEliminarse = await repoUsuario.buscarPorId(parseInt(id), true);

        if (!usuarioAEliminarse) {
            res.redirect("/Usuarios?error=Usuario no encontrado");
            return;
        }

        const usuarioAutenticado = req.usuario as Usuario;
        if (usuarioAutenticado?.getRol().nombre === "GERENTE" && usuarioAEliminarse.getRol().nombre === "ADMIN") {
            res.redirect("/Usuarios?error=Los gerentes no pueden eliminar usuarios administradores");
            return;
        }

        if (req.usuario?.getId() === usuarioAEliminarse.getId()) {
            res.redirect("/Usuarios?error=No puede eliminar su propio usuario");
            return;
        }

        const resultado = await repoUsuario.eliminarDefinitivo(parseInt(id));

        if (resultado) {
            const servicio = ServicioAuditoria.obtenerInstancia();
            await servicio.registrarCambio(
                "Usuario",
                parseInt(id),
                "ELIMINAR_DEFINITIVO",
                req.usuario?.getId() || 0,
                usuarioAEliminarse.getNombre(),
                "BORRADO_FISICO"
            );

            res.redirect("/Usuarios?success=Usuario eliminado definitivamente");
            return;
        }

        res.redirect("/Usuarios?error=No se pudo eliminar definitivamente el usuario");
    } catch (error) {
        console.error(error);
        res.redirect("/Usuarios?error=Error interno del servidor");
    }
};

/* ===========================
   RECUPERAR CONTRASEÑA
=========================== */
export const mostrarRecuperarPassword = async (req: any, res: Response): Promise<void> => {
    const emailQuery = typeof req.query?.email === "string"
        ? req.query.email.trim().toLowerCase()
        : "";
    const emailSesion = typeof req.session?.lastLoginEmail === "string"
        ? req.session.lastLoginEmail.trim().toLowerCase()
        : "";
    const emailObjetivo = emailQuery || emailSesion;

    if (!emailObjetivo) {
        return res.redirect("/login?error=Ingrese su email en login y luego presione 'Recuperar contraseña'.");
    }

    req.session.lastLoginEmail = emailObjetivo;

    try {
        const resultado = await solicitarRecuperacionPorEmailPrincipal(emailObjetivo);

        return res.render("seguridad/recuperar-password", {
            error: resultado.ok ? null : resultado.mensaje,
            success: resultado.ok ? resultado.mensaje : null,
            emailPrefill: emailObjetivo,
            resetUrl: resultado.resetUrl,
            mostrarFormulario: false
        });
    } catch (error) {
        console.error("Error al solicitar recuperación (GET):", error);
        return res.render("seguridad/recuperar-password", {
            error: "No se pudo procesar la solicitud. Intente de nuevo.",
            success: null,
            emailPrefill: emailObjetivo,
            resetUrl: null,
            mostrarFormulario: false
        });
    }
};

export const solicitarRecuperarPassword = async (req: any, res: Response): Promise<void> => {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";

    try {
        const resultado = await solicitarRecuperacionPorEmailPrincipal(email);
        return res.render("seguridad/recuperar-password", {
            error: resultado.ok ? null : resultado.mensaje,
            success: resultado.ok ? resultado.mensaje : null,
            emailPrefill: email,
            resetUrl: resultado.resetUrl,
            mostrarFormulario: true
        });
    } catch (error) {
        console.error("Error al solicitar recuperación:", error);
        return res.render("seguridad/recuperar-password", {
            error: "No se pudo procesar la solicitud. Intente de nuevo.",
            success: null,
            emailPrefill: email,
            resetUrl: null,
            mostrarFormulario: true
        });
    }
};

export const mostrarResetPassword = async (req: any, res: Response): Promise<void> => {
    const token = typeof req.query.token === "string" ? req.query.token : "";

    if (!token) {
        return res.render("seguridad/reset-password", {
            token: "",
            error: "Token inválido",
            success: null
        });
    }

    try {
        await asegurarTablaRecuperacion();
        const tokenValido = await buscarTokenValido(token);

        if (!tokenValido) {
            return res.render("seguridad/reset-password", {
                token: "",
                error: "El enlace expiró o no es válido",
                success: null
            });
        }

        return res.render("seguridad/reset-password", {
            token,
            error: null,
            success: null
        });
    } catch (error) {
        console.error("Error al mostrar reset password:", error);
        return res.render("seguridad/reset-password", {
            token: "",
            error: "No se pudo validar el enlace",
            success: null
        });
    }
};

export const procesarResetPassword = async (req: any, res: Response): Promise<void> => {
    const token = typeof req.body.token === "string" ? req.body.token : "";
    const nuevaPassword = typeof req.body.password === "string" ? req.body.password : "";
    const confirmarPassword = typeof req.body.confirmPassword === "string" ? req.body.confirmPassword : "";

    if (!token) {
        return res.render("seguridad/reset-password", {
            token: "",
            error: "Token inválido",
            success: null
        });
    }

    if (!nuevaPassword || !confirmarPassword) {
        return res.render("seguridad/reset-password", {
            token,
            error: "Debe completar ambos campos",
            success: null
        });
    }

    if (nuevaPassword.length < 4) {
        return res.render("seguridad/reset-password", {
            token,
            error: "La contraseña debe tener al menos 4 caracteres",
            success: null
        });
    }

    if (nuevaPassword !== confirmarPassword) {
        return res.render("seguridad/reset-password", {
            token,
            error: "Las contraseñas no coinciden",
            success: null
        });
    }

    try {
        await asegurarTablaRecuperacion();
        const tokenValido = await buscarTokenValido(token);

        if (!tokenValido) {
            return res.render("seguridad/reset-password", {
                token: "",
                error: "El enlace expiró o no es válido",
                success: null
            });
        }

        const pool = getPool();
        const columnaPassword = await obtenerColumnaPassword();

        const passwordHasheada = await hashPassword(nuevaPassword);

        await pool.query(
            `UPDATE usuarios SET ${columnaPassword} = ? WHERE id = ?`,
            [passwordHasheada, tokenValido.usuario_id]
        );

        await pool.query(
            `UPDATE password_resets SET used_at = NOW() WHERE id = ?`,
            [tokenValido.id]
        );

        await pool.query(
            `UPDATE password_resets SET used_at = NOW() WHERE usuario_id = ? AND used_at IS NULL`,
            [tokenValido.usuario_id]
        );

        return res.redirect("/login?success=Contraseña restablecida correctamente");
    } catch (error) {
        console.error("Error al restablecer password:", error);
        return res.render("seguridad/reset-password", {
            token,
            error: "No se pudo restablecer la contraseña",
            success: null
        });
    }
};