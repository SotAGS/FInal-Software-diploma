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

        const [rows] = await pool.query<any[]>(`
            SELECT
                DATE_FORMAT(v.fecha_creacion, '%Y-%m') AS periodo,
                YEAR(v.fecha_creacion) AS anio,
                MONTH(v.fecha_creacion) AS mes,
                SUM(vi.cantidad) AS total_productos_vendidos,
                ROUND(SUM(vi.subtotal), 2) AS total_ventas,
                (
                    SELECT p2.nombre
                    FROM ventas_items vi2
                    JOIN ventas v2 ON v2.id = vi2.venta_id
                    JOIN productos p2 ON p2.id = vi2.producto_id
                    WHERE DATE_FORMAT(v2.fecha_creacion, '%Y-%m') = DATE_FORMAT(v.fecha_creacion, '%Y-%m')
                    GROUP BY p2.id, p2.nombre
                    ORDER BY SUM(vi2.cantidad) DESC, p2.nombre ASC
                    LIMIT 1
                ) AS producto_mas_vendido,
                (
                    SELECT SUM(vi3.cantidad)
                    FROM ventas_items vi3
                    JOIN ventas v3 ON v3.id = vi3.venta_id
                    JOIN productos p3 ON p3.id = vi3.producto_id
                    WHERE DATE_FORMAT(v3.fecha_creacion, '%Y-%m') = DATE_FORMAT(v.fecha_creacion, '%Y-%m')
                    GROUP BY p3.id, p3.nombre
                    ORDER BY SUM(vi3.cantidad) DESC, p3.nombre ASC
                    LIMIT 1
                ) AS cantidad_producto_mas_vendido
            FROM ventas v
            JOIN ventas_items vi ON vi.venta_id = v.id
            GROUP BY DATE_FORMAT(v.fecha_creacion, '%Y-%m'), YEAR(v.fecha_creacion), MONTH(v.fecha_creacion)
            ORDER BY anio DESC, mes DESC
        `);

        return (rows as any[]).map((row: any) => ({
            periodo: String(row.periodo),
            anio: Number(row.anio),
            mes: Number(row.mes),
            totalProductosVendidos: Number(row.total_productos_vendidos || 0),
            totalVentas: Number(row.total_ventas || 0),
            productoMasVendido: String(row.producto_mas_vendido || "Sin datos"),
            cantidadProductoMasVendido: Number(row.cantidad_producto_mas_vendido || 0)
        }));
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
                    `SELECT id, nombre, precio, stock, activo
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

                const precioUnitario = Number(producto.precio || 0);
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
