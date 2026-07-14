import { Request, Response } from "express";
import { RepositorioProducto } from "../Modelo/Repositorios/RepositorioProducto";
import { RepositorioVenta } from "../Modelo/Repositorios/RepositorioVenta";
import { ServicioAuditoria } from "../Modelo/Servicios/ServicioAuditoria";

const CLAVE_CARRITO_VENTAS = "ventasCart";
const repoProducto = RepositorioProducto.obtenerInstancia();
const repoVenta = RepositorioVenta.obtenerInstancia();
const servicioAuditoria = ServicioAuditoria.obtenerInstancia();

const obtenerCarrito = (req: any): { productoId: number; cantidad: number }[] => {
    if (!req.session) {
        req.session = {};
    }

    req.session[CLAVE_CARRITO_VENTAS] = req.session[CLAVE_CARRITO_VENTAS] || [];
    return req.session[CLAVE_CARRITO_VENTAS];
};

export const mostrarVentas = async (req: any, res: Response): Promise<void> => {
    const productos = await repoProducto.obtenerTodos();
    const ventas = await repoVenta.obtenerTodos();
    const cart = obtenerCarrito(req);

    const productosMap: Record<number, any> = {};
    productos.forEach(p => {
        productosMap[(p as any).getId()] = p;
    });

    const cartDetalle = cart
        .map(item => {
            const producto = productosMap[item.productoId];
            if (!producto) {
                return null;
            }

            const cantidad = Number(item.cantidad || 0);
            const precioUnitario = Number(producto.getPrecio() || 0);
            return {
                productoId: item.productoId,
                nombre: producto.getNombre(),
                cantidad,
                precioUnitario,
                subtotal: cantidad * precioUnitario
            };
        })
        .filter(Boolean) as Array<{ productoId: number; nombre: string; cantidad: number; precioUnitario: number; subtotal: number }>;

    const totalCarrito = cartDetalle.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);

    res.render("ventas/index", {
        titulo: "Ventas",
        productos,
        productosMap,
        ventas,
        cart,
        cartDetalle,
        totalCarrito,
        session: req.session
    });
};

export const agregarAlCarritoVenta = async (req: any, res: Response): Promise<void> => {
    const productoId = Number(req.body?.productoId);
    const cantidad = Number(req.body?.cantidad);

    if (!Number.isFinite(productoId) || productoId <= 0 || !Number.isFinite(cantidad) || cantidad <= 0) {
        req.session.message = "Debe seleccionar un producto valido y cantidad mayor a 0.";
        return res.redirect("/Ventas");
    }

    const producto = await repoProducto.buscarPorId(productoId);
    if (!producto) {
        req.session.message = "El producto seleccionado no existe.";
        return res.redirect("/Ventas");
    }

    const carrito = obtenerCarrito(req);
    const existente = carrito.find((item: any) => item.productoId === productoId);
    const cantidadNueva = (existente ? Number(existente.cantidad || 0) : 0) + cantidad;

    if (cantidadNueva > producto.getStock()) {
        req.session.message = `Stock insuficiente para ${producto.getNombre()}. Stock actual: ${producto.getStock()}.`;
        return res.redirect("/Ventas");
    }

    if (existente) {
        existente.cantidad = cantidadNueva;
    } else {
        carrito.push({ productoId, cantidad });
    }

    req.session.message = `${producto.getNombre()} agregado al carrito.`;
    req.session.save((err: any) => {
        if (err) {
            console.error("Error guardando sesion de ventas:", err);
        }
        res.redirect("/Ventas");
    });
};

export const quitarDelCarritoVenta = (req: any, res: Response): void => {
    const productoId = Number(req.body?.productoId);
    req.session[CLAVE_CARRITO_VENTAS] = obtenerCarrito(req).filter((item: any) => Number(item.productoId) !== productoId);
    req.session.message = "Producto quitado del carrito.";

    req.session.save((err: any) => {
        if (err) {
            console.error("Error guardando sesion de ventas:", err);
        }
        res.redirect("/Ventas");
    });
};

export const confirmarVenta = async (req: any, res: Response): Promise<void> => {
    const carrito = obtenerCarrito(req);

    if (!carrito.length) {
        req.session.message = "No se puede confirmar una venta con carrito vacio.";
        return res.redirect("/Ventas");
    }

    const items = carrito
        .map((item: any) => ({
            productoId: Number(item.productoId),
            cantidad: Number(item.cantidad)
        }))
        .filter((item: any) => Number.isFinite(item.productoId) && item.productoId > 0 && Number.isFinite(item.cantidad) && item.cantidad > 0);

    if (!items.length) {
        req.session.message = "El carrito no tiene items validos.";
        return res.redirect("/Ventas");
    }

    const clienteNombre = "Consumidor final";

    const usuarioSesionId = Number(req.session?.usuarioId);
    const usuarioVendedorId = Number.isFinite(usuarioSesionId) && usuarioSesionId > 0
        ? usuarioSesionId
        : undefined;

    try {
        const venta = await repoVenta.crear(clienteNombre, items, usuarioVendedorId);

        await servicioAuditoria.registrarCambio(
            "ventas",
            venta.getId(),
            "CREAR_VENTA",
            usuarioVendedorId || 0,
            null,
            {
                clienteNombre: venta.getClienteNombre(),
                total: venta.getTotal(),
                items: venta.getItems()
            }
        );

        req.session[CLAVE_CARRITO_VENTAS] = [];
        req.session.message = `Venta #${venta.getId()} registrada por $${Number(venta.getTotal()).toFixed(2)}.`;
        req.session.save((err: any) => {
            if (err) {
                console.error("Error guardando sesion de ventas:", err);
            }
            res.redirect("/Ventas");
        });
    } catch (error) {
        console.error("Error al confirmar venta:", error);
        req.session.message = (error as any)?.message || "No se pudo confirmar la venta.";
        res.redirect("/Ventas");
    }
};
