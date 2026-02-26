import { getPool } from "../../config/database";

export class ServicioAuditoria {
  private static instancia: ServicioAuditoria;
  private loginLogoutConfig:
    | {
        campoTipo: "tipo" | "tipo_evento";
        campoFecha: "fecha_hora" | "fecha";
        tieneEmail: boolean;
      }
    | null = null;

  private constructor() {}

  public static obtenerInstancia(): ServicioAuditoria {
    if (!ServicioAuditoria.instancia) {
      ServicioAuditoria.instancia = new ServicioAuditoria();
    }
    return ServicioAuditoria.instancia;
  }

  private async obtenerConfigLoginLogout(): Promise<{
    campoTipo: "tipo" | "tipo_evento";
    campoFecha: "fecha_hora" | "fecha";
    tieneEmail: boolean;
  }> {
    if (this.loginLogoutConfig) {
      return this.loginLogoutConfig;
    }

    const pool = getPool();
    const [tableRows] = await pool.query<any[]>(
      `SELECT COUNT(*) AS total
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'login_logout'`
    );

    const existeTabla = Number((tableRows as any[])[0]?.total || 0) > 0;
    if (!existeTabla) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS login_logout (
          id INT PRIMARY KEY AUTO_INCREMENT,
          usuario_id INT NULL,
          email VARCHAR(100) NULL,
          tipo VARCHAR(20) NOT NULL,
          detalle VARCHAR(255) NULL,
          fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_login_logout_fecha_hora (fecha_hora),
          INDEX idx_login_logout_tipo (tipo),
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
        )
      `);
    }

    const [columnRows] = await pool.query<any[]>(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'login_logout'`
    );

    const columnas = new Set((columnRows as any[]).map((row: any) => String(row.COLUMN_NAME)));

    this.loginLogoutConfig = {
      campoTipo: columnas.has("tipo") ? "tipo" : "tipo_evento",
      campoFecha: columnas.has("fecha_hora") ? "fecha_hora" : "fecha",
      tieneEmail: columnas.has("email")
    };

    return this.loginLogoutConfig;
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
      const config = await this.obtenerConfigLoginLogout();
      const [[usuario]] = await pool.query(
        `SELECT email FROM usuarios WHERE id = ?`,
        [idUsuario]
      ) as any;

      if (config.tieneEmail) {
        await pool.query(
          `INSERT INTO login_logout (usuario_id, email, ${config.campoTipo}) VALUES (?, ?, 'LOGIN')`,
          [idUsuario, usuario?.email || null]
        );
      } else {
        await pool.query(
          `INSERT INTO login_logout (usuario_id, ${config.campoTipo}) VALUES (?, 'LOGIN')`,
          [idUsuario]
        );
      }
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
      const config = await this.obtenerConfigLoginLogout();
      const [[usuario]] = await pool.query(
        `SELECT email FROM usuarios WHERE id = ?`,
        [idUsuario]
      ) as any;

      const usuarioIdRegistro = usuario ? idUsuario : null;
      const emailRegistro = usuario?.email || null;

      if (config.tieneEmail) {
        await pool.query(
          `INSERT INTO login_logout (usuario_id, email, ${config.campoTipo}) VALUES (?, ?, 'LOGOUT')`,
          [usuarioIdRegistro, emailRegistro]
        );
      } else {
        await pool.query(
          `INSERT INTO login_logout (usuario_id, ${config.campoTipo}) VALUES (?, 'LOGOUT')`,
          [usuarioIdRegistro]
        );
      }
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
      const config = await this.obtenerConfigLoginLogout();
      
      // Obtener ID del usuario si existe
      const [[usuario]] = await pool.query(
        `SELECT id FROM usuarios WHERE email = ?`,
        [email]
      ) as any;

      const usuarioId = usuario ? usuario.id : null;

      if (config.tieneEmail) {
        await pool.query(
          `INSERT INTO login_logout (usuario_id, email, ${config.campoTipo}, detalle) VALUES (?, ?, 'LOGIN_FAIL', ?)`,
          [usuarioId, email, motivo]
        );
      } else {
        await pool.query(
          `INSERT INTO login_logout (usuario_id, ${config.campoTipo}, detalle) VALUES (?, 'LOGIN_FAIL', ?)`,
          [usuarioId, motivo]
        );
      }
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
      const config = await this.obtenerConfigLoginLogout();
      const [rows] = await pool.query(
        `SELECT ll.*, ll.${config.campoTipo} AS tipo_evento_normalizado, u.email, u.nombre 
         FROM login_logout ll
         LEFT JOIN usuarios u ON ll.usuario_id = u.id
         WHERE ll.${config.campoFecha} >= DATE_SUB(NOW(), INTERVAL ? DAY)
         ORDER BY ll.${config.campoFecha} DESC`,
        [dias]
      );
      return rows as any[];
    } catch (error) {
      console.error("❌ Error obteniendo accesos:", (error as any).message);
      return [];
    }
  }
}
