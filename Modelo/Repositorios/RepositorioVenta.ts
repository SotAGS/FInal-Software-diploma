import { getPool } from "../../config/database";
import { Venta, VentaItem } from "../Entidades/Venta";

export interface FiltrosVentasFecha {
    fecha?: string;
    desde?: string;
    hasta?: string;
}

export interface ResumenVentasMensual {
    periodo: string;
    anio: number;
    mes: number;
    totalProductosVendidos: number;
    totalVentas: number;
    productoMasVendido: string;
    cantidadProductoMasVendido: number;
}

export interface VentaItemDetalle extends VentaItem {
    productoNombre: string;
}

export class RepositorioVenta {
    private static instancia: RepositorioVenta;
    private tablasVerificadas = false;

    public static obtenerInstancia(): RepositorioVenta {
        if (!RepositorioVenta.instancia) {
            RepositorioVenta.instancia = new RepositorioVenta();
        }

        return RepositorioVenta.instancia;
    }

    public async obtenerTodos(filtros?: FiltrosVentasFecha): Promise<Venta[]> {
        const pool = getPool();
        await this.asegurarTablas(pool);

        const where: string[] = [];
        const valores: any[] = [];

        if (filtros?.fecha) {
            where.push("DATE(fecha_creacion) = ?");
            valores.push(filtros.fecha);
        }

        if (!filtros?.fecha && filtros?.desde) {
            where.push("DATE(fecha_creacion) >= ?");
            valores.push(filtros.desde);
        }

        if (!filtros?.fecha && filtros?.hasta) {
            where.push("DATE(fecha_creacion) <= ?");
            valores.push(filtros.hasta);
        }

        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

        const [ventasRows] = await pool.query<any[]>(
            `SELECT id, cliente_nombre, usuario_vendedor_id, total, fecha_creacion
             FROM ventas
             ${whereSql}
             ORDER BY id DESC`,
            valores
        );

        if ((ventasRows as any[]).length === 0) {
            return [];
        }

        const ventaIds = (ventasRows as any[]).map((row: any) => Number(row.id));
        const placeholders = ventaIds.map(() => "?").join(",");

        const [itemsRows] = await pool.query<any[]>(
            `SELECT venta_id, producto_id, cantidad, precio_unitario, subtotal
             FROM ventas_items
             WHERE venta_id IN (${placeholders})
             ORDER BY id`,
            ventaIds
        );

        const itemsPorVenta = new Map<number, VentaItem[]>();

        for (const row of itemsRows as any[]) {
            const actual = itemsPorVenta.get(Number(row.venta_id)) || [];
            actual.push({
                productoId: Number(row.producto_id),
                cantidad: Number(row.cantidad),
                precioUnitario: Number(row.precio_unitario),
                subtotal: Number(row.subtotal)
            });
            itemsPorVenta.set(Number(row.venta_id), actual);
        }

        return (ventasRows as any[]).map((row: any) => {
            return new Venta(
                Number(row.id),
                String(row.cliente_nombre || "Consumidor final"),
                Number(row.total || 0),
                itemsPorVenta.get(Number(row.id)) || [],
                row.usuario_vendedor_id ? Number(row.usuario_vendedor_id) : undefined,
                row.fecha_creacion ? new Date(row.fecha_creacion) : undefined
            );
        });
    }

    public async obtenerResumenMensualVentas(): Promise<ResumenVentasMensual[]> {
        const pool = getPool();
        await this.asegurarTablas(pool);

        const [resumenRows] = await pool.query<any[]>(`
            SELECT
                DATE_FORMAT(v.fecha_creacion, '%Y-%m') AS periodo,
                YEAR(v.fecha_creacion) AS anio,
                MONTH(v.fecha_creacion) AS mes,
                SUM(vi.cantidad) AS total_productos_vendidos,
                ROUND(SUM(vi.subtotal), 2) AS total_ventas
            FROM ventas v
            JOIN ventas_items vi ON vi.venta_id = v.id
            GROUP BY DATE_FORMAT(v.fecha_creacion, '%Y-%m'), YEAR(v.fecha_creacion), MONTH(v.fecha_creacion)
            ORDER BY anio DESC, mes DESC
        `);

        if ((resumenRows as any[]).length === 0) {
            return [];
        }

        const [topRows] = await pool.query<any[]>(`
            SELECT
                DATE_FORMAT(v.fecha_creacion, '%Y-%m') AS periodo,
                p.nombre AS producto,
                SUM(vi.cantidad) AS cantidad
            FROM ventas v
            JOIN ventas_items vi ON vi.venta_id = v.id
            JOIN productos p ON p.id = vi.producto_id
            GROUP BY DATE_FORMAT(v.fecha_creacion, '%Y-%m'), p.id, p.nombre
            ORDER BY periodo DESC, cantidad DESC, producto ASC
        `);

        const topPorPeriodo = new Map<string, { producto: string; cantidad: number }>();
        for (const row of topRows as any[]) {
            const periodo = String(row.periodo);
            if (!topPorPeriodo.has(periodo)) {
                topPorPeriodo.set(periodo, {
                    producto: String(row.producto || "Sin datos"),
                    cantidad: Number(row.cantidad || 0)
                });
            }
        }

        return (resumenRows as any[]).map((row: any) => {
            const periodo = String(row.periodo);
            const top = topPorPeriodo.get(periodo);

            return {
                periodo,
                anio: Number(row.anio),
                mes: Number(row.mes),
                totalProductosVendidos: Number(row.total_productos_vendidos || 0),
                totalVentas: Number(row.total_ventas || 0),
                productoMasVendido: top ? top.producto : "Sin datos",
                cantidadProductoMasVendido: top ? Number(top.cantidad || 0) : 0
            };
        });
    }

    public async obtenerDetallePorId(ventaId: number): Promise<{ venta: Venta; itemsDetalle: VentaItemDetalle[] } | null> {
        const pool = getPool();
        await this.asegurarTablas(pool);

        const [ventasRows] = await pool.query<any[]>(
            `SELECT id, cliente_nombre, usuario_vendedor_id, total, fecha_creacion
             FROM ventas
             WHERE id = ?
             LIMIT 1`,
            [ventaId]
        );

        const ventaRow = (ventasRows as any[])[0];
        if (!ventaRow) {
            return null;
        }

        const [itemsRows] = await pool.query<any[]>(
            `SELECT vi.producto_id, vi.cantidad, vi.precio_unitario, vi.subtotal, p.nombre AS producto_nombre
             FROM ventas_items vi
             LEFT JOIN productos p ON p.id = vi.producto_id
             WHERE vi.venta_id = ?
             ORDER BY vi.id`,
            [ventaId]
        );

        const itemsDetalle: VentaItemDetalle[] = (itemsRows as any[]).map((row: any) => ({
            productoId: Number(row.producto_id),
            cantidad: Number(row.cantidad),
            precioUnitario: Number(row.precio_unitario),
            subtotal: Number(row.subtotal),
            productoNombre: String(row.producto_nombre || `Producto #${Number(row.producto_id)}`)
        }));

        const venta = new Venta(
            Number(ventaRow.id),
            String(ventaRow.cliente_nombre || "Consumidor final"),
            Number(ventaRow.total || 0),
            itemsDetalle.map(item => ({
                productoId: item.productoId,
                cantidad: item.cantidad,
                precioUnitario: item.precioUnitario,
                subtotal: item.subtotal
            })),
            ventaRow.usuario_vendedor_id ? Number(ventaRow.usuario_vendedor_id) : undefined,
            ventaRow.fecha_creacion ? new Date(ventaRow.fecha_creacion) : undefined
        );

        return { venta, itemsDetalle };
    }

    public async crear(clienteNombre: string, itemsSolicitados: { productoId: number; cantidad: number }[], usuarioVendedorId?: number): Promise<Venta> {
        if (!itemsSolicitados.length) {
            throw new Error("La venta no tiene items.");
        }

        const pool = getPool();
        await this.asegurarTablas(pool);
        const conexion = await pool.getConnection();

        try {
            await conexion.beginTransaction();

            const itemsVenta: VentaItem[] = [];
            let totalVenta = 0;

            for (const item of itemsSolicitados) {
                const [rows] = await conexion.query<any[]>(
                    `SELECT id, nombre, precio_venta, precio, stock, activo
                     FROM productos
                     WHERE id = ?
                     FOR UPDATE`,
                    [item.productoId]
                );

                const producto = (rows as any[])[0];
                if (!producto || !Boolean(producto.activo)) {
                    throw new Error(`Producto ${item.productoId} no disponible.`);
                }

                const stockActual = Number(producto.stock || 0);
                const cantidadSolicitada = Number(item.cantidad || 0);

                if (cantidadSolicitada <= 0) {
                    throw new Error(`Cantidad invalida para producto ${producto.nombre}.`);
                }

                if (stockActual < cantidadSolicitada) {
                    throw new Error(`Stock insuficiente para ${producto.nombre}. Disponible: ${stockActual}.`);
                }

                const precioUnitario = Number(producto.precio_venta ?? producto.precio ?? 0);
                const subtotal = precioUnitario * cantidadSolicitada;
                totalVenta += subtotal;

                itemsVenta.push({
                    productoId: Number(producto.id),
                    cantidad: cantidadSolicitada,
                    precioUnitario,
                    subtotal
                });
            }

            const [ventaResult]: any = await conexion.execute(
                `INSERT INTO ventas (cliente_nombre, usuario_vendedor_id, total, fecha_creacion)
                 VALUES (?, ?, ?, NOW())`,
                [clienteNombre, usuarioVendedorId || null, totalVenta]
            );

            const ventaId = Number(ventaResult.insertId);

            for (const item of itemsVenta) {
                await conexion.execute(
                    `INSERT INTO ventas_items (venta_id, producto_id, cantidad, precio_unitario, subtotal)
                     VALUES (?, ?, ?, ?, ?)`,
                    [ventaId, item.productoId, item.cantidad, item.precioUnitario, item.subtotal]
                );

                await conexion.execute(
                    `UPDATE productos
                     SET stock = stock - ?
                     WHERE id = ?`,
                    [item.cantidad, item.productoId]
                );
            }

            await conexion.commit();

            return new Venta(
                ventaId,
                clienteNombre,
                Number(totalVenta.toFixed(2)),
                itemsVenta,
                usuarioVendedorId,
                new Date()
            );
        } catch (error) {
            await conexion.rollback();
            throw error;
        } finally {
            conexion.release();
        }
    }

    private async asegurarTablas(executor: { query: (sql: string, values?: any[]) => Promise<any> }): Promise<void> {
        if (this.tablasVerificadas) {
            return;
        }

        await executor.query(`
            CREATE TABLE IF NOT EXISTS ventas (
                id INT PRIMARY KEY AUTO_INCREMENT,
                cliente_nombre VARCHAR(150) NOT NULL,
                usuario_vendedor_id INT NULL,
                total DECIMAL(12, 2) NOT NULL DEFAULT 0,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_vendedor_id) REFERENCES usuarios(id) ON DELETE SET NULL
            )
        `);

        await executor.query(`
            CREATE TABLE IF NOT EXISTS ventas_items (
                id INT PRIMARY KEY AUTO_INCREMENT,
                venta_id INT NOT NULL,
                producto_id INT NOT NULL,
                cantidad INT NOT NULL,
                precio_unitario DECIMAL(10, 2) NOT NULL,
                subtotal DECIMAL(12, 2) NOT NULL,
                FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
                FOREIGN KEY (producto_id) REFERENCES productos(id)
            )
        `);

        this.tablasVerificadas = true;
    }
}
