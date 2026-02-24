import { Response } from "express";
import { RepositorioProducto } from "../Modelo/Repositorios/RepositorioProducto";

const repoProducto = RepositorioProducto.obtenerInstancia();

/* ===========================
   LISTADO
=========================== */
export const listarProductos = async (req: any, res: Response): Promise<void> => {
    const productos = await repoProducto.obtenerTodos();
    res.render("Inventario/listado", {
        productos
    });
};

/* ===========================
   VISTA CREAR
=========================== */
export const mostrarCrearProducto = (req: any, res: Response): void => {

    res.render("Inventario/crear");
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
    const { nombre, precio, stock } = req.body;

    await repoProducto.crear(
        nombre,
        Number(precio),
        Number(stock)
    );

    res.redirect("/inventario/listado");
};

/* ===========================
   ELIMINAR
=========================== */
export const eliminarProducto = async (req: any, res: Response): Promise<void> => {
    const id = Number(req.params.id);

    await repoProducto.eliminar(id);

    res.redirect("/inventario/listado");
};