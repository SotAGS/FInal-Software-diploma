import { Request, Response } from "express";
import { getPool } from "../config/database";
import { RepositorioOrdenCompra } from "../Modelo/Repositorios/RepositorioOrdenCompra";
import { RepositorioProveedor } from "../Modelo/Repositorios/RepositorioProveedor";

const repoOrden = RepositorioOrdenCompra.obtenerInstancia();
const repoProveedor = RepositorioProveedor.obtenerInstancia();

export const mostrarReportes = (req: Request, res: Response): void => {
    res.render("reportes/index", {
        titulo: "Reportes"
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

        res.render("reportes/busqueda-ordenes-fecha", {
            titulo: "Búsqueda de Órdenes por Fecha",
            ordenes,
            proveedoresMap,
            filtros: { desde, hasta },
            error: null
        });
    } catch (error) {
        console.error(error);
        res.render("reportes/busqueda-ordenes-fecha", {
            titulo: "Búsqueda de Órdenes por Fecha",
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
        res.render("reportes/desempenio-compras", { datos, error: null });
    } catch (error) {
        console.error(error);
        res.render("reportes/desempenio-compras", { datos: [], error: "Error cargando reporte" });
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
        res.render("reportes/rotacion-inventario", { datos, error: null });
    } catch (error) {
        console.error(error);
        res.render("reportes/rotacion-inventario", { datos: [], error: "Error cargando reporte" });
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
            p.precio,
            ROUND(p.stock * p.precio, 2) as valor_inventario,
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
        res.render("reportes/auditoria-accesos", { datos, error: null });
    } catch (error) {
        console.error(error);
        res.render("reportes/auditoria-accesos", { datos: [], error: "Error cargando reporte" });
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

async function queryAuditoriaAccesos() {
    const pool = getPool();
    const [rows] = await pool.query(`
        SELECT 
            DATE_FORMAT(ll.fecha_hora, '%Y-%m-%d') as fecha,
            u.email,
            u.nombre,
            COUNT(CASE WHEN ll.tipo = 'LOGIN' THEN 1 END) as accesos,
            COUNT(CASE WHEN ll.tipo = 'LOGOUT' THEN 1 END) as salidas,
            COUNT(CASE WHEN ll.tipo = 'LOGIN_FAIL' THEN 1 END) as intentos_fallidos
        FROM login_logout ll
        LEFT JOIN usuarios u ON ll.usuario_id = u.id
        WHERE ll.fecha_hora >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE_FORMAT(ll.fecha_hora, '%Y-%m-%d'), u.email, u.nombre, u.id
        ORDER BY fecha DESC
    `);
    return rows;
}