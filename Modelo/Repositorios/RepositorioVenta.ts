import { getPool } from "../../config/database";
import { Venta, VentaItem } from "../Entidades/Venta";

export class RepositorioVenta {
    private static instancia: RepositorioVenta;

    public static obtenerInstancia(): RepositorioVenta {
        if (!RepositorioVenta.instancia) {
            RepositorioVenta.instancia = new RepositorioVenta();
        }

        return RepositorioVenta.instancia;
    }

    public async obtenerTodos(): Promise<Venta[]> {
        const pool = getPool();
        const [ventasRows] = await pool.query<any[]>(
            `SELECT id, cliente_nombre, usuario_vendedor_id, total, fecha_creacion
             FROM ventas
             ORDER BY id DESC`
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

    public async crear(clienteNombre: string, itemsSolicitados: { productoId: number; cantidad: number }[], usuarioVendedorId?: number): Promise<Venta> {
        if (!itemsSolicitados.length) {
            throw new Error("La venta no tiene items.");
        }

        const pool = getPool();
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
}
