import { Request, Response } from "express";
import { getPool } from "../config/database";
import { RepositorioOrdenCompra } from "../Modelo/Repositorios/RepositorioOrdenCompra";
import { RepositorioProveedor } from "../Modelo/Repositorios/RepositorioProveedor";
import { RepositorioVenta } from "../Modelo/Repositorios/RepositorioVenta";
import { ReportePdfKey, generarReportePdf } from "../Modelo/Servicios/ServicioReportesPdf";

const repoOrden = RepositorioOrdenCompra.obtenerInstancia();
const repoProveedor = RepositorioProveedor.obtenerInstancia();
const repoVenta = RepositorioVenta.obtenerInstancia();
const NOMBRE_LOCAL = "Almacen LeVain";

const MESES_ES = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre"
];

const esModoPdf = (req: Request): boolean => {
    return String(req.query?.pdf || "") === "1";
};

const renderizarReporte = (req: Request, res: Response, vistaReporte: string, datos: Record<string, any>): void => {
    if (esModoPdf(req)) {
        res.render(`reportes/${vistaReporte}`, {
            ...datos,
            layout: false
        });
        return;
    }

    res.render("reportes/layoutReportes", {
        ...datos,
        vistaReporte,
        layout: false
    });
};

export const mostrarReportes = (req: Request, res: Response): void => {
    renderizarReporte(req, res, "index", {
        titulo: "Reportes",
        nombreLocal: NOMBRE_LOCAL
    });
};

export const mostrarBusquedaOrdenesPorFecha = async (req: Request, res: Response): Promise<void> => {
    try {
        const desde = typeof req.query.desde === "string" ? req.query.desde : "";
        const hasta = typeof req.query.hasta === "string" ? req.query.hasta : "";

        const ordenes = await repoOrden.obtenerTodos({
            desde: desde || undefined,
            hasta: hasta || undefined
        });

        const proveedores = await repoProveedor.obtenerTodos(true);
        const proveedoresMap: Record<number, any> = {};
        proveedores.forEach(pr => {
            proveedoresMap[(pr as any).getId()] = pr;
        });

        renderizarReporte(req, res, "busqueda-ordenes-fecha", {
            titulo: "Búsqueda de Órdenes por Fecha",
            nombreLocal: NOMBRE_LOCAL,
            ordenes,
            proveedoresMap,
            filtros: { desde, hasta },
            error: null
        });
    } catch (error) {
        console.error(error);
        renderizarReporte(req, res, "busqueda-ordenes-fecha", {
            titulo: "Búsqueda de Órdenes por Fecha",
            nombreLocal: NOMBRE_LOCAL,
            ordenes: [],
            proveedoresMap: {},
            filtros: { desde: "", hasta: "" },
            error: "Error al buscar órdenes por fecha"
        });
    }
};

/**
 * REPORTE 1: Desempeño de Compras
 * Muestra tasa de completitud, faltantes y tiempos de entrega por proveedor
 */
export const mostrarDesempenioCompras = async (req: any, res: Response): Promise<void> => {
    try {
        const datos = await queryDesempenioCompras();
        renderizarReporte(req, res, "desempenio-compras", { datos, error: null, nombreLocal: NOMBRE_LOCAL });
    } catch (error) {
        console.error(error);
        renderizarReporte(req, res, "desempenio-compras", { datos: [], error: "Error cargando reporte", nombreLocal: NOMBRE_LOCAL });
    }
};

export const obtenerDesempenioCompras = async (req: any, res: Response): Promise<void> => {
    try {
        const datos = await queryDesempenioCompras();
        res.json(datos);
    } catch (error) {
        res.json({ error: (error as any).message });
    }
};

async function queryDesempenioCompras() {
    const pool = getPool();
    const [rows] = await pool.query(`
        SELECT 
            p.id,
            p.nombre as proveedor,
            COUNT(oc.id) as total_ordenes,
            SUM(CASE WHEN oc.estado = 'EstadoCompleto' THEN 1 ELSE 0 END) as ordenes_completas,
            SUM(CASE WHEN oc.estado = 'EstadoCerradoConFaltante' THEN 1 ELSE 0 END) as ordenes_faltantes,
            ROUND(SUM(CASE WHEN oc.estado = 'EstadoCompleto' THEN 1 ELSE 0 END) * 100 / COUNT(oc.id), 2) as tasa_completitud,
            ROUND(SUM(CASE WHEN oc.estado = 'EstadoCerradoConFaltante' THEN 1 ELSE 0 END) * 100 / COUNT(oc.id), 2) as tasa_faltantes
        FROM ordenes_compra oc
        JOIN proveedores p ON oc.proveedor_id = p.id
        WHERE oc.fecha_creacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY p.id, p.nombre
        ORDER BY tasa_completitud DESC
    `);
    return rows;
}

/**
 * REPORTE 2: Rotación de Inventario
 * Stock actual, valor de inventario, alertas
 */
export const mostrarRotacionInventario = async (req: any, res: Response): Promise<void> => {
    try {
        const datos = await queryRotacionInventario();
        renderizarReporte(req, res, "rotacion-inventario", { datos, error: null, nombreLocal: NOMBRE_LOCAL });
    } catch (error) {
        console.error(error);
        renderizarReporte(req, res, "rotacion-inventario", { datos: [], error: "Error cargando reporte", nombreLocal: NOMBRE_LOCAL });
    }
};

export const obtenerRotacionInventario = async (req: any, res: Response): Promise<void> => {
    try {
        const datos = await queryRotacionInventario();
        res.json(datos);
    } catch (error) {
        res.json({ error: (error as any).message });
    }
};

async function queryRotacionInventario() {
    const pool = getPool();
    const [rows] = await pool.query(`
        SELECT 
            p.id,
            p.nombre,
            p.stock,
            p.precio_venta as precio,
            p.precio_compra,
            ROUND(p.stock * p.precio_compra, 2) as valor_inventario,
            CASE 
                WHEN p.stock < 10 THEN 'CRÍTICO'
                WHEN p.stock < 50 THEN 'BAJO'
                WHEN p.stock < 100 THEN 'NORMAL'
                ELSE 'ALTO'
            END as categoria_stock,
            CASE 
                WHEN p.stock < 10 THEN 'danger'
                WHEN p.stock < 50 THEN 'warning'
                WHEN p.stock < 100 THEN 'info'
                ELSE 'success'
            END as css_class
        FROM productos p
        WHERE p.activo = TRUE
        ORDER BY p.stock ASC
    `);
    return rows;
}

/**
 * REPORTE 3: Auditoría de Accesos
 * Logins, logouts, intentos fallidos
 */
export const mostrarAuditoriaAccesos = async (req: any, res: Response): Promise<void> => {
    try {
        const datos = await queryAuditoriaAccesos();
        renderizarReporte(req, res, "auditoria-accesos", { datos, error: null, nombreLocal: NOMBRE_LOCAL });
    } catch (error) {
        console.error(error);
        renderizarReporte(req, res, "auditoria-accesos", { datos: [], error: "Error cargando reporte", nombreLocal: NOMBRE_LOCAL });
    }
};

/**
 * REPORTE 4: Productos más vendidos
 * Ranking de productos por unidades vendidas con su marca/proveedor.
 */
export const mostrarProductosMasVendidos = async (req: any, res: Response): Promise<void> => {
    try {
        const datos = await queryProductosMasVendidos();
        renderizarReporte(req, res, "productos-mas-vendidos", { datos, error: null, nombreLocal: NOMBRE_LOCAL });
    } catch (error) {
        console.error(error);
        renderizarReporte(req, res, "productos-mas-vendidos", { datos: [], error: "Error cargando reporte", nombreLocal: NOMBRE_LOCAL });
    }
};

/**
 * REPORTE 6: Variación de precios de compra
 * Productos con más cambios de precio de compra registrados en auditoría.
 */
export const mostrarVariacionPreciosCompra = async (req: any, res: Response): Promise<void> => {
    try {
        const datos = await queryVariacionPreciosCompra();
        renderizarReporte(req, res, "variacion-precios-compra", {
            datos,
            error: null,
            nombreLocal: NOMBRE_LOCAL
        });
    } catch (error) {
        console.error(error);
        renderizarReporte(req, res, "variacion-precios-compra", {
            datos: [],
            error: "Error cargando reporte",
            nombreLocal: NOMBRE_LOCAL
        });
    }
};

/**
 * REPORTE 5: Resumen mensual de ventas
 * Totales vendidos por mes y producto más vendido en cada período.
 */
export const mostrarResumenVentasMensual = async (req: any, res: Response): Promise<void> => {
    try {
        const datosBase = await repoVenta.obtenerResumenMensualVentas();
        const datos = datosBase.map((row) => ({
            ...row,
            mesNombre: `${MESES_ES[Math.max(0, row.mes - 1)]} ${row.anio}`
        }));

        renderizarReporte(req, res, "resumen-ventas-mensual", {
            datos,
            error: null,
            nombreLocal: NOMBRE_LOCAL
        });
    } catch (error) {
        console.error(error);
        renderizarReporte(req, res, "resumen-ventas-mensual", {
            datos: [],
            error: "Error cargando reporte",
            nombreLocal: NOMBRE_LOCAL
        });
    }
};

export const obtenerResumenVentasMensual = async (req: any, res: Response): Promise<void> => {
    try {
        const datosBase = await repoVenta.obtenerResumenMensualVentas();
        const datos = datosBase.map((row) => ({
            ...row,
            mesNombre: `${MESES_ES[Math.max(0, row.mes - 1)]} ${row.anio}`
        }));
        res.json(datos);
    } catch (error) {
        res.json({ error: (error as any).message });
    }
};

export const obtenerProductosMasVendidos = async (req: any, res: Response): Promise<void> => {
    try {
        const datos = await queryProductosMasVendidos();
        res.json(datos);
    } catch (error) {
        res.json({ error: (error as any).message });
    }
};

export const obtenerVariacionPreciosCompra = async (req: any, res: Response): Promise<void> => {
    try {
        const datos = await queryVariacionPreciosCompra();
        res.json(datos);
    } catch (error) {
        res.json({ error: (error as any).message });
    }
};

export const obtenerAuditoriaAccesos = async (req: any, res: Response): Promise<void> => {
    try {
        const datos = await queryAuditoriaAccesos();
        res.json(datos);
    } catch (error) {
        res.json({ error: (error as any).message });
    }
};

export const descargarReportePdf = async (req: Request, res: Response): Promise<void> => {
    try {
        const reporte = String(req.params.reporte || "") as ReportePdfKey;
        const reportesValidos: ReportePdfKey[] = [
            "desempenio-compras",
            "rotacion-inventario",
            "auditoria-accesos",
            "productos-mas-vendidos",
            "variacion-precios-compra",
            "busqueda-ordenes-fecha",
            "resumen-ventas-mensual"
        ];

        if (!reportesValidos.includes(reporte)) {
            res.status(400).send("Reporte no válido para descarga PDF");
            return;
        }

        const queryParams: Record<string, string | undefined> = {};
        if (reporte === "busqueda-ordenes-fecha") {
            queryParams.desde = typeof req.query.desde === "string" ? req.query.desde : undefined;
            queryParams.hasta = typeof req.query.hasta === "string" ? req.query.hasta : undefined;
        }

        const cookieHeader = typeof req.headers.cookie === "string" ? req.headers.cookie : undefined;
        const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
        const protocolo = forwardedProto || req.protocol || "http";
        const host = req.get("host") || "localhost:3000";
        const baseUrl = process.env.APP_BASE_URL || `${protocolo}://${host}`;

        const { filePath, fileName } = await generarReportePdf(reporte, cookieHeader, queryParams, baseUrl);

        res.download(filePath, fileName, () => {
            setTimeout(() => {
                try {
                    require("fs").unlinkSync(filePath);
                } catch {
                }
            }, 0);
        });
    } catch (error) {
        console.error("Error generando PDF de reporte:", error);
        res.status(500).send("No se pudo generar el PDF del reporte");
    }
};

async function queryAuditoriaAccesos() {
    const pool = getPool();
    const [tableRows] = await pool.query<any[]>(
        `SELECT COUNT(*) AS total
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'login_logout'`
    );

    const existeTabla = Number((tableRows as any[])[0]?.total || 0) > 0;
    if (!existeTabla) {
        return [];
    }

    const [columnRows] = await pool.query<any[]>(
        `SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'login_logout'`
    );

    const columnas = new Set((columnRows as any[]).map((row: any) => String(row.COLUMN_NAME)));
    const campoTipo = columnas.has("tipo") ? "tipo" : "tipo_evento";
    const campoFecha = columnas.has("fecha_hora") ? "fecha_hora" : "fecha";

    const [rows] = await pool.query(`
        SELECT 
            DATE_FORMAT(ll.${campoFecha}, '%Y-%m-%d') as fecha,
            u.email,
            u.nombre,
            COUNT(CASE WHEN ll.${campoTipo} = 'LOGIN' THEN 1 END) as accesos,
            COUNT(CASE WHEN ll.${campoTipo} = 'LOGOUT' THEN 1 END) as salidas,
            COUNT(CASE WHEN ll.${campoTipo} = 'LOGIN_FAIL' THEN 1 END) as intentos_fallidos
        FROM login_logout ll
        LEFT JOIN usuarios u ON ll.usuario_id = u.id
        WHERE ll.${campoFecha} >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE_FORMAT(ll.${campoFecha}, '%Y-%m-%d'), u.email, u.nombre, u.id
        ORDER BY fecha DESC
    `);
    return rows;
}

async function queryProductosMasVendidos() {
    const pool = getPool();
    const [rows] = await pool.query(`
        SELECT
            p.id,
            p.nombre AS producto,
            COALESCE(pr.nombre, 'Sin marca/proveedor') AS marca,
            SUM(vi.cantidad) AS unidades_vendidas,
            ROUND(SUM(vi.subtotal), 2) AS recaudacion_producto,
            ROUND(SUM(vi.subtotal), 2) AS ingresos_totales,
            COUNT(DISTINCT v.id) AS ventas_participadas
        FROM ventas_items vi
        JOIN ventas v ON v.id = vi.venta_id
        JOIN productos p ON p.id = vi.producto_id
        LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
        GROUP BY p.id, p.nombre, pr.nombre
        ORDER BY unidades_vendidas DESC, ingresos_totales DESC, p.nombre ASC
    `);
    return rows;
}

async function queryVariacionPreciosCompra() {
    const pool = getPool();

    const [rows] = await pool.query(`
        SELECT
            cambios.producto_id,
            COALESCE(p.nombre, CONCAT('Producto #', cambios.producto_id)) AS producto,
            cambios.cambios_precio_compra,
            cambios.precios_compra_distintos,
            cambios.precio_compra_minimo,
            cambios.precio_compra_maximo,
            ROUND(cambios.precio_compra_maximo - cambios.precio_compra_minimo, 2) AS rango_variacion
        FROM (
            SELECT
                a.id_entidad AS producto_id,
                COUNT(*) AS cambios_precio_compra,
                COUNT(DISTINCT a.precio_nuevo) AS precios_compra_distintos,
                MIN(a.precio_nuevo) AS precio_compra_minimo,
                MAX(a.precio_nuevo) AS precio_compra_maximo
            FROM (
                SELECT
                    id_entidad,
                    CAST(COALESCE(
                        JSON_UNQUOTE(JSON_EXTRACT(valor_anterior, '$.precioCompra')),
                        JSON_UNQUOTE(JSON_EXTRACT(valor_anterior, '$.precio_compra')),
                        JSON_UNQUOTE(JSON_EXTRACT(valor_anterior, '$.precio'))
                    ) AS DECIMAL(10,2)) AS precio_anterior,
                    CAST(COALESCE(
                        JSON_UNQUOTE(JSON_EXTRACT(valor_nuevo, '$.precioCompra')),
                        JSON_UNQUOTE(JSON_EXTRACT(valor_nuevo, '$.precio_compra')),
                        JSON_UNQUOTE(JSON_EXTRACT(valor_nuevo, '$.precio'))
                    ) AS DECIMAL(10,2)) AS precio_nuevo
                FROM auditoria
                                WHERE entidad IN ('Producto', 'PRODUCTO', 'producto', 'productos')
                                    AND accion IN ('ACTUALIZAR', 'EDITAR')
                  AND id_entidad IS NOT NULL
                  AND JSON_VALID(valor_nuevo)
            ) a
            WHERE a.precio_nuevo IS NOT NULL
              AND (a.precio_anterior IS NULL OR a.precio_anterior <> a.precio_nuevo)
            GROUP BY a.id_entidad
        ) cambios
        LEFT JOIN productos p ON p.id = cambios.producto_id
        ORDER BY
            cambios.precios_compra_distintos DESC,
            cambios.cambios_precio_compra DESC,
            rango_variacion DESC,
            producto ASC
    `);

    return rows;
}