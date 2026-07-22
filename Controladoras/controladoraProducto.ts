import { Response } from "express";
import { RepositorioProducto } from "../Modelo/Repositorios/RepositorioProducto";
import { RepositorioProveedor } from "../Modelo/Repositorios/RepositorioProveedor";
import { ServicioAuditoria } from "../Modelo/Servicios/ServicioAuditoria";

const repoProducto = RepositorioProducto.obtenerInstancia();
const repoProveedor = RepositorioProveedor.obtenerInstancia();
const servicioAuditoria = ServicioAuditoria.obtenerInstancia();

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
        precioCompra: "",
        precioVenta: "",
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
    const precioCompraRaw = req.body?.precioCompra ?? req.body?.precio_compra ?? req.body?.precio;
    const precioVentaRaw = req.body?.precioVenta ?? req.body?.precio_venta ?? req.body?.precio;
    const stockRaw = req.body?.stock;

    const parseNumeroEstricto = (valor: unknown): number => {
        if (typeof valor === "number") {
            return Number.isFinite(valor) ? valor : Number.NaN;
        }

        if (typeof valor !== "string") {
            return Number.NaN;
        }

        const normalizado = valor.trim().replace(",", ".");
        if (!normalizado) {
            return Number.NaN;
        }

        const numero = Number(normalizado);
        return Number.isFinite(numero) ? numero : Number.NaN;
    };

    const precioCompraNumero = parseNumeroEstricto(precioCompraRaw);
    const precioVentaNumero = parseNumeroEstricto(precioVentaRaw);
    const stockNumero = parseNumeroEstricto(stockRaw);

    if (
        !Number.isFinite(precioCompraNumero) || precioCompraNumero < 0 ||
        !Number.isFinite(precioVentaNumero) || precioVentaNumero < 0 ||
        !Number.isFinite(stockNumero) || stockNumero < 0
    ) {
        res.redirect("/inventario/listado?error=Valores invalidos para precio o stock. Verifique que no esten vacios.");
        return;
    }

    const productoActual = await repoProducto.buscarPorId(id, true);
    if (!productoActual) {
        res.redirect("/inventario/listado?error=Producto no encontrado");
        return;
    }

    await repoProducto.modificar(id, precioCompraNumero, precioVentaNumero, stockNumero);

    const usuarioId = Number(req.usuario?.getId?.() ?? req.session?.usuarioId ?? 0);
    await servicioAuditoria.registrarCambio(
        "Producto",
        id,
        "ACTUALIZAR",
        Number.isFinite(usuarioId) ? usuarioId : 0,
        {
            nombre: productoActual.getNombre(),
            precioCompra: productoActual.getPrecioCompra(),
            precioVenta: productoActual.getPrecioVenta(),
            stock: productoActual.getStock()
        },
        {
            nombre: productoActual.getNombre(),
            precioCompra: precioCompraNumero,
            precioVenta: precioVentaNumero,
            stock: stockNumero
        }
    );

    res.redirect("/inventario/listado");
};

/* ===========================
   CREAR
=========================== */
export const crearProducto = async (req: any, res: Response): Promise<void> => {
    const { nombre, precioCompra, precioVenta, stock, proveedorId } = req.body;
    const proveedorIdNumero = Number(proveedorId);
    const precioCompraNumero = Number(precioCompra);
    const precioVentaNumero = Number(precioVenta);
    const stockNumero = Number(stock);

    if (
        !nombre ||
        !Number.isFinite(precioCompraNumero) || precioCompraNumero < 0 ||
        !Number.isFinite(precioVentaNumero) || precioVentaNumero < 0 ||
        !Number.isFinite(stockNumero) || stockNumero < 0 ||
        !Number.isFinite(proveedorIdNumero) || proveedorIdNumero <= 0
    ) {
        const proveedores = await repoProveedor.obtenerTodos();
        return res.status(400).render("Inventario/crear", {
            proveedores,
            error: "Debe completar nombre, precio de compra, precio de venta, stock y proveedor.",
            nombre: nombre || "",
            precioCompra: precioCompra || "",
            precioVenta: precioVenta || "",
            stock: stock || "",
            proveedorId: proveedorId || ""
        });
    }

    const existeDuplicado = await repoProducto.existePorNombreYProveedor(nombre, proveedorIdNumero);
    if (existeDuplicado) {
        const proveedores = await repoProveedor.obtenerTodos();
        return res.status(400).render("Inventario/crear", {
            proveedores,
            error: "Ya existe un producto activo con ese nombre para ese proveedor.",
            nombre: nombre || "",
            precioCompra: precioCompra || "",
            precioVenta: precioVenta || "",
            stock: stock || "",
            proveedorId: proveedorId || ""
        });
    }

    try {
        await repoProducto.crear(
            nombre,
            precioCompraNumero,
            precioVentaNumero,
            stockNumero,
            proveedorIdNumero
        );

        res.redirect("/inventario/listado?success=Producto creado correctamente");
    } catch (error) {
        const proveedores = await repoProveedor.obtenerTodos();
        return res.status(400).render("Inventario/crear", {
            proveedores,
            error: (error as any)?.message || "No se pudo crear el producto.",
            nombre: nombre || "",
            precioCompra: precioCompra || "",
            precioVenta: precioVenta || "",
            stock: stock || "",
            proveedorId: proveedorId || ""
        });
    }
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