import { Request, Response } from "express";
import { RepositorioOrdenCompra } from "../Modelo/Repositorios/RepositorioOrdenCompra";
import { RepositorioProveedor } from "../Modelo/Repositorios/RepositorioProveedor";
import { RepositorioProducto } from "../Modelo/Repositorios/RepositorioProducto";

const repoOrden = RepositorioOrdenCompra.obtenerInstancia();
const repoProveedor = RepositorioProveedor.obtenerInstancia();
const repoProducto = RepositorioProducto.obtenerInstancia();

export const listarOrdenes = async (req: any, res: Response): Promise<void> => {
    const ordenes = await repoOrden.obtenerTodos();
    const activas = ordenes.filter(o => {
        const name = o.estado.constructor.name;
        return name !== 'EstadoCancelado' && name !== 'EstadoCerrado' && name !== 'EstadoCerradoConFaltante' && name !== 'EstadoCompleto';
    });
    const completas = ordenes.filter(o => o.estado.constructor.name === 'EstadoCompleto');
    const cerradasConFaltante = ordenes.filter(o => o.estado.constructor.name === 'EstadoCerradoConFaltante');
    const canceladas = ordenes.filter(o => o.estado.constructor.name === 'EstadoCancelado');
    const cerradas = ordenes.filter(o => o.estado.constructor.name === 'EstadoCerrado');

    // Cargar productos para que la vista pueda mostrar nombres sin llamadas async
    const productos = await repoProducto.obtenerTodos();
    const productosMap: Record<number, any> = {};
    productos.forEach(p => { productosMap[(p as any).getId()] = p; });

    // Cargar proveedores para que la vista no haga llamadas async
    const proveedores = await repoProveedor.obtenerTodos(true);
    const proveedoresMap: Record<number, any> = {};
    proveedores.forEach(pr => { proveedoresMap[(pr as any).getId()] = pr; });

    res.render("compras/index", { 
        ordenes: activas, 
        completas, 
        cerradasConFaltante, 
        canceladas, 
        cerradas, 
        session: req.session,
        productosMap,
        proveedoresMap
    });
};

export const mostrarCrearOrden = async (req: any, res: Response): Promise<void> => {
    // Mostrar productos para añadir al carrito y datos de proveedor por producto
    const productos = await repoProducto.obtenerTodos();
    const proveedores = await repoProveedor.obtenerTodos(true);
    const cart = req.session?.cart || [];
    const proveedoresMap: Record<number, any> = {};
    proveedores.forEach(pr => { proveedoresMap[(pr as any).getId()] = pr; });

    res.render("compras/crear", { productos, proveedoresMap, cart, error: null });
};

export const agregarAlCarrito = (req: any, res: Response): void => {
    const { productoId, cantidad } = req.body;
    const pid = Number(productoId);
    const qty = Number(cantidad) || 0;
    console.log("AGREGAR AL CARRITO - PID:", pid, "Qty:", qty, "Session antes:", req.session?.cart);
    if (!req.session) req.session = {};
    req.session.cart = req.session.cart || [];
    const existing = req.session.cart.find((i: any) => i.productoId === pid);
    if (existing) existing.cantidad += qty;
    else req.session.cart.push({ productoId: pid, cantidad: qty });
    console.log("AGREGAR AL CARRITO - Session después:", req.session.cart);
    
    // Guardar la sesión explícitamente
    req.session.save((err: any) => {
        if (err) {
            console.error("ERROR guardando sesión:", err);
        }
        res.redirect("/Compras/crear");
    });
};

export const quitarDelCarrito = (req: any, res: Response): void => {
    const productoId = Number(req.body.productoId);
    req.session.cart = (req.session.cart || []).filter((i: any) => i.productoId !== productoId);
    req.session.save((err: any) => {
        if (err) {
            console.error("ERROR guardando sesión:", err);
        }
        res.redirect("/Compras/crear");
    });
};

export const crearOrden = async (req: any, res: Response): Promise<void> => {
    const usuarioSesionId = Number(req.session?.usuarioId);
    const usuarioCreadorId = Number.isFinite(usuarioSesionId) && usuarioSesionId > 0 ? usuarioSesionId : undefined;
    const cart = req.session?.cart || [];
    const productos = await repoProducto.obtenerTodos();
    const proveedores = await repoProveedor.obtenerTodos(true);
    const proveedoresMap: Record<number, any> = {};
    proveedores.forEach(pr => { proveedoresMap[(pr as any).getId()] = pr; });

    console.log("CREAR ORDEN - Cart:", cart);
    if (!cart.length) {
        console.log("CREAR ORDEN - Carrito vacío");
        return res.render("compras/crear", { productos, proveedoresMap, cart, error: "El carrito está vacío" });
    }

    const items = cart
        .map((i: any) => ({ productoId: Number(i.productoId), cantidad: Number(i.cantidad) }))
        .filter((i: { productoId: number; cantidad: number }) => Number.isFinite(i.productoId) && i.productoId > 0 && Number.isFinite(i.cantidad) && i.cantidad > 0);

    if (!items.length) {
        return res.render("compras/crear", {
            productos,
            proveedoresMap,
            cart,
            error: "El carrito no tiene items válidos"
        });
    }

    const productosDelCarrito = await Promise.all(items.map((i: { productoId: number }) => repoProducto.buscarPorId(i.productoId, true)));
    const hayProductoNoAsociado = productosDelCarrito.some(p => !p || !p.getProveedorId());
    if (hayProductoNoAsociado) {
        return res.render("compras/crear", {
            productos,
            proveedoresMap,
            cart,
            error: "Hay productos del carrito sin marca/proveedor asignado"
        });
    }

    const itemsPorProveedor = new Map<number, { productoId: number; cantidad: number }[]>();
    for (let index = 0; index < items.length; index++) {
        const producto = productosDelCarrito[index]!;
        const proveedorId = producto.getProveedorId()!;
        const agrupados = itemsPorProveedor.get(proveedorId) || [];
        agrupados.push(items[index]);
        itemsPorProveedor.set(proveedorId, agrupados);
    }

    const ordenesCreadas: number[] = [];
    const titulosOrdenesCreadas: string[] = [];
    for (const [proveedorId, itemsProveedor] of itemsPorProveedor.entries()) {
        const orden = await repoOrden.crear(itemsProveedor, proveedorId, usuarioCreadorId);
        ordenesCreadas.push(orden.id);
        const proveedor = proveedoresMap[proveedorId];
        const nombreProveedor = proveedor ? proveedor.getNombre() : `Proveedor #${proveedorId}`;
        titulosOrdenesCreadas.push(`Pedido a ${nombreProveedor} (ID: ${orden.id})`);
    }

    req.session.cart = [];
    const cantidadOrdenes = ordenesCreadas.length;
    req.session.message = cantidadOrdenes === 1
        ? `Se creó 1 orden de compra: ${titulosOrdenesCreadas[0]}.`
        : `Se crearon ${cantidadOrdenes} órdenes de compra: ${titulosOrdenesCreadas.join(" | ")}.`;
    console.log("CREAR ORDEN - Órdenes creadas:", ordenesCreadas, "redirigiendo");
    req.session.save((err: any) => {
        if (err) {
            console.error("ERROR guardando sesión:", err);
        }
        res.redirect("/Compras");
    });
};

export const recibirProducto = async (req: any, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const orden = await repoOrden.buscarPorId(id);
    if (!orden) { res.status(404).send("Orden no encontrada"); return; }
    const userId = req.session?.usuarioId || 0;

    const estado = orden.estado.constructor.name;
    // Sólo permitir recibir si está Pendiente
    if (estado !== 'EstadoPendiente') {
        req.session.message = 'La orden ya fue recibida. Debe cerrarse completa o con faltante.';
        return res.redirect('/Compras');
    }

    try {
        // Solo permitir recibir si aún no se ha recibido previamente (para evitar duplicados)
        const yaRecibio = orden.itemsRecibidos.length > 0;
        if (yaRecibio) {
            req.session.message = 'Esta orden ya fue recibida. Para registrar faltantes, usa "Cerrar con faltante".';
            return res.redirect('/Compras');
        }

        // Registrar todos los items como recibidos (con cantidad solicitada, sin faltante)
        orden.items.forEach(item => {
            orden.registrarItemRecibido(item.productoId, item.cantidad);
        });

        orden.recibirProductos(userId);
        await repoOrden.guardarCambios(orden);
    } catch (e) {
        console.error(e);
        req.session.message = 'Ocurrió un error al recibir la orden.';
    }

    res.redirect('/Compras');
};

export const cancelarOrden = async (req: any, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const orden = await repoOrden.buscarPorId(id);
    if (!orden) { res.status(404).send("Orden no encontrada"); return; }
    const userId = req.session?.usuarioId || 0;
    const estado = orden.estado.constructor.name;

    if (estado !== 'EstadoPendiente') {
        req.session.message = 'No se puede cancelar una orden que ya fue recibida.';
        return res.redirect('/Compras');
    }

    try {
        orden.cancelar(userId);
        await repoOrden.guardarCambios(orden);
        req.session.message = `Orden ${id} cancelada correctamente.`;
    } catch (e) {
        console.error(e);
        req.session.message = 'No se pudo cancelar la orden.';
    }
    res.redirect("/Compras");
};

export const cerrarConFaltante = async (req: any, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const orden = await repoOrden.buscarPorId(id);
    if (!orden) { res.status(404).send("Orden no encontrada"); return; }
    const userId = req.session?.usuarioId || 0;

    const totalFaltante = (orden.itemsFaltantes || []).reduce((acc, item) => acc + Number(item.cantidadFaltante || 0), 0);
    if (totalFaltante <= 0) {
        req.session.message = "No se puede cerrar con faltante si el faltante es 0. Use 'Cerrar completo'.";
        res.redirect(`/Compras/faltante/${id}`);
        return;
    }

    orden.cerrarConFaltante(userId);
    await repoOrden.guardarCambios(orden);
    res.redirect("/Compras");
};

export const cerrarOrden = async (req: any, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const orden = await repoOrden.buscarPorId(id);
    if (!orden) { res.status(404).send("Orden no encontrada"); return; }
    const userId = req.session?.usuarioId || 0;
    try {
        // Incrementar stock con TODO lo solicitado (cierre completo sin faltantes)
        for (const item of orden.items) {
            const p = await repoProducto.buscarPorId(item.productoId);
            if (p) {
                await repoProducto.modificar(p.getId(), p.getPrecio(), p.getStock() + item.cantidad);
            }
        }
        orden.cerrar(userId);
        await repoOrden.guardarCambios(orden);
        req.session.message = `Orden ${id} cerrada correctamente.`;
    } catch (e) {
        console.error(e);
        req.session.message = 'Error al cerrar la orden.';
    }
    res.redirect("/Compras");
};

export const mostrarEspecificarFaltante = async (req: any, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const orden = await repoOrden.buscarPorId(id);
    if (!orden) { res.status(404).send("Orden no encontrada"); return; }
    const productos = await repoProducto.obtenerTodos();
    const productosMap: Record<number, any> = {};
    productos.forEach(p => { productosMap[(p as any).getId()] = p; });
    res.render("compras/especificarFaltante", { orden, productosMap, session: req.session });
};

export const guardarFaltantes = async (req: any, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const orden = await repoOrden.buscarPorId(id);
    if (!orden) { res.status(404).send("Orden no encontrada"); return; }
    
    const userId = req.session?.usuarioId || 0;
    const faltantes: { productoId: number; cantidadFaltante: number }[] = [];
    
    // Procesar los datos del formulario
    for (const key in req.body) {
        if (key.startsWith('faltante_')) {
            const productoId = Number(key.replace('faltante_', ''));
            const cantidadFaltante = Number(req.body[key]) || 0;
            if (cantidadFaltante > 0) {
                faltantes.push({ productoId, cantidadFaltante });
            }
        }
    }
    
    try {
        const totalFaltante = faltantes.reduce((acc, item) => acc + item.cantidadFaltante, 0);
        if (totalFaltante <= 0) {
            req.session.message = `No se puede cerrar con faltante en la orden ${id} si el faltante es 0.`;
            res.redirect(`/Compras/faltante/${id}`);
            return;
        }

        // Incrementar stock SOLO con lo que efectivamente llegó (solicitado - faltante)
        for (const item of orden.items) {
            const faltante = faltantes.find(f => f.productoId === item.productoId);
            const cantidadRecibida = item.cantidad - (faltante ? faltante.cantidadFaltante : 0);
            const p = await repoProducto.buscarPorId(item.productoId);
            if (p) {
                await repoProducto.modificar(p.getId(), p.getPrecio(), p.getStock() + cantidadRecibida);
            }
        }
        
        orden.registrarFaltantes(faltantes);
        orden.cerrarConFaltante(userId);
        await repoOrden.guardarCambios(orden);
        req.session.message = `Orden ${id} cerrada con faltante.`;
    } catch (e) {
        console.error(e);
        req.session.message = 'Error al cerrar la orden con faltante.';
    }
    
    res.redirect('/Compras');
};
