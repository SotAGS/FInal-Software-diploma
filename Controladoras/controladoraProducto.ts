import { Response } from "express";
import { RepositorioProducto } from "../Modelo/Repositorios/RepositorioProducto";
import { RepositorioProveedor } from "../Modelo/Repositorios/RepositorioProveedor";

const repoProducto = RepositorioProducto.obtenerInstancia();
const repoProveedor = RepositorioProveedor.obtenerInstancia();

/* ===========================
   LISTADO
=========================== */
export const listarProductos = async (req: any, res: Response): Promise<void> => {
    const productos = await repoProducto.obtenerTodos(true);
    const productosActivos = productos.filter(p => p.esActivo());
    const productosEliminados = productos.filter(p => !p.esActivo());
    const proveedores = await repoProveedor.obtenerTodos(true);
    const proveedoresMap: Record<number, string> = {};
    proveedores.forEach(p => {
        proveedoresMap[p.getId()] = p.getNombre();
    });

    res.render("Inventario/listado", {
        productosActivos,
        productosEliminados,
        proveedoresMap,
        success: typeof req.query.success === "string" ? req.query.success : null,
        error: typeof req.query.error === "string" ? req.query.error : null
    });
};

/* ===========================
   VISTA CREAR
=========================== */
export const mostrarCrearProducto = async (req: any, res: Response): Promise<void> => {
    const proveedores = await repoProveedor.obtenerTodos();

    res.render("Inventario/crear", {
        proveedores,
        error: null,
        nombre: "",
        precio: "",
        stock: "",
        proveedorId: ""
    });
};

/* ===========================
   VISTA EDITAR
=========================== */
export const mostrarEditarProducto = async (req: any, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const producto = await repoProducto.buscarPorId(id);

    if (!producto) {
        res.status(404).send("Producto no encontrado");
        return;
    }

    res.render("Inventario/editar", { producto });
};

/* ===========================
   EDITAR
=========================== */
export const editarProducto = async (req: any, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const { precio, stock } = req.body;

    await repoProducto.modificar(id, Number(precio), Number(stock));

    res.redirect("/inventario/listado");
};

/* ===========================
   CREAR
=========================== */
export const crearProducto = async (req: any, res: Response): Promise<void> => {
    const { nombre, precio, stock, proveedorId } = req.body;
    const proveedorIdNumero = Number(proveedorId);

    if (!nombre || !precio || !stock || !Number.isFinite(proveedorIdNumero) || proveedorIdNumero <= 0) {
        const proveedores = await repoProveedor.obtenerTodos();
        return res.status(400).render("Inventario/crear", {
            proveedores,
            error: "Debe completar nombre, precio, stock y proveedor.",
            nombre: nombre || "",
            precio: precio || "",
            stock: stock || "",
            proveedorId: proveedorId || ""
        });
    }

    await repoProducto.crear(
        nombre,
        Number(precio),
        Number(stock),
        proveedorIdNumero
    );

    res.redirect("/inventario/listado?success=Producto creado correctamente");
};

/* ===========================
   ELIMINAR
=========================== */
export const eliminarProducto = async (req: any, res: Response): Promise<void> => {
    const id = Number(req.params.id);

    const producto = await repoProducto.buscarPorId(id, true);
    if (!producto) {
        res.status(404).send("Producto no encontrado");
        return;
    }

    if (!producto.esActivo()) {
        res.redirect("/inventario/listado");
        return;
    }

    await repoProducto.eliminar(id);

    res.redirect("/inventario/listado?success=Producto eliminado (recuperable)");
};

/* ===========================
   RECUPERAR
=========================== */
export const recuperarProducto = async (req: any, res: Response): Promise<void> => {
    const id = Number(req.params.id);

    const producto = await repoProducto.buscarPorId(id, true);
    if (!producto) {
        res.status(404).send("Producto no encontrado");
        return;
    }

    if (producto.esActivo()) {
        res.redirect("/inventario/listado");
        return;
    }

    await repoProducto.recuperar(id);
    res.redirect("/inventario/listado?success=Producto recuperado");
};

/* ===========================
   ELIMINAR DEFINITIVO
=========================== */
export const eliminarProductoDefinitivo = async (req: any, res: Response): Promise<void> => {
    const id = Number(req.params.id);

    const producto = await repoProducto.buscarPorId(id, true);
    if (!producto) {
        res.redirect("/inventario/listado?error=Producto no encontrado");
        return;
    }

    try {
        const eliminado = await repoProducto.eliminarDefinitivo(id);
        if (!eliminado) {
            res.redirect("/inventario/listado?error=No se pudo eliminar definitivamente");
            return;
        }

        res.redirect("/inventario/listado?success=Producto eliminado definitivamente");
    } catch (error) {
        res.redirect("/inventario/listado?error=No se puede eliminar definitivamente porque tiene registros asociados");
    }
};