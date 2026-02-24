import { Response } from "express";
import { RepositorioUsuario } from "../Modelo/Repositorios/RepositorioUsuario";
import { Usuario } from "../Modelo/Entidades/Usuario";
import { Rol } from "../Modelo/Entidades/Rol";
import { PermisoCompuesto } from "../Modelo/Seguridad/PermisoCompuesto";
import { ServicioAuditoria } from "../Modelo/Servicios/ServicioAuditoria";

const repoUsuario = new RepositorioUsuario();

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
        error: null
    });
};

/* ===========================
   PROCESAR LOGIN
=========================== */
export const login = async (req: any, res: Response): Promise<void> => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.render("seguridad/login", {
            error: "Debe completar todos los campos"
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

    if (!usuario || usuario.getPassword() !== password) {
        const servicio = ServicioAuditoria.obtenerInstancia();
        await servicio.registrarLoginFallido(email, "Credenciales inválidas");
        
        return res.render("seguridad/login", {
            error: "Credenciales incorrectas"
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
        const usuarios = await repoUsuario.obtenerTodos();
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
        error: null
    });
};

/* ===========================
   CREAR USUARIO
=========================== */
export const crearUsuario = async (req: any, res: Response): Promise<void> => {
    try {
        const { nombre, email, password, rol } = req.body;
        const roles = await obtenerRolesDisponibles();

        if (!nombre || !email || !password || !rol) {
            return res.render("usuarios/crear", {
                titulo: "Crear Usuario",
                roles,
                error: "Todos los campos son obligatorios"
            });
        }

        // Si el usuario actual es GERENTE y quiere crear un ADMIN, no se permite
        const usuarioActual = req.usuario as Usuario;
        if (usuarioActual?.getRol().nombre === "GERENTE" && rol === "ADMIN") {
            return res.render("usuarios/crear", {
                titulo: "Crear Usuario",
                roles,
                error: "Los gerentes no pueden crear usuarios administradores"
            });
        }

        // Verificar que el email no exista
        const usuarioExistente = await repoUsuario.buscarPorEmail(email);
        if (usuarioExistente) {
            return res.render("usuarios/crear", {
                titulo: "Crear Usuario",
                roles,
                error: "El email ya está registrado"
            });
        }

        // Crear permiso compuesto simplificado para el rol
        const permisos = new PermisoCompuesto(rol, `Permisos de ${rol}`);
        const nuevoRol = new Rol(rol, permisos);

        const nuevoUsuario = new Usuario(0, nombre, email, password, nuevoRol);
        await repoUsuario.crear(nuevoUsuario);

        const servicio = ServicioAuditoria.obtenerInstancia();
        await servicio.registrarCambio("Usuario", 0, "CREAR", req.usuario?.getId() || 0, null, `${nombre} (${email})`);
        
        res.redirect("/Usuarios?success=Usuario creado exitosamente");
    } catch (error) {
        console.error("ERROR CREAR USUARIO:", error);
        res.status(500).render("usuarios/crear", {
            titulo: "Crear Usuario",
            roles: await obtenerRolesDisponibles(),
            error: `Error: ${(error as any).message}`
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
        const { nombre, email, rol } = req.body;
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
        const usuarioActualizado = new Usuario(parseInt(id), nombre, email, usuarioActual.getPassword(), nuevoRol);

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
        const usuarioAEliminarse = await repoUsuario.buscarPorId(parseInt(id));

        if (!usuarioAEliminarse) {
            res.status(404).json({ error: "Usuario no encontrado" });
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