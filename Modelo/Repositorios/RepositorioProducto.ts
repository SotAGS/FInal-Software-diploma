import { Producto } from "../Entidades/Producto";
import { getPool } from "../../config/database";

export class RepositorioProducto {

    private static instancia: RepositorioProducto;
    private static esquemaVerificado = false;

    public static obtenerInstancia(): RepositorioProducto {
        if (!RepositorioProducto.instancia) {
            RepositorioProducto.instancia = new RepositorioProducto();
        }
        return RepositorioProducto.instancia;
    }

    private async asegurarColumnaProveedorId(): Promise<void> {
        if (RepositorioProducto.esquemaVerificado) {
            return;
        }

        const pool = getPool();
        const [rows] = await pool.query<any[]>(
            `SELECT COUNT(*) AS total
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'productos'
               AND COLUMN_NAME = 'proveedor_id'`
        );

        const existeColumna = Number((rows as any[])[0]?.total || 0) > 0;
        if (!existeColumna) {
            await pool.query(`ALTER TABLE productos ADD COLUMN proveedor_id INT NULL`);
            await pool.query(`ALTER TABLE productos ADD CONSTRAINT fk_productos_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL`);
        }

        RepositorioProducto.esquemaVerificado = true;
    }

    private rowToProducto(row: any): Producto {
        return new Producto(
            row.id,
            row.nombre,
            Number(row.precio),
            Number(row.stock),
            Boolean(row.activo),
            row.proveedor_id ? Number(row.proveedor_id) : undefined
        );
    }

    async obtenerTodos(incluirInactivos: boolean = false): Promise<Producto[]> {
        await this.asegurarColumnaProveedorId();
        const pool = getPool();
        const whereActivo = incluirInactivos ? "" : "WHERE activo = 1";
        const [rows] = await pool.query<any[]>(`SELECT id, nombre, precio, stock, activo, proveedor_id FROM productos ${whereActivo} ORDER BY id`);
        return rows.map(r => this.rowToProducto(r));
    }

    async buscarPorId(id: number, incluirInactivos: boolean = false): Promise<Producto | undefined> {
        await this.asegurarColumnaProveedorId();
        const pool = getPool();
        const condicionActivo = incluirInactivos ? "" : "AND activo = 1";
        const [rows] = await pool.query<any[]>(`SELECT id, nombre, precio, stock, activo, proveedor_id FROM productos WHERE id = ? ${condicionActivo}`, [id]);
        if ((rows as any[]).length === 0) return undefined;
        return this.rowToProducto((rows as any[])[0]);
    }

    async crear(nombre: string, precio: number, stock: number, proveedorId?: number): Promise<Producto> {
        await this.asegurarColumnaProveedorId();
        const pool = getPool();
        const [result]: any = await pool.execute("INSERT INTO productos (nombre, precio, stock, proveedor_id) VALUES (?, ?, ?, ?)", [nombre, precio, stock, proveedorId || null]);
        const insertId = result.insertId;
        return new Producto(insertId, nombre, precio, stock, true, proveedorId);
    }

    async eliminar(id: number): Promise<void> {
        await this.asegurarColumnaProveedorId();
        const pool = getPool();
        await pool.execute("UPDATE productos SET activo = 0 WHERE id = ?", [id]);
    }

    async recuperar(id: number): Promise<void> {
        await this.asegurarColumnaProveedorId();
        const pool = getPool();
        await pool.execute("UPDATE productos SET activo = 1 WHERE id = ?", [id]);
    }

    async eliminarDefinitivo(id: number): Promise<boolean> {
        await this.asegurarColumnaProveedorId();
        const pool = getPool();
        const [result]: any = await pool.execute("DELETE FROM productos WHERE id = ?", [id]);
        return result.affectedRows > 0;
    }

    async modificar(id: number, precio: number, stock: number, proveedorId?: number): Promise<void> {
        await this.asegurarColumnaProveedorId();
        const pool = getPool();
        if (typeof proveedorId === "undefined") {
            await pool.execute("UPDATE productos SET precio = ?, stock = ? WHERE id = ?", [precio, stock, id]);
            return;
        }

        await pool.execute("UPDATE productos SET precio = ?, stock = ?, proveedor_id = ? WHERE id = ?", [precio, stock, proveedorId || null, id]);
    }

    async asignarProveedorAProductos(proveedorId: number, productoIds: number[]): Promise<void> {
        await this.asegurarColumnaProveedorId();
        const pool = getPool();
        const conn = await pool.getConnection();

        try {
            await conn.beginTransaction();

            await conn.execute("UPDATE productos SET proveedor_id = NULL WHERE proveedor_id = ?", [proveedorId]);

            if (productoIds.length > 0) {
                const placeholders = productoIds.map(() => "?").join(",");
                await conn.execute(
                    `UPDATE productos SET proveedor_id = ? WHERE id IN (${placeholders})`,
                    [proveedorId, ...productoIds]
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