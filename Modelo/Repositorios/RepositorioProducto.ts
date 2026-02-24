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
        return new Producto(row.id, row.nombre, Number(row.precio), Number(row.stock));
    }

    async obtenerTodos(): Promise<Producto[]> {
        const pool = getPool();
        const [rows] = await pool.query<any[]>("SELECT id, nombre, precio, stock FROM productos WHERE activo = 1 ORDER BY id");
        return rows.map(r => this.rowToProducto(r));
    }

    async buscarPorId(id: number): Promise<Producto | undefined> {
        const pool = getPool();
        const [rows] = await pool.query<any[]>("SELECT id, nombre, precio, stock FROM productos WHERE id = ? AND activo = 1", [id]);
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

    async modificar(id: number, precio: number, stock: number): Promise<void> {
        const pool = getPool();
        await pool.execute("UPDATE productos SET precio = ?, stock = ? WHERE id = ?", [precio, stock, id]);
    }
}