import { getPool } from "../../config/database";
import { PermisoAtomico } from "../Seguridad/PermisoAtomico";
import { PermisoCompuesto } from "../Seguridad/PermisoCompuesto";
import { Rol } from "../Entidades/Rol";

export interface DefinicionPermiso {
    codigo: string;
    descripcion: string;
    modulo: string;
}

export interface RegistroRol {
    id: number;
    nombre: string;
    descripcion: string;
    permisos: string[];
    activo: boolean;
}

export class RepositorioRol {
    private static readonly CATALOGO_PERMISOS: DefinicionPermiso[] = [
        { codigo: "CREAR_PRODUCTO", descripcion: "Crear producto", modulo: "Inventario" },
        { codigo: "EDITAR_PRODUCTO", descripcion: "Editar producto", modulo: "Inventario" },
        { codigo: "ELIMINAR_PRODUCTO", descripcion: "Eliminar producto", modulo: "Inventario" },
        { codigo: "VER_STOCK", descripcion: "Ver stock", modulo: "Inventario" },
        { codigo: "CREAR_ORDEN_COMPRA", descripcion: "Crear orden de compra", modulo: "Compras" },
        { codigo: "EDITAR_ORDEN_COMPRA", descripcion: "Editar orden de compra", modulo: "Compras" },
        { codigo: "VER_REPORTES", descripcion: "Ver reportes", modulo: "Reportes" },
        { codigo: "GESTIONAR_USUARIOS", descripcion: "Gestionar usuarios", modulo: "Seguridad" },
        { codigo: "GESTIONAR_ROLES", descripcion: "Gestionar roles", modulo: "Seguridad" }
    ];

    private static readonly PERMISOS_BASE_POR_ROL: Record<string, string[]> = {
        ADMIN: [
            "CREAR_PRODUCTO",
            "EDITAR_PRODUCTO",
            "ELIMINAR_PRODUCTO",
            "VER_STOCK",
            "CREAR_ORDEN_COMPRA",
            "EDITAR_ORDEN_COMPRA",
            "VER_REPORTES",
            "GESTIONAR_USUARIOS",
            "GESTIONAR_ROLES"
        ],
        GERENTE: [
            "VER_STOCK",
            "CREAR_ORDEN_COMPRA",
            "EDITAR_ORDEN_COMPRA",
            "VER_REPORTES",
            "GESTIONAR_USUARIOS"
        ],
        EMPLEADO: [
            "VER_STOCK"
        ]
    };

    public obtenerCatalogoPermisos(): DefinicionPermiso[] {
        return [...RepositorioRol.CATALOGO_PERMISOS];
    }

    public async obtenerTodos(incluirInactivos: boolean = false): Promise<RegistroRol[]> {
        const pool = getPool();
        await this.asegurarTablaRoles(pool);
        await this.asegurarTablaPermisos(pool);
        await this.asegurarPermisosBase(pool);

        const [rows] = await pool.query(
            `SELECT r.id, r.nombre, r.descripcion, r.activo, rp.codigo_permiso
             FROM roles r
             LEFT JOIN rol_permisos rp ON rp.rol_id = r.id
             ${incluirInactivos ? "" : "WHERE r.activo = TRUE"}
             ORDER BY r.nombre, rp.codigo_permiso`
        );

        const mapaRoles = new Map<number, RegistroRol>();

        for (const row of rows as any[]) {
            if (!mapaRoles.has(row.id)) {
                mapaRoles.set(row.id, {
                    id: row.id,
                    nombre: row.nombre,
                    descripcion: row.descripcion || "",
                    permisos: [],
                    activo: Boolean(row.activo)
                });
            }

            if (row.codigo_permiso) {
                mapaRoles.get(row.id)!.permisos.push(row.codigo_permiso);
            }
        }

        return Array.from(mapaRoles.values());
    }

    public async obtenerNombresRoles(): Promise<string[]> {
        const roles = await this.obtenerTodos();
        return roles.map(r => r.nombre);
    }

    public async obtenerPorId(id: number, incluirInactivos: boolean = false): Promise<RegistroRol | undefined> {
        const roles = await this.obtenerTodos(incluirInactivos);
        return roles.find(r => r.id === id);
    }

    public async obtenerPorNombre(nombre: string): Promise<RegistroRol | undefined> {
        const roles = await this.obtenerTodos();
        return roles.find(r => r.nombre === nombre);
    }

    public async crear(nombre: string, descripcion: string, permisos: string[]): Promise<boolean> {
        const pool = getPool();
        const conexion = await pool.getConnection();

        try {
            await this.asegurarTablaRoles(conexion);
            await this.asegurarTablaPermisos(conexion);
            await this.asegurarPermisosBase(conexion);
            await conexion.beginTransaction();

            const [resultado] = await conexion.query(
                `INSERT INTO roles (nombre, descripcion) VALUES (?, ?)`,
                [nombre, descripcion || null]
            );

            const rolId = (resultado as any).insertId;
            await this.guardarPermisosDeRol(conexion, rolId, permisos);

            await conexion.commit();
            return true;
        } catch (error) {
            await conexion.rollback();
            console.error("Error al crear rol:", error);
            return false;
        } finally {
            conexion.release();
        }
    }

    public async actualizar(id: number, nombre: string, descripcion: string, permisos: string[]): Promise<boolean> {
        const pool = getPool();
        const conexion = await pool.getConnection();

        try {
            await this.asegurarTablaRoles(conexion);
            await this.asegurarTablaPermisos(conexion);
            await this.asegurarPermisosBase(conexion);
            const [rolRows] = await conexion.query(
                `SELECT nombre FROM roles WHERE id = ?`,
                [id]
            );

            const rolActual = (rolRows as any[])[0];
            if (String(rolActual?.nombre || "").toUpperCase() === "ADMIN") {
                return false;
            }

            await conexion.beginTransaction();

            await conexion.query(
                `UPDATE roles SET nombre = ?, descripcion = ? WHERE id = ?`,
                [nombre, descripcion || null, id]
            );

            await conexion.query(
                `DELETE FROM rol_permisos WHERE rol_id = ?`,
                [id]
            );

            await this.guardarPermisosDeRol(conexion, id, permisos);

            await conexion.commit();
            return true;
        } catch (error) {
            await conexion.rollback();
            console.error("Error al actualizar rol:", error);
            return false;
        } finally {
            conexion.release();
        }
    }

    public async existeNombre(nombre: string, excluirId?: number): Promise<boolean> {
        const pool = getPool();
        const [rows] = await pool.query(
            `SELECT id FROM roles WHERE nombre = ?`,
            [nombre]
        );

        const coincidencias = rows as any[];
        if (coincidencias.length === 0) {
            return false;
        }

        if (excluirId && coincidencias[0].id === excluirId) {
            return false;
        }

        return true;
    }

    public async eliminar(id: number): Promise<{ ok: boolean; motivo?: string }> {
        const pool = getPool();
        await this.asegurarTablaRoles(pool);
        await this.asegurarTablaPermisos(pool);
        await this.asegurarPermisosBase(pool);
        const [rows] = await pool.query(
            `SELECT id, nombre, activo FROM roles WHERE id = ?`,
            [id]
        );

        const rol = (rows as any[])[0];
        if (!rol) {
            return { ok: false, motivo: "Rol no encontrado" };
        }

        if (String(rol.nombre || "").toUpperCase() === "ADMIN") {
            return { ok: false, motivo: "No se puede eliminar el rol ADMIN" };
        }

        if (!Boolean(rol.activo)) {
            return { ok: false, motivo: "El rol ya está eliminado" };
        }

        const [usoRows] = await pool.query(
            `SELECT COUNT(*) AS total FROM usuarios WHERE rol = ? AND activo = TRUE`,
            [rol.nombre]
        );

        const enUso = Number((usoRows as any[])[0]?.total || 0);
        if (enUso > 0) {
            return { ok: false, motivo: "No se puede eliminar un rol asignado a usuarios activos" };
        }

        await pool.query(`UPDATE roles SET activo = FALSE WHERE id = ?`, [id]);
        return { ok: true };
    }

    public async recuperar(id: number): Promise<{ ok: boolean; motivo?: string }> {
        const pool = getPool();
        await this.asegurarTablaRoles(pool);
        await this.asegurarTablaPermisos(pool);
        await this.asegurarPermisosBase(pool);

        const [rows] = await pool.query(
            `SELECT id, nombre, activo FROM roles WHERE id = ?`,
            [id]
        );

        const rol = (rows as any[])[0];
        if (!rol) {
            return { ok: false, motivo: "Rol no encontrado" };
        }

        if (Boolean(rol.activo)) {
            return { ok: false, motivo: "El rol ya está activo" };
        }

        await pool.query(`UPDATE roles SET activo = TRUE WHERE id = ?`, [id]);
        return { ok: true };
    }

    public async eliminarDefinitivo(id: number): Promise<{ ok: boolean; motivo?: string }> {
        const pool = getPool();
        await this.asegurarTablaRoles(pool);
        await this.asegurarTablaPermisos(pool);
        await this.asegurarPermisosBase(pool);

        const [rows] = await pool.query(
            `SELECT id, nombre FROM roles WHERE id = ?`,
            [id]
        );

        const rol = (rows as any[])[0];
        if (!rol) {
            return { ok: false, motivo: "Rol no encontrado" };
        }

        if (String(rol.nombre || "").toUpperCase() === "ADMIN") {
            return { ok: false, motivo: "No se puede eliminar definitivamente el rol ADMIN" };
        }

        const [usoRows] = await pool.query(
            `SELECT COUNT(*) AS total FROM usuarios WHERE rol = ?`,
            [rol.nombre]
        );

        const enUso = Number((usoRows as any[])[0]?.total || 0);
        if (enUso > 0) {
            return { ok: false, motivo: "No se puede eliminar definitivamente un rol asignado a usuarios" };
        }

        await pool.query(`DELETE FROM roles WHERE id = ?`, [id]);
        return { ok: true };
    }

    public construirRolDesdeRegistro(nombreRol: string, permisos: string[]): Rol {
        const permisoRaiz = new PermisoCompuesto(
            `PERMISOS_${nombreRol}`,
            `Permisos de ${nombreRol}`
        );

        const catalogoPorCodigo = new Map(
            this.obtenerCatalogoPermisos().map(p => [p.codigo, p.descripcion])
        );

        for (const codigo of permisos) {
            permisoRaiz.agregar(
                new PermisoAtomico(
                    codigo,
                    catalogoPorCodigo.get(codigo) || codigo
                )
            );
        }

        return new Rol(nombreRol, permisoRaiz);
    }

    private async guardarPermisosDeRol(conexion: any, rolId: number, permisos: string[]): Promise<void> {
        if (!permisos || permisos.length === 0) {
            return;
        }

        const catalogoPorCodigo = new Map(
            this.obtenerCatalogoPermisos().map(p => [p.codigo, p.descripcion])
        );

        for (const codigoPermiso of permisos) {
            await conexion.query(
                `INSERT INTO rol_permisos (rol_id, codigo_permiso, descripcion_permiso)
                 VALUES (?, ?, ?)`,
                [rolId, codigoPermiso, catalogoPorCodigo.get(codigoPermiso) || codigoPermiso]
            );
        }
    }

    private async asegurarTablaPermisos(executor: { query: (sql: string, values?: any[]) => Promise<any> }): Promise<void> {
        await executor.query(`
            CREATE TABLE IF NOT EXISTS rol_permisos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                rol_id INT NOT NULL,
                codigo_permiso VARCHAR(100) NOT NULL,
                descripcion_permiso VARCHAR(255),
                UNIQUE KEY uk_rol_permiso (rol_id, codigo_permiso),
                FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE
            )
        `);
    }

    private async asegurarTablaRoles(executor: { query: (sql: string, values?: any[]) => Promise<any> }): Promise<void> {
        await executor.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nombre VARCHAR(100) NOT NULL UNIQUE,
                descripcion VARCHAR(255),
                activo BOOLEAN DEFAULT TRUE
            )
        `);

        const [rows] = await executor.query(
            `SELECT COUNT(*) AS total
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'roles'
               AND COLUMN_NAME = 'activo'`
        );

        const existeActivo = Number((rows as any[])[0]?.total || 0) > 0;
        if (!existeActivo) {
            await executor.query(`ALTER TABLE roles ADD COLUMN activo BOOLEAN DEFAULT TRUE`);
        }

        await executor.query(`UPDATE roles SET nombre = UPPER(nombre)`);
        await executor.query(`UPDATE roles SET activo = TRUE WHERE activo IS NULL`);

        await executor.query(`
            INSERT IGNORE INTO roles (nombre, descripcion, activo) VALUES
            ('ADMIN', 'Administrador del sistema', TRUE)
        `);

        await executor.query(`
            UPDATE roles SET activo = TRUE WHERE UPPER(nombre) = 'ADMIN'
        `);
    }

    private async asegurarPermisosBase(executor: { query: (sql: string, values?: any[]) => Promise<any> }): Promise<void> {
        const [rolesRows] = await executor.query(
            `SELECT id, nombre FROM roles WHERE UPPER(nombre) IN ('ADMIN')`
        );

        const catalogoPorCodigo = new Map(
            this.obtenerCatalogoPermisos().map(p => [p.codigo, p.descripcion])
        );

        for (const row of rolesRows as any[]) {
            const nombreRol = String(row.nombre || "").toUpperCase();
            const permisosBase = RepositorioRol.PERMISOS_BASE_POR_ROL[nombreRol] || [];

            for (const codigoPermiso of permisosBase) {
                await executor.query(
                    `INSERT IGNORE INTO rol_permisos (rol_id, codigo_permiso, descripcion_permiso)
                     VALUES (?, ?, ?)`,
                    [row.id, codigoPermiso, catalogoPorCodigo.get(codigoPermiso) || codigoPermiso]
                );
            }
        }
    }
}
