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

    private async asegurarEsquemaProducto(): Promise<void> {
        if (RepositorioProducto.esquemaVerificado) {
            return;
        }

        const pool = getPool();
        const [rowsProveedor] = await pool.query<any[]>(
            `SELECT COUNT(*) AS total
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'productos'
               AND COLUMN_NAME = 'proveedor_id'`
        );

        const existeProveedorId = Number((rowsProveedor as any[])[0]?.total || 0) > 0;
        if (!existeProveedorId) {
            await pool.query(`ALTER TABLE productos ADD COLUMN proveedor_id INT NULL`);
            await pool.query(`ALTER TABLE productos ADD CONSTRAINT fk_productos_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL`);
        }

        const [rowsPrecioCompra] = await pool.query<any[]>(
            `SELECT COUNT(*) AS total
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'productos'
               AND COLUMN_NAME = 'precio_compra'`
        );
        const existePrecioCompra = Number((rowsPrecioCompra as any[])[0]?.total || 0) > 0;
        if (!existePrecioCompra) {
            await pool.query(`ALTER TABLE productos ADD COLUMN precio_compra DECIMAL(10, 2) NOT NULL DEFAULT 0`);
        }

        const [rowsPrecioVenta] = await pool.query<any[]>(
            `SELECT COUNT(*) AS total
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'productos'
               AND COLUMN_NAME = 'precio_venta'`
        );
        const existePrecioVenta = Number((rowsPrecioVenta as any[])[0]?.total || 0) > 0;
        if (!existePrecioVenta) {
            await pool.query(`ALTER TABLE productos ADD COLUMN precio_venta DECIMAL(10, 2) NOT NULL DEFAULT 0`);
        }

        // Migración de compatibilidad: si existía precio único, copiarlo como valor inicial.
        await pool.query(`
            UPDATE productos
            SET
                precio_compra = CASE
                    WHEN precio_compra = 0 THEN COALESCE(precio, 0)
                    ELSE precio_compra
                END,
                precio_venta = CASE
                    WHEN precio_venta = 0 THEN COALESCE(precio, 0)
                    ELSE precio_venta
                END
        `);

        RepositorioProducto.esquemaVerificado = true;
    }

    private rowToProducto(row: any): Producto {
        const precioCompra = Number(row.precio_compra ?? row.precio ?? 0);
        const precioVenta = Number(row.precio_venta ?? row.precio ?? 0);

        return new Producto(
            row.id,
            row.nombre,
            precioCompra,
            precioVenta,
            Number(row.stock),
            Boolean(row.activo),
            row.proveedor_id ? Number(row.proveedor_id) : undefined
        );
    }

    async obtenerTodos(incluirInactivos: boolean = false): Promise<Producto[]> {
        await this.asegurarEsquemaProducto();
        const pool = getPool();
        const whereActivo = incluirInactivos ? "" : "WHERE activo = 1";
        const [rows] = await pool.query<any[]>(`SELECT id, nombre, precio_compra, precio_venta, precio, stock, activo, proveedor_id FROM productos ${whereActivo} ORDER BY id`);
        return rows.map(r => this.rowToProducto(r));
    }

    async buscarPorId(id: number, incluirInactivos: boolean = false): Promise<Producto | undefined> {
        await this.asegurarEsquemaProducto();
        const pool = getPool();
        const condicionActivo = incluirInactivos ? "" : "AND activo = 1";
        const [rows] = await pool.query<any[]>(`SELECT id, nombre, precio_compra, precio_venta, precio, stock, activo, proveedor_id FROM productos WHERE id = ? ${condicionActivo}`, [id]);
        if ((rows as any[]).length === 0) return undefined;
        return this.rowToProducto((rows as any[])[0]);
    }

    async crear(nombre: string, precioCompra: number, precioVenta: number, stock: number, proveedorId?: number): Promise<Producto> {
        await this.asegurarEsquemaProducto();
        const pool = getPool();

        const existeDuplicado = await this.existePorNombreYProveedor(nombre, proveedorId || null);
        if (existeDuplicado) {
            throw new Error("Ya existe un producto activo con ese nombre para el proveedor seleccionado");
        }

        const [result]: any = await pool.execute(
            "INSERT INTO productos (nombre, precio_compra, precio_venta, precio, stock, proveedor_id) VALUES (?, ?, ?, ?, ?, ?)",
            [nombre, precioCompra, precioVenta, precioVenta, stock, proveedorId || null]
        );
        const insertId = result.insertId;
        return new Producto(insertId, nombre, precioCompra, precioVenta, stock, true, proveedorId);
    }

    async existePorNombreYProveedor(nombre: string, proveedorId: number | null, excluirId?: number): Promise<boolean> {
        await this.asegurarEsquemaProducto();
        const pool = getPool();
        const nombreNormalizado = nombre.trim().toLowerCase();

        const condiciones = [
            "activo = 1",
            "LOWER(TRIM(nombre)) = ?"
        ];

        const valores: any[] = [nombreNormalizado];

        if (proveedorId === null) {
            condiciones.push("proveedor_id IS NULL");
        } else {
            condiciones.push("proveedor_id = ?");
            valores.push(proveedorId);
        }

        if (typeof excluirId === "number") {
            condiciones.push("id <> ?");
            valores.push(excluirId);
        }

        const [rows] = await pool.query<any[]>(
            `SELECT COUNT(*) AS total
             FROM productos
             WHERE ${condiciones.join(" AND ")}`,
            valores
        );

        return Number((rows as any[])[0]?.total || 0) > 0;
    }

    async eliminar(id: number): Promise<void> {
        await this.asegurarEsquemaProducto();
        const pool = getPool();
        await pool.execute("UPDATE productos SET activo = 0 WHERE id = ?", [id]);
    }

    async recuperar(id: number): Promise<void> {
        await this.asegurarEsquemaProducto();
        const pool = getPool();
        await pool.execute("UPDATE productos SET activo = 1 WHERE id = ?", [id]);
    }

    async eliminarDefinitivo(id: number): Promise<boolean> {
        await this.asegurarEsquemaProducto();
        const pool = getPool();
        const [result]: any = await pool.execute("DELETE FROM productos WHERE id = ?", [id]);
        return result.affectedRows > 0;
    }

    async modificar(id: number, precioCompra: number, precioVenta: number, stock: number, proveedorId?: number): Promise<void> {
        await this.asegurarEsquemaProducto();
        const pool = getPool();
        if (typeof proveedorId === "undefined") {
            await pool.execute(
                "UPDATE productos SET precio_compra = ?, precio_venta = ?, precio = ?, stock = ? WHERE id = ?",
                [precioCompra, precioVenta, precioVenta, stock, id]
            );
            return;
        }

        await pool.execute(
            "UPDATE productos SET precio_compra = ?, precio_venta = ?, precio = ?, stock = ?, proveedor_id = ? WHERE id = ?",
            [precioCompra, precioVenta, precioVenta, stock, proveedorId || null, id]
        );
    }

    async actualizarStock(id: number, stock: number): Promise<void> {
        await this.asegurarEsquemaProducto();
        const pool = getPool();
        await pool.execute("UPDATE productos SET stock = ? WHERE id = ?", [stock, id]);
    }

    async asignarProveedorAProductos(proveedorId: number, productoIds: number[]): Promise<void> {
        await this.asegurarEsquemaProducto();
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