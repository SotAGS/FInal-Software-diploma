import { Request, Response } from "express";
import { RepositorioProducto } from "../Modelo/Repositorios/RepositorioProducto";
import { RepositorioVenta } from "../Modelo/Repositorios/RepositorioVenta";
import { ServicioAuditoria } from "../Modelo/Servicios/ServicioAuditoria";

const CLAVE_CARRITO_VENTAS = "ventasCart";
const repoProducto = RepositorioProducto.obtenerInstancia();
const repoVenta = RepositorioVenta.obtenerInstancia();
const servicioAuditoria = ServicioAuditoria.obtenerInstancia();

const REGEX_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

const esFechaIsoValida = (valor?: string): boolean => {
    if (!valor || !REGEX_FECHA_ISO.test(valor)) {
        return false;
    }

    const fecha = new Date(`${valor}T00:00:00`);
    return !Number.isNaN(fecha.getTime());
};

const construirFiltrosFecha = (req: Request): {
    filtros: { fecha?: string; desde?: string; hasta?: string };
    error: string | null;
    modo: "ninguno" | "dia" | "rango";
} => {
    const fecha = typeof req.query.fecha === "string" ? req.query.fecha.trim() : "";
    const desde = typeof req.query.desde === "string" ? req.query.desde.trim() : "";
    const hasta = typeof req.query.hasta === "string" ? req.query.hasta.trim() : "";

    const hayFiltroDia = Boolean(fecha);
    const hayFiltroRango = Boolean(desde || hasta);

    if (hayFiltroDia && hayFiltroRango) {
        return {
            filtros: {},
            error: "Elegi un unico tipo de filtro: por dia o por rango de fechas.",
            modo: "ninguno"
        };
    }

    if (hayFiltroDia) {
        if (!esFechaIsoValida(fecha)) {
            return {
                filtros: {},
                error: "La fecha del filtro por dia no es valida.",
                modo: "ninguno"
            };
        }

        return {
            filtros: { fecha },
            error: null,
            modo: "dia"
        };
    }

    if (hayFiltroRango) {
        if (!desde || !hasta) {
            return {
                filtros: {},
                error: "Para filtrar por rango, completa ambas fechas: desde y hasta.",
                modo: "ninguno"
            };
        }

        if (!esFechaIsoValida(desde) || !esFechaIsoValida(hasta)) {
            return {
                filtros: {},
                error: "Las fechas del rango no son validas.",
                modo: "ninguno"
            };
        }

        if (desde > hasta) {
            return {
                filtros: {},
                error: "La fecha 'desde' no puede ser mayor que la fecha 'hasta'.",
                modo: "ninguno"
            };
        }

        return {
            filtros: { desde, hasta },
            error: null,
            modo: "rango"
        };
    }

    return { filtros: {}, error: null, modo: "ninguno" };
};

const obtenerCarrito = (req: any): { productoId: number; cantidad: number }[] => {
    if (!req.session) {
        req.session = {};
    }

    req.session[CLAVE_CARRITO_VENTAS] = req.session[CLAVE_CARRITO_VENTAS] || [];
    return req.session[CLAVE_CARRITO_VENTAS];
};

export const mostrarVentas = async (req: any, res: Response): Promise<void> => {
    const productos = await repoProducto.obtenerTodos();
    const filtroVentas = construirFiltrosFecha(req);
    const ventas = await repoVenta.obtenerTodos(filtroVentas.filtros);
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
            const precioUnitario = Number(producto.getPrecioVenta() || 0);
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
        filtrosVenta: {
            fecha: filtroVentas.filtros.fecha || "",
            desde: filtroVentas.filtros.desde || "",
            hasta: filtroVentas.filtros.hasta || "",
            modo: filtroVentas.modo
        },
        errorFiltroVentas: filtroVentas.error,
        ultimaVentaId: Number(req.session?.ultimaVentaId) || null,
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
        req.session.ultimaVentaId = venta.getId();
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

export const mostrarTicketVenta = async (req: any, res: Response): Promise<void> => {
    const ventaId = Number(req.params?.ventaId);

    if (!Number.isFinite(ventaId) || ventaId <= 0) {
        req.session.message = "El ID de la venta no es valido para generar ticket.";
        return res.redirect("/Ventas");
    }

    try {
        const detalleVenta = await repoVenta.obtenerDetallePorId(ventaId);

        if (!detalleVenta) {
            req.session.message = `No existe la venta #${ventaId}.`;
            return res.redirect("/Ventas");
        }

        res.render("ventas/ticket", {
            titulo: `Ticket venta #${ventaId}`,
            venta: detalleVenta.venta,
            itemsDetalle: detalleVenta.itemsDetalle,
            session: req.session
        });
    } catch (error) {
        console.error("Error al mostrar ticket de venta:", error);
        req.session.message = "No se pudo generar el ticket de pago.";
        res.redirect("/Ventas");
    }
};
