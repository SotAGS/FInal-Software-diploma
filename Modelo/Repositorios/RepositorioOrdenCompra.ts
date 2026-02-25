import { OrdenCompra, OrdenItem } from "../Entidades/OrdenCompra";
import { EstadoPendiente } from "../State/EstadoPendiente";
import { EstadoParcialmenteCompleto } from "../State/EstadoParcialmenteCompleto";
import { EstadoCompleto } from "../State/EstadoCompleto";
import { EstadoCerradoConFaltante } from "../State/EstadoCerradoConFaltante";
import { EstadoCerrado } from "../State/EstadoCerrado";
import { EstadoCancelado } from "../State/EstadoCancelado";
import { OrdenCompraState } from "../State/OrdenCompraState";
import { getPool } from "../../config/database";

export class RepositorioOrdenCompra {
    private static instancia: RepositorioOrdenCompra;
    private static esquemaVerificado = false;

    public static obtenerInstancia(): RepositorioOrdenCompra {
        if (!RepositorioOrdenCompra.instancia) {
            RepositorioOrdenCompra.instancia = new RepositorioOrdenCompra();
        }
        return RepositorioOrdenCompra.instancia;
    }

    private async asegurarColumnaUsuarioCreador(): Promise<void> {
        if (RepositorioOrdenCompra.esquemaVerificado) {
            return;
        }

        const pool = getPool();
        const [rows] = await pool.query<any[]>(
            `SELECT COUNT(*) AS total
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'ordenes_compra'
               AND COLUMN_NAME = 'usuario_creador_id'`
        );

        const existeColumna = Number((rows as any[])[0]?.total || 0) > 0;
        if (!existeColumna) {
            await pool.query(`ALTER TABLE ordenes_compra ADD COLUMN usuario_creador_id INT NULL`);
        }

        RepositorioOrdenCompra.esquemaVerificado = true;
    }

    private estadoDesdeNombre(nombreEstado: string): OrdenCompraState {
        switch (nombreEstado) {
            case "EstadoPendiente":
                return new EstadoPendiente();
            case "EstadoParcialmenteCompleto":
                return new EstadoParcialmenteCompleto();
            case "EstadoCompleto":
                return new EstadoCompleto();
            case "EstadoCerradoConFaltante":
                return new EstadoCerradoConFaltante();
            case "EstadoCerrado":
                return new EstadoCerrado();
            case "EstadoCancelado":
                return new EstadoCancelado();
            default:
                return new EstadoPendiente();
        }
    }

    private async cargarDetallesOrdenes(ordenesBase: any[]): Promise<OrdenCompra[]> {
        if (!ordenesBase.length) {
            return [];
        }

        const pool = getPool();
        const ids = ordenesBase.map(o => o.id);
        const placeholders = ids.map(() => "?").join(",");

        const [itemsRows] = await pool.query<any[]>(
            `SELECT orden_id, producto_id, cantidad
             FROM ordenes_compra_items
             WHERE orden_id IN (${placeholders})
             ORDER BY id`,
            ids
        );

        const [recibidosRows] = await pool.query<any[]>(
            `SELECT orden_id, producto_id, cantidad_recibida
             FROM ordenes_compra_recibidos
             WHERE orden_id IN (${placeholders})
             ORDER BY id`,
            ids
        );

        const [faltantesRows] = await pool.query<any[]>(
            `SELECT orden_id, producto_id, cantidad_faltante
             FROM ordenes_compra_faltantes
             WHERE orden_id IN (${placeholders})
             ORDER BY id`,
            ids
        );

        const itemsPorOrden = new Map<number, OrdenItem[]>();
        const recibidosPorOrden = new Map<number, { productoId: number; cantidadRecibida: number }[]>();
        const faltantesPorOrden = new Map<number, { productoId: number; cantidadFaltante: number }[]>();

        for (const row of itemsRows) {
            const arr = itemsPorOrden.get(row.orden_id) || [];
            arr.push({ productoId: Number(row.producto_id), cantidad: Number(row.cantidad) });
            itemsPorOrden.set(row.orden_id, arr);
        }

        for (const row of recibidosRows) {
            const arr = recibidosPorOrden.get(row.orden_id) || [];
            arr.push({ productoId: Number(row.producto_id), cantidadRecibida: Number(row.cantidad_recibida) });
            recibidosPorOrden.set(row.orden_id, arr);
        }

        for (const row of faltantesRows) {
            const arr = faltantesPorOrden.get(row.orden_id) || [];
            arr.push({ productoId: Number(row.producto_id), cantidadFaltante: Number(row.cantidad_faltante) });
            faltantesPorOrden.set(row.orden_id, arr);
        }

        return ordenesBase.map(row => {
            const orden = new OrdenCompra(
                Number(row.id),
                this.estadoDesdeNombre(row.estado),
                itemsPorOrden.get(row.id) || [],
                row.proveedor_id ? Number(row.proveedor_id) : undefined,
                row.usuario_creador_id ? Number(row.usuario_creador_id) : undefined,
                row.fecha_creacion ? new Date(row.fecha_creacion) : undefined
            );

            orden.itemsRecibidos = recibidosPorOrden.get(row.id) || [];
            orden.itemsFaltantes = faltantesPorOrden.get(row.id) || [];

            return orden;
        });
    }

    async obtenerTodos(filtros?: { desde?: string; hasta?: string }): Promise<OrdenCompra[]> {
        await this.asegurarColumnaUsuarioCreador();
        const pool = getPool();
        const condiciones: string[] = [];
        const params: any[] = [];

        if (filtros?.desde) {
            condiciones.push("DATE(fecha_creacion) >= ?");
            params.push(filtros.desde);
        }

        if (filtros?.hasta) {
            condiciones.push("DATE(fecha_creacion) <= ?");
            params.push(filtros.hasta);
        }

        const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
        const [rows] = await pool.query<any[]>(
            `SELECT id, proveedor_id, usuario_creador_id, estado, fecha_creacion
             FROM ordenes_compra
             ${where}
             ORDER BY id DESC`,
            params
        );

        return this.cargarDetallesOrdenes(rows);
    }

    async buscarPorId(id: number): Promise<OrdenCompra | undefined> {
        await this.asegurarColumnaUsuarioCreador();
        const pool = getPool();
        const [rows] = await pool.query<any[]>(
            `SELECT id, proveedor_id, usuario_creador_id, estado, fecha_creacion
             FROM ordenes_compra
             WHERE id = ?`,
            [id]
        );

        if (!(rows as any[]).length) {
            return undefined;
        }

        const ordenes = await this.cargarDetallesOrdenes(rows as any[]);
        return ordenes[0];
    }

    async crear(items: OrdenItem[], proveedorId?: number, usuarioCreadorId?: number): Promise<OrdenCompra> {
        await this.asegurarColumnaUsuarioCreador();
        const pool = getPool();
        const [result]: any = await pool.execute(
            `INSERT INTO ordenes_compra (proveedor_id, usuario_creador_id, estado, fecha_creacion)
             VALUES (?, ?, 'EstadoPendiente', NOW())`,
            [proveedorId || null, usuarioCreadorId || null]
        );

        const ordenId = Number(result.insertId);
        for (const item of items) {
            await pool.execute(
                `INSERT INTO ordenes_compra_items (orden_id, producto_id, cantidad)
                 VALUES (?, ?, ?)`,
                [ordenId, item.productoId, item.cantidad]
            );
        }

        const orden = await this.buscarPorId(ordenId);
        if (!orden) {
            throw new Error("No se pudo recuperar la orden recién creada");
        }

        return orden;
    }

    async guardarCambios(orden: OrdenCompra): Promise<void> {
        await this.asegurarColumnaUsuarioCreador();
        const pool = getPool();
        const conn = await pool.getConnection();

        try {
            await conn.beginTransaction();

            await conn.execute(
                `UPDATE ordenes_compra
                 SET estado = ?, proveedor_id = ?, usuario_creador_id = COALESCE(usuario_creador_id, ?)
                 WHERE id = ?`,
                [orden.estado.constructor.name, orden.proveedorId || null, orden.getUsuarioCreadorId() || null, orden.id]
            );

            await conn.execute(
                `DELETE FROM ordenes_compra_recibidos WHERE orden_id = ?`,
                [orden.id]
            );

            for (const recibido of orden.itemsRecibidos) {
                await conn.execute(
                    `INSERT INTO ordenes_compra_recibidos (orden_id, producto_id, cantidad_recibida)
                     VALUES (?, ?, ?)`,
                    [orden.id, recibido.productoId, recibido.cantidadRecibida]
                );
            }

            await conn.execute(
                `DELETE FROM ordenes_compra_faltantes WHERE orden_id = ?`,
                [orden.id]
            );

            for (const faltante of orden.itemsFaltantes) {
                await conn.execute(
                    `INSERT INTO ordenes_compra_faltantes (orden_id, producto_id, cantidad_faltante)
                     VALUES (?, ?, ?)`,
                    [orden.id, faltante.productoId, faltante.cantidadFaltante]
                );
            }

            await conn.commit();
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }
}
