import { Usuario } from "../Entidades/Usuario";
import { Rol } from "../Entidades/Rol";
import { PermisoAtomico } from "../Seguridad/PermisoAtomico";
import { PermisoCompuesto } from "../Seguridad/PermisoCompuesto";
import { getPool } from "../../config/database";
import { RepositorioRol } from "./RepositorioRol";

export class RepositorioUsuario {

    private static roles: Map<string, Rol> = new Map();
    private static initialized = false;
    private static backupEmailVerificado = false;
    private static columnaPassword: "contrasena" | "password" | null = null;
    private repoRol = new RepositorioRol();

    constructor() {
        if (!RepositorioUsuario.initialized) {
            RepositorioUsuario.inicializarRoles();
            RepositorioUsuario.initialized = true;
        }
    }

    private async asegurarColumnaBackupEmail(): Promise<void> {
        if (RepositorioUsuario.backupEmailVerificado) {
            return;
        }

        const pool = getPool();
        const [rows] = await pool.query<any[]>(
            `SELECT COUNT(*) AS total
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'usuarios'
               AND COLUMN_NAME = 'backup_email'`
        );

        const existe = Number((rows as any[])[0]?.total || 0) > 0;
        if (!existe) {
            await pool.query(`ALTER TABLE usuarios ADD COLUMN backup_email VARCHAR(100) NULL`);
        }

        RepositorioUsuario.backupEmailVerificado = true;
    }

    private async obtenerColumnaPassword(): Promise<"contrasena" | "password"> {
        if (RepositorioUsuario.columnaPassword) {
            return RepositorioUsuario.columnaPassword;
        }

        const pool = getPool();
        const [rows] = await pool.query<any[]>(
            `SELECT COLUMN_NAME
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'usuarios'
               AND COLUMN_NAME IN ('contrasena', 'password')`
        );

        const columnas = (rows as any[]).map(r => String(r.COLUMN_NAME || '').toLowerCase());

        if (columnas.includes('password')) {
            RepositorioUsuario.columnaPassword = 'password';
            return 'password';
        }

        if (columnas.includes('contrasena')) {
            RepositorioUsuario.columnaPassword = 'contrasena';
            return 'contrasena';
        }

        throw new Error("No existe columna de contraseña en usuarios (se esperaba 'password' o 'contrasena')");
    }

    private static inicializarRoles() {
        if (RepositorioUsuario.roles.size > 0) return;

        /* ===========================
           PERMISOS ATÓMICOS
        =========================== */

        const crearProducto = new PermisoAtomico(
            "CREAR_PRODUCTO",
            "Crear producto"
        );

        const eliminarProducto = new PermisoAtomico(
            "ELIMINAR_PRODUCTO",
            "Eliminar producto"
        );

        const editarProducto = new PermisoAtomico(
            "EDITAR_PRODUCTO",
            "Editar producto"
        );

        const verStock = new PermisoAtomico(
            "VER_STOCK",
            "Ver stock"
        );

        const crearOrdenCompra = new PermisoAtomico(
            "CREAR_ORDEN_COMPRA",
            "Crear orden de compra"
        );

        const editarOrdenCompra = new PermisoAtomico(
            "EDITAR_ORDEN_COMPRA",
            "Editar orden de compra"
        );

        const verReportes = new PermisoAtomico(
            "VER_REPORTES",
            "Ver reportes"
        );

        const gestionarUsuarios = new PermisoAtomico(
            "GESTIONAR_USUARIOS",
            "Gestionar usuarios"
        );

        /* ===========================
           ROL ADMINISTRADOR
        =========================== */

        const permisosAdmin = new PermisoCompuesto(
            "PERMISOS_ADMIN",
            "Permisos del administrador"
        );

        permisosAdmin.agregar(crearProducto);
        permisosAdmin.agregar(eliminarProducto);
        permisosAdmin.agregar(editarProducto);
        permisosAdmin.agregar(verStock);
        permisosAdmin.agregar(crearOrdenCompra);
        permisosAdmin.agregar(editarOrdenCompra);
        permisosAdmin.agregar(verReportes);
        permisosAdmin.agregar(gestionarUsuarios);

        const rolAdmin = new Rol("ADMIN", permisosAdmin);

        /* ===========================
           ROL GERENTE
        =========================== */

        const permisosGerente = new PermisoCompuesto(
            "PERMISOS_GERENTE",
            "Permisos del gerente"
        );

        permisosGerente.agregar(verStock);
        permisosGerente.agregar(crearOrdenCompra);
        permisosGerente.agregar(editarOrdenCompra);
        permisosGerente.agregar(verReportes);
        permisosGerente.agregar(gestionarUsuarios); // El dueño también gestiona usuarios

        const rolGerente = new Rol("GERENTE", permisosGerente);

        /* ===========================
           ROL EMPLEADO
        =========================== */

        const permisosEmpleado = new PermisoCompuesto(
            "PERMISOS_EMPLEADO",
            "Permisos del empleado"
        );

        permisosEmpleado.agregar(verStock);

        const rolEmpleado = new Rol("EMPLEADO", permisosEmpleado);

        RepositorioUsuario.roles.set("ADMIN", rolAdmin);
        RepositorioUsuario.roles.set("GERENTE", rolGerente);
        RepositorioUsuario.roles.set("EMPLEADO", rolEmpleado);
    }

    /* ===========================
       OBTENER TODOS LOS USUARIOS
    =========================== */

    public async obtenerTodos(incluirInactivos: boolean = false): Promise<Usuario[]> {
        try {
            await this.asegurarColumnaBackupEmail();
            const columnaPassword = await this.obtenerColumnaPassword();
            const pool = getPool();
            const rolesDisponibles = await this.obtenerMapaRoles();
            const [rows] = await pool.query(
                `SELECT u.id, u.nombre, u.email, u.backup_email, u.${columnaPassword} AS password_hash, u.rol, u.activo
                 FROM usuarios u 
                 ${incluirInactivos ? "" : "WHERE u.activo = TRUE"}
                 ORDER BY u.nombre`
            );

            return (rows as any[]).map(row => {
                const rol = rolesDisponibles.get(row.rol) || RepositorioUsuario.roles.get("EMPLEADO")!;

                return new Usuario(
                    row.id,
                    row.nombre,
                    row.email,
                    row.password_hash,
                    rol,
                    Boolean(row.activo),
                    row.backup_email || null
                );
            });
        } catch (error) {
            console.error("Error en obtenerTodos:", error);
            return [];
        }
    }

    /* ===========================
       BUSCAR POR EMAIL
    =========================== */

    public async buscarPorEmail(email: string): Promise<Usuario | undefined> {
        try {
            await this.asegurarColumnaBackupEmail();
            const columnaPassword = await this.obtenerColumnaPassword();
            const pool = getPool();
            const rolesDisponibles = await this.obtenerMapaRoles();
            const [rows] = await pool.query(
                `SELECT u.id, u.nombre, u.email, u.backup_email, u.${columnaPassword} AS password_hash, u.rol 
                 FROM usuarios u 
                 WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(?)) AND u.activo = TRUE`,
                [email]
            );

            if ((rows as any[]).length === 0) return undefined;

            const row = (rows as any[])[0];
            return new Usuario(
                row.id,
                row.nombre,
                row.email,
                row.password_hash,
                rolesDisponibles.get(row.rol) || RepositorioUsuario.roles.get("EMPLEADO")!,
                true,
                row.backup_email || null
            );
        } catch (error) {
            console.error("Error en buscarPorEmail:", error);
            return undefined;
        }
    }

    public async buscarPorBackupEmail(backupEmail: string): Promise<Usuario | undefined> {
        try {
            await this.asegurarColumnaBackupEmail();
            const columnaPassword = await this.obtenerColumnaPassword();
            const pool = getPool();
            const rolesDisponibles = await this.obtenerMapaRoles();
            const [rows] = await pool.query(
                `SELECT u.id, u.nombre, u.email, u.backup_email, u.${columnaPassword} AS password_hash, u.rol, u.activo
                 FROM usuarios u
                 WHERE LOWER(TRIM(u.backup_email)) = LOWER(TRIM(?)) AND u.activo = TRUE`,
                [backupEmail]
            );

            if ((rows as any[]).length === 0) return undefined;

            const row = (rows as any[])[0];
            return new Usuario(
                row.id,
                row.nombre,
                row.email,
                row.password_hash,
                rolesDisponibles.get(row.rol) || RepositorioUsuario.roles.get("EMPLEADO")!,
                Boolean(row.activo),
                row.backup_email || null
            );
        } catch (error) {
            console.error("Error en buscarPorBackupEmail:", error);
            return undefined;
        }
    }

    /* ===========================
       BUSCAR POR ID
    =========================== */

    public async buscarPorId(id: number, incluirInactivos: boolean = false): Promise<Usuario | undefined> {
        try {
            await this.asegurarColumnaBackupEmail();
            const columnaPassword = await this.obtenerColumnaPassword();
            const pool = getPool();
            const rolesDisponibles = await this.obtenerMapaRoles();
            const [rows] = await pool.query(
                `SELECT u.id, u.nombre, u.email, u.backup_email, u.${columnaPassword} AS password_hash, u.rol, u.activo
                 FROM usuarios u
                 WHERE u.id = ? ${incluirInactivos ? "" : "AND u.activo = TRUE"}`,
                [id]
            );

            if ((rows as any[]).length === 0) return undefined;

            const row = (rows as any[])[0];
            return new Usuario(
                row.id,
                row.nombre,
                row.email,
                row.password_hash,
                rolesDisponibles.get(row.rol) || RepositorioUsuario.roles.get("EMPLEADO")!,
                Boolean(row.activo),
                row.backup_email || null
            );
        } catch (error) {
            console.error("Error en buscarPorId:", error);
            return undefined;
        }
    }

    public async obtenerNombresRoles(): Promise<string[]> {
        try {
            const nombres = await this.repoRol.obtenerNombresRoles();
            if (nombres.length > 0) {
                return nombres;
            }
        } catch (error) {
            console.error("Error al obtener roles desde BD:", error);
        }

        return Array.from(RepositorioUsuario.roles.keys());
    }

    /* ===========================
       CREAR USUARIO
    =========================== */

    public async crear(usuario: Usuario): Promise<boolean> {
        await this.asegurarColumnaBackupEmail();
        const columnaPassword = await this.obtenerColumnaPassword();
        const pool = getPool();
        await pool.query(
            `INSERT INTO usuarios (nombre, email, backup_email, ${columnaPassword}, rol, activo, fecha_creacion) 
             VALUES (?, ?, ?, ?, ?, TRUE, NOW())`,
            [usuario.getNombre(), usuario.getEmail(), usuario.getBackupEmail(), usuario.getPassword(), usuario.getRol().nombre]
        );
        return true;
    }

    /* ===========================
       ACTUALIZAR USUARIO
    =========================== */

    public async actualizar(usuario: Usuario): Promise<boolean> {
        try {
            await this.asegurarColumnaBackupEmail();
            const columnaPassword = await this.obtenerColumnaPassword();
            const pool = getPool();
            await pool.query(
                `UPDATE usuarios 
                 SET nombre = ?, email = ?, backup_email = ?, ${columnaPassword} = ?, rol = ? 
                 WHERE id = ?`,
                [usuario.getNombre(), usuario.getEmail(), usuario.getBackupEmail(), usuario.getPassword(), usuario.getRol().nombre, usuario.getId()]
            );
            return true;
        } catch (error) {
            console.error("Error en actualizar:", error);
            return false;
        }
    }

    /* ===========================
       ELIMINAR USUARIO (soft delete)
    =========================== */

    public async eliminar(id: number): Promise<boolean> {
        try {
            const pool = getPool();
            await pool.query(
                `UPDATE usuarios SET activo = FALSE WHERE id = ?`,
                [id]
            );
            return true;
        } catch (error) {
            console.error("Error al eliminar:", error);
            return false;
        }
    }

    public async recuperar(id: number): Promise<boolean> {
        try {
            const pool = getPool();
            await pool.query(
                `UPDATE usuarios SET activo = TRUE WHERE id = ?`,
                [id]
            );
            return true;
        } catch (error) {
            console.error("Error al recuperar:", error);
            return false;
        }
    }

    public async eliminarDefinitivo(id: number): Promise<boolean> {
        const pool = getPool();
        const conn = await pool.getConnection();

        try {
            await conn.beginTransaction();

            const [tablaLoginLogout] = await conn.query<any[]>(
                `SELECT COUNT(*) AS total
                 FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'login_logout'`
            );

            const [tablaAuditoria] = await conn.query<any[]>(
                `SELECT COUNT(*) AS total
                 FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'auditoria'`
            );

            const [tablaPasswordResets] = await conn.query<any[]>(
                `SELECT COUNT(*) AS total
                 FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_resets'`
            );

                        const [columnaUsuarioCreador] = await conn.query<any[]>(
                                `SELECT COUNT(*) AS total
                                 FROM information_schema.COLUMNS
                                 WHERE TABLE_SCHEMA = DATABASE()
                                     AND TABLE_NAME = 'ordenes_compra'
                                     AND COLUMN_NAME = 'usuario_creador_id'`
                        );

            const existeLoginLogout = Number((tablaLoginLogout as any[])[0]?.total || 0) > 0;
            const existeAuditoria = Number((tablaAuditoria as any[])[0]?.total || 0) > 0;
            const existePasswordResets = Number((tablaPasswordResets as any[])[0]?.total || 0) > 0;
            const existeColumnaUsuarioCreador = Number((columnaUsuarioCreador as any[])[0]?.total || 0) > 0;

            if (existeLoginLogout) {
                await conn.query(`DELETE FROM login_logout WHERE usuario_id = ?`, [id]);
            }

            if (existeAuditoria) {
                await conn.query(`DELETE FROM auditoria WHERE usuario_id = ?`, [id]);
            }

            if (existePasswordResets) {
                await conn.query(`DELETE FROM password_resets WHERE usuario_id = ?`, [id]);
            }

            if (existeColumnaUsuarioCreador) {
                await conn.query(
                    `UPDATE ordenes_compra SET usuario_creador_id = NULL WHERE usuario_creador_id = ?`,
                    [id]
                );
            }

            await conn.query(
                `DELETE FROM usuarios WHERE id = ?`,
                [id]
            );

            await conn.commit();
            return true;
        } catch (error) {
            await conn.rollback();
            console.error("Error al eliminar definitivamente:", error);
            return false;
        } finally {
            conn.release();
        }
    }

    private async obtenerMapaRoles(): Promise<Map<string, Rol>> {
        const rolesMap = new Map<string, Rol>(RepositorioUsuario.roles);

        try {
            const registros = await this.repoRol.obtenerTodos();
            for (const registro of registros) {
                rolesMap.set(
                    registro.nombre,
                    this.repoRol.construirRolDesdeRegistro(registro.nombre, registro.permisos)
                );
            }
        } catch (error) {
            console.error("Error al cargar roles dinámicos:", error);
        }

        return rolesMap;
    }
}
