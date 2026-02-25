import { Proveedor } from "../Entidades/Proveedor";
import { getPool } from "../../config/database";
import { RepositorioProducto } from "./RepositorioProducto";

export class RepositorioProveedor {
    private static instancia: RepositorioProveedor | null = null;
    private readonly repoProducto = RepositorioProducto.obtenerInstancia();

    private constructor() {}

    public static obtenerInstancia(): RepositorioProveedor {
        if (!RepositorioProveedor.instancia) {
            RepositorioProveedor.instancia = new RepositorioProveedor();
        }

        return RepositorioProveedor.instancia;
    }

    private rowToProveedor(row: any): Proveedor {
        return new Proveedor(
            row.id,
            row.nombre,
            row.contacto || "",
            Boolean(row.activo)
        );
    }

    async crear(nombre: string, contacto: string, productoIds: number[] = []): Promise<Proveedor> {
        const pool = getPool();
        const [result]: any = await pool.execute(
            "INSERT INTO proveedores (nombre, email, activo, fecha_creacion) VALUES (?, ?, TRUE, NOW())",
            [nombre, contacto]
        );

        const proveedorId = Number(result.insertId);
        await this.repoProducto.asignarProveedorAProductos(proveedorId, productoIds);

        return new Proveedor(proveedorId, nombre, contacto, true);
    }

    async obtenerTodos(incluirInactivos: boolean = false): Promise<Proveedor[]> {
        const pool = getPool();
        const condicionActivo = incluirInactivos ? "" : "WHERE activo = TRUE";
        const [rows] = await pool.query<any[]>(
            `SELECT id, nombre, COALESCE(telefono, email, direccion, '') AS contacto, activo
             FROM proveedores
             ${condicionActivo}
             ORDER BY nombre`
        );

        return rows.map(row => this.rowToProveedor(row));
    }

    async buscarPorId(id: number, incluirInactivos: boolean = false): Promise<Proveedor | undefined> {
        const pool = getPool();
        const condicionActivo = incluirInactivos ? "" : "AND activo = TRUE";
        const [rows] = await pool.query<any[]>(
            `SELECT id, nombre, COALESCE(telefono, email, direccion, '') AS contacto, activo
             FROM proveedores
             WHERE id = ? ${condicionActivo}`,
            [id]
        );

        if ((rows as any[]).length === 0) {
            return undefined;
        }

        return this.rowToProveedor((rows as any[])[0]);
    }

    async actualizar(id: number, nombre: string, contacto: string, productoIds: number[] = []): Promise<boolean> {
        const pool = getPool();
        const [result]: any = await pool.execute(
            "UPDATE proveedores SET nombre = ?, email = ? WHERE id = ?",
            [nombre, contacto, id]
        );

        if (result.affectedRows > 0) {
            await this.repoProducto.asignarProveedorAProductos(id, productoIds);
        }

        return result.affectedRows > 0;
    }

    async eliminar(id: number): Promise<boolean> {
        const pool = getPool();
        const [result]: any = await pool.execute(
            "UPDATE proveedores SET activo = FALSE WHERE id = ?",
            [id]
        );

        if (result.affectedRows > 0) {
            await this.repoProducto.asignarProveedorAProductos(id, []);
        }

        return result.affectedRows > 0;
    }

    async recuperar(id: number): Promise<boolean> {
        const pool = getPool();
        const [result]: any = await pool.execute(
            "UPDATE proveedores SET activo = TRUE WHERE id = ?",
            [id]
        );

        return result.affectedRows > 0;
    }

    async obtenerProductosIdsPorProveedor(id: number): Promise<number[]> {
        const productos = await this.repoProducto.obtenerTodos(true);
        return productos
            .filter(p => p.getProveedorId() === id)
            .map(p => p.getId());
    }
}
