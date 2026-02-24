import { Response } from "express";
import { RepositorioProveedor } from "../Modelo/Repositorios/RepositorioProveedor";

const repoProveedor = RepositorioProveedor.obtenerInstancia();

/* ===========================
   LISTAR PROVEEDORES
=========================== */
export const listarProveedores = (req: any, res: Response): void => {
    try {
        const proveedores = repoProveedor.obtenerTodos();
        const success = typeof req.query.success === "string" ? req.query.success : null;
        const error = typeof req.query.error === "string" ? req.query.error : null;

        res.render("proveedores/index", {
            proveedores,
            success,
            error,
            titulo: "Gestion de Proveedores"
        });
    } catch (error) {
        console.error(error);
        res.status(500).render("proveedores/index", {
            proveedores: [],
            success: null,
            error: "Error al cargar proveedores",
            titulo: "Gestion de Proveedores"
        });
    }
};

/* ===========================
   MOSTRAR FORMULARIO CREAR
=========================== */
export const mostrarFormularioCrearProveedor = (req: any, res: Response): void => {
    res.render("proveedores/crear", {
        titulo: "Crear Proveedor",
        error: null,
        nombre: "",
        contacto: ""
    });
};

/* ===========================
   CREAR PROVEEDOR
=========================== */
export const crearProveedor = (req: any, res: Response): void => {
    const { nombre, contacto } = req.body;

    if (!nombre || !contacto) {
        return res.status(400).render("proveedores/crear", {
            titulo: "Crear Proveedor",
            error: "Debe completar todos los campos",
            nombre: nombre || "",
            contacto: contacto || ""
        });
    }

    repoProveedor.crear(nombre, contacto);
    res.redirect("/Proveedores?success=Proveedor creado correctamente");
};

/* ===========================
   MOSTRAR FORMULARIO EDITAR
=========================== */
export const mostrarFormularioEditarProveedor = (req: any, res: Response): void => {
    const id = Number(req.params.id);
    const proveedor = repoProveedor.buscarPorId(id);

    if (!proveedor) {
        return res.redirect("/Proveedores?error=Proveedor no encontrado");
    }

    res.render("proveedores/editar", {
        titulo: "Editar Proveedor",
        error: null,
        proveedor
    });
};

/* ===========================
   ACTUALIZAR PROVEEDOR
=========================== */
export const actualizarProveedor = (req: any, res: Response): void => {
    const id = Number(req.params.id);
    const { nombre, contacto } = req.body;

    if (!nombre || !contacto) {
        return res.status(400).render("proveedores/editar", {
            titulo: "Editar Proveedor",
            error: "Debe completar todos los campos",
            proveedor: repoProveedor.buscarPorId(id)
        });
    }

    const actualizado = repoProveedor.actualizar(id, nombre, contacto);
    if (!actualizado) {
        return res.redirect("/Proveedores?error=Proveedor no encontrado");
    }

    res.redirect("/Proveedores?success=Proveedor actualizado correctamente");
};

/* ===========================
   ELIMINAR PROVEEDOR
=========================== */
export const eliminarProveedor = (req: any, res: Response): void => {
    const id = Number(req.params.id);
    const eliminado = repoProveedor.eliminar(id);

    if (!eliminado) {
        return res.redirect("/Proveedores?error=Proveedor no encontrado");
    }

    res.redirect("/Proveedores?success=Proveedor eliminado correctamente");
};
