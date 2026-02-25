import { Producto } from "../Entidades/Producto";
import { getPool } from "../../config/database";

export class RepositorioProducto {

    private static instancia: RepositorioProducto;

    public static obtenerInstancia(): RepositorioProducto {
        if (!RepositorioProducto.instancia) {
            RepositorioProducto.instancia = new RepositorioProducto();
        }
        return RepositorioProducto.instancia;
    }

    private rowToProducto(row: any): Producto {
        return new Producto(row.id, row.nombre, Number(row.precio), Number(row.stock), Boolean(row.activo));
    }

    async obtenerTodos(incluirInactivos: boolean = false): Promise<Producto[]> {
        const pool = getPool();
        const whereActivo = incluirInactivos ? "" : "WHERE activo = 1";
        const [rows] = await pool.query<any[]>(`SELECT id, nombre, precio, stock, activo FROM productos ${whereActivo} ORDER BY id`);
        return rows.map(r => this.rowToProducto(r));
    }

    async buscarPorId(id: number, incluirInactivos: boolean = false): Promise<Producto | undefined> {
        const pool = getPool();
        const condicionActivo = incluirInactivos ? "" : "AND activo = 1";
        const [rows] = await pool.query<any[]>(`SELECT id, nombre, precio, stock, activo FROM productos WHERE id = ? ${condicionActivo}`, [id]);
        if ((rows as any[]).length === 0) return undefined;
        return this.rowToProducto((rows as any[])[0]);
    }

    async crear(nombre: string, precio: number, stock: number): Promise<Producto> {
        const pool = getPool();
        const [result]: any = await pool.execute("INSERT INTO productos (nombre, precio, stock) VALUES (?, ?, ?)", [nombre, precio, stock]);
        const insertId = result.insertId;
        return new Producto(insertId, nombre, precio, stock);
    }

    async eliminar(id: number): Promise<void> {
        const pool = getPool();
        await pool.execute("UPDATE productos SET activo = 0 WHERE id = ?", [id]);
    }

    async recuperar(id: number): Promise<void> {
        const pool = getPool();
        await pool.execute("UPDATE productos SET activo = 1 WHERE id = ?", [id]);
    }

    async modificar(id: number, precio: number, stock: number): Promise<void> {
        const pool = getPool();
        await pool.execute("UPDATE productos SET precio = ?, stock = ? WHERE id = ?", [precio, stock, id]);
    }
}