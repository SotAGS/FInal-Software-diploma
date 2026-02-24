import { Usuario } from "../Entidades/Usuario";
import { Rol } from "../Entidades/Rol";
import { PermisoAtomico } from "../Seguridad/PermisoAtomico";
import { PermisoCompuesto } from "../Seguridad/PermisoCompuesto";
import { getPool } from "../../config/database";
import { RepositorioRol } from "./RepositorioRol";

export class RepositorioUsuario {

    private static roles: Map<string, Rol> = new Map();
    private static initialized = false;
    private repoRol = new RepositorioRol();

    constructor() {
        if (!RepositorioUsuario.initialized) {
            RepositorioUsuario.inicializarRoles();
            RepositorioUsuario.initialized = true;
        }
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

    public async obtenerTodos(): Promise<Usuario[]> {
        try {
            const pool = getPool();
            const rolesDisponibles = await this.obtenerMapaRoles();
            const [rows] = await pool.query(
                `SELECT u.id, u.nombre, u.email, u.contrasena, u.rol 
                 FROM usuarios u 
                 WHERE u.activo = TRUE 
                 ORDER BY u.nombre`
            );

            return (rows as any[]).map(row => {
                const rol = rolesDisponibles.get(row.rol) || RepositorioUsuario.roles.get("EMPLEADO")!;

                return new Usuario(
                    row.id,
                    row.nombre,
                    row.email,
                    row.contrasena,
                    rol
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
            const pool = getPool();
            const rolesDisponibles = await this.obtenerMapaRoles();
            const [rows] = await pool.query(
                `SELECT u.id, u.nombre, u.email, u.contrasena, u.rol 
                 FROM usuarios u 
                 WHERE u.email = ? AND u.activo = TRUE`,
                [email]
            );

            if ((rows as any[]).length === 0) return undefined;

            const row = (rows as any[])[0];
            return new Usuario(
                row.id,
                row.nombre,
                row.email,
                row.contrasena,
                rolesDisponibles.get(row.rol) || RepositorioUsuario.roles.get("EMPLEADO")!
            );
        } catch (error) {
            console.error("Error en buscarPorEmail:", error);
            return undefined;
        }
    }

    /* ===========================
       BUSCAR POR ID
    =========================== */

    public async buscarPorId(id: number): Promise<Usuario | undefined> {
        try {
            const pool = getPool();
            const rolesDisponibles = await this.obtenerMapaRoles();
            const [rows] = await pool.query(
                `SELECT u.id, u.nombre, u.email, u.contrasena, u.rol
                 FROM usuarios u
                 WHERE u.id = ? AND u.activo = TRUE`,
                [id]
            );

            if ((rows as any[]).length === 0) return undefined;

            const row = (rows as any[])[0];
            return new Usuario(
                row.id,
                row.nombre,
                row.email,
                row.contrasena,
                rolesDisponibles.get(row.rol) || RepositorioUsuario.roles.get("EMPLEADO")!
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
        const pool = getPool();
        await pool.query(
            `INSERT INTO usuarios (nombre, email, contrasena, rol, activo, fecha_creacion) 
             VALUES (?, ?, ?, ?, TRUE, NOW())`,
            [usuario.getNombre(), usuario.getEmail(), usuario.getPassword(), usuario.getRol().nombre]
        );
        return true;
    }

    /* ===========================
       ACTUALIZAR USUARIO
    =========================== */

    public async actualizar(usuario: Usuario): Promise<boolean> {
        try {
            const pool = getPool();
            await pool.query(
                `UPDATE usuarios 
                 SET nombre = ?, email = ?, contrasena = ?, rol = ? 
                 WHERE id = ?`,
                [usuario.getNombre(), usuario.getEmail(), usuario.getPassword(), usuario.getRol().nombre, usuario.getId()]
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
