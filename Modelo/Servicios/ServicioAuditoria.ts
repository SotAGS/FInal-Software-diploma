import { getPool } from "../../config/database";

export class ServicioAuditoria {
  private static instancia: ServicioAuditoria;

  private constructor() {}

  public static obtenerInstancia(): ServicioAuditoria {
    if (!ServicioAuditoria.instancia) {
      ServicioAuditoria.instancia = new ServicioAuditoria();
    }
    return ServicioAuditoria.instancia;
  }

  /**
   * Registra un cambio en la auditoría
   */
  async registrarCambio(
    entidad: string,
    idEntidad: number | null,
    accion: string,
    idUsuario: number,
    valorAnterior: any = null,
    valorNuevo: any = null,
    referencia?: string
  ): Promise<void> {
    try {
      const pool = getPool();
      const valorAntJSON = valorAnterior ? JSON.stringify(valorAnterior) : null;
      const valorNuevoJSON = valorNuevo ? JSON.stringify(valorNuevo) : null;

      await pool.query(
        `INSERT INTO auditoria (entidad, id_entidad, accion, usuario_id, valor_anterior, valor_nuevo, referencia)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [entidad, idEntidad, accion, idUsuario, valorAntJSON, valorNuevoJSON, referencia || null]
      );

      console.log(`✅ [AUDITORÍA] ${accion} en ${entidad} #${idEntidad}`);
    } catch (error) {
      console.error("❌ Error registrando auditoría:", (error as any).message);
    }
  }

  /**
   * Registra un login exitoso
   */
  async registrarLogin(idUsuario: number): Promise<void> {
    try {
      const pool = getPool();
      await pool.query(
        `INSERT INTO login_logout (usuario_id, tipo_evento) VALUES (?, 'LOGIN')`,
        [idUsuario]
      );
      console.log(`✅ [LOGIN] Usuario ${idUsuario}`);
    } catch (error) {
      console.error("❌ Error registrando login:", (error as any).message);
    }
  }

  /**
   * Registra un logout
   */
  async registrarLogout(idUsuario: number): Promise<void> {
    try {
      const pool = getPool();
      await pool.query(
        `INSERT INTO login_logout (usuario_id, tipo_evento) VALUES (?, 'LOGOUT')`,
        [idUsuario]
      );
      console.log(`✅ [LOGOUT] Usuario ${idUsuario}`);
    } catch (error) {
      console.error("❌ Error registrando logout:", (error as any).message);
    }
  }

  /**
   * Registra un intento de login fallido
   */
  async registrarLoginFallido(email: string, motivo: string = "Credenciales inválidas"): Promise<void> {
    try {
      const pool = getPool();
      
      // Obtener ID del usuario si existe
      const [[usuario]] = await pool.query(
        `SELECT id FROM usuarios WHERE email = ?`,
        [email]
      ) as any;

      const usuarioId = usuario ? usuario.id : null;

      await pool.query(
        `INSERT INTO login_logout (usuario_id, tipo_evento, detalle) VALUES (?, 'LOGIN_FAIL', ?)`,
        [usuarioId, motivo]
      );
      console.log(`⚠️  [LOGIN_FAIL] Email: ${email}`);
    } catch (error) {
      console.error("❌ Error registrando login fallido:", (error as any).message);
    }
  }

  /**
   * Obtener auditorías de una entidad
   */
  async obtenerAuditoria(entidad: string, idEntidad?: number): Promise<any[]> {
    try {
      const pool = getPool();
      let query = `SELECT a.*, u.nombre as usuario_nombre FROM auditoria a 
                   LEFT JOIN usuarios u ON a.usuario_id = u.id 
                   WHERE a.entidad = ?`;
      const params: any[] = [entidad];

      if (idEntidad) {
        query += ` AND a.id_entidad = ?`;
        params.push(idEntidad);
      }

      query += ` ORDER BY a.fecha DESC LIMIT 100`;

      const [rows] = await pool.query(query, params);
      return rows as any[];
    } catch (error) {
      console.error("❌ Error obteniendo auditoría:", (error as any).message);
      return [];
    }
  }

  /**
   * Obtener logins/logouts
   */
  async obtenerAccesos(dias: number = 30): Promise<any[]> {
    try {
      const pool = getPool();
      const [rows] = await pool.query(
        `SELECT ll.*, u.email, u.nombre 
         FROM login_logout ll
         LEFT JOIN usuarios u ON ll.usuario_id = u.id
         WHERE ll.fecha_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
         ORDER BY ll.fecha_hora DESC`,
        [dias]
      );
      return rows as any[];
    } catch (error) {
      console.error("❌ Error obteniendo accesos:", (error as any).message);
      return [];
    }
  }
}
