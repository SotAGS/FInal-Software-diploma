import { Response } from "express";
import { RepositorioRol } from "../Modelo/Repositorios/RepositorioRol";
import { ServicioAuditoria } from "../Modelo/Servicios/ServicioAuditoria";

const repoRol = new RepositorioRol();

const obtenerPermisosDesdeBody = (body: any): string[] => {
    const permisos = body.permisos;

    if (!permisos) {
        return [];
    }

    if (Array.isArray(permisos)) {
        return permisos;
    }

    return [permisos];
};

export const listarRoles = async (req: any, res: Response): Promise<void> => {
    try {
        const roles = await repoRol.obtenerTodos();
        res.render("roles/index", {
            titulo: "Menú de Roles",
            roles,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (error) {
        console.error(error);
        res.status(500).render("roles/index", {
            titulo: "Menú de Roles",
            roles: [],
            error: "Error al cargar roles",
            success: null
        });
    }
};

export const mostrarFormularioCrearRol = async (req: any, res: Response): Promise<void> => {
    res.render("roles/crear", {
        titulo: "Crear Rol",
        catalogoPermisos: repoRol.obtenerCatalogoPermisos(),
        error: null,
        rol: null,
        permisosSeleccionados: []
    });
};

export const crearRol = async (req: any, res: Response): Promise<void> => {
    try {
        const nombre = String(req.body.nombre || "").trim().toUpperCase();
        const descripcion = String(req.body.descripcion || "").trim();
        const permisos = obtenerPermisosDesdeBody(req.body);

        if (!nombre) {
            return res.render("roles/crear", {
                titulo: "Crear Rol",
                catalogoPermisos: repoRol.obtenerCatalogoPermisos(),
                error: "El nombre del rol es obligatorio",
                rol: { nombre, descripcion },
                permisosSeleccionados: permisos
            });
        }

        if (await repoRol.existeNombre(nombre)) {
            return res.render("roles/crear", {
                titulo: "Crear Rol",
                catalogoPermisos: repoRol.obtenerCatalogoPermisos(),
                error: "Ya existe un rol con ese nombre",
                rol: { nombre, descripcion },
                permisosSeleccionados: permisos
            });
        }

        const creado = await repoRol.crear(nombre, descripcion, permisos);
        if (!creado) {
            return res.render("roles/crear", {
                titulo: "Crear Rol",
                catalogoPermisos: repoRol.obtenerCatalogoPermisos(),
                error: "No se pudo crear el rol",
                rol: { nombre, descripcion },
                permisosSeleccionados: permisos
            });
        }

        const servicio = ServicioAuditoria.obtenerInstancia();
        await servicio.registrarCambio("Rol", 0, "CREAR", req.usuario?.getId() || 0, null, `${nombre} (${permisos.join(",")})`);

        res.redirect("/Roles?success=Rol creado exitosamente");
    } catch (error) {
        console.error(error);
        res.status(500).render("roles/crear", {
            titulo: "Crear Rol",
            catalogoPermisos: repoRol.obtenerCatalogoPermisos(),
            error: "Error interno al crear el rol",
            rol: null,
            permisosSeleccionados: []
        });
    }
};

export const mostrarFormularioEditarRol = async (req: any, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
        const rol = await repoRol.obtenerPorId(id);

        if (!rol) {
            return res.redirect("/Roles?error=Rol no encontrado");
        }

        if (rol.nombre === "ADMIN") {
            return res.redirect("/Roles?error=El rol ADMIN está protegido y no se puede editar");
        }

        res.render("roles/editar", {
            titulo: "Editar Rol",
            rol,
            catalogoPermisos: repoRol.obtenerCatalogoPermisos(),
            permisosSeleccionados: rol.permisos,
            error: null
        });
    } catch (error) {
        console.error(error);
        res.redirect("/Roles?error=Error al cargar rol");
    }
};

export const actualizarRol = async (req: any, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
        const rolActual = await repoRol.obtenerPorId(id);

        if (!rolActual) {
            return res.redirect("/Roles?error=Rol no encontrado");
        }

        if (rolActual.nombre === "ADMIN") {
            return res.redirect("/Roles?error=El rol ADMIN está protegido y no se puede editar");
        }

        const nombre = String(req.body.nombre || "").trim().toUpperCase();
        const descripcion = String(req.body.descripcion || "").trim();
        const permisos = obtenerPermisosDesdeBody(req.body);

        if (!nombre) {
            return res.render("roles/editar", {
                titulo: "Editar Rol",
                rol: { ...rolActual, nombre, descripcion },
                catalogoPermisos: repoRol.obtenerCatalogoPermisos(),
                permisosSeleccionados: permisos,
                error: "El nombre del rol es obligatorio"
            });
        }

        if (await repoRol.existeNombre(nombre, id)) {
            return res.render("roles/editar", {
                titulo: "Editar Rol",
                rol: { ...rolActual, nombre, descripcion },
                catalogoPermisos: repoRol.obtenerCatalogoPermisos(),
                permisosSeleccionados: permisos,
                error: "Ya existe otro rol con ese nombre"
            });
        }

        const actualizado = await repoRol.actualizar(id, nombre, descripcion, permisos);
        if (!actualizado) {
            return res.render("roles/editar", {
                titulo: "Editar Rol",
                rol: { ...rolActual, nombre, descripcion },
                catalogoPermisos: repoRol.obtenerCatalogoPermisos(),
                permisosSeleccionados: permisos,
                error: "No se pudo actualizar el rol"
            });
        }

        const servicio = ServicioAuditoria.obtenerInstancia();
        await servicio.registrarCambio("Rol", id, "ACTUALIZAR", req.usuario?.getId() || 0, rolActual.nombre, `${nombre} (${permisos.join(",")})`);

        res.redirect("/Roles?success=Rol actualizado exitosamente");
    } catch (error) {
        console.error(error);
        res.redirect("/Roles?error=Error al actualizar el rol");
    }
};

export const eliminarRol = async (req: any, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
        const rol = await repoRol.obtenerPorId(id);

        if (!rol) {
            return res.redirect("/Roles?error=Rol no encontrado");
        }

        if (rol.nombre === "ADMIN") {
            return res.redirect("/Roles?error=No se puede eliminar el rol ADMIN");
        }

        const resultado = await repoRol.eliminar(id);
        if (!resultado.ok) {
            return res.redirect(`/Roles?error=${encodeURIComponent(resultado.motivo || "No se pudo eliminar el rol")}`);
        }

        const servicio = ServicioAuditoria.obtenerInstancia();
        await servicio.registrarCambio("Rol", id, "ELIMINAR", req.usuario?.getId() || 0, rol.nombre, "ELIMINADO");

        res.redirect("/Roles?success=Rol eliminado exitosamente");
    } catch (error) {
        console.error(error);
        res.redirect("/Roles?error=Error al eliminar el rol");
    }
};
