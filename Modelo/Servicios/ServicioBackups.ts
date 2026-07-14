import fs from "fs";
import path from "path";
import mysql from "mysql2";
import { getPool } from "../../config/database";

export interface ArchivoBackup {
    nombre: string;
    rutaAbsoluta: string;
    tamanioBytes: number;
    fechaModificacion: Date;
}

interface RegistroTabla {
    nombre: string;
}

export class ServicioBackups {
    private static instancia: ServicioBackups;
    private static readonly TABLAS_EXCLUIDAS = new Set<string>(["migrations"]);
    private readonly directorioBackups: string;

    private constructor() {
        this.directorioBackups = path.join(process.cwd(), "backups");
    }

    public static obtenerInstancia(): ServicioBackups {
        if (!ServicioBackups.instancia) {
            ServicioBackups.instancia = new ServicioBackups();
        }

        return ServicioBackups.instancia;
    }

    public listarBackups(): ArchivoBackup[] {
        if (!fs.existsSync(this.directorioBackups)) {
            return [];
        }

        return fs
            .readdirSync(this.directorioBackups)
            .filter(nombre => nombre.toLowerCase().endsWith(".sql"))
            .map(nombre => {
                const rutaAbsoluta = path.join(this.directorioBackups, nombre);
                const stats = fs.statSync(rutaAbsoluta);

                return {
                    nombre,
                    rutaAbsoluta,
                    tamanioBytes: stats.size,
                    fechaModificacion: stats.mtime
                };
            })
            .sort((a, b) => b.fechaModificacion.getTime() - a.fechaModificacion.getTime());
    }

    public async crearBackup(nombreOpcional?: string): Promise<ArchivoBackup> {
        this.asegurarDirectorioBackups();
        const pool = getPool();

        const timestamp = this.formatearTimestamp(new Date());
        const sufijo = this.limpiarNombreArchivo(nombreOpcional || "");
        const nombreArchivo = sufijo
            ? `backup-${timestamp}-${sufijo}.sql`
            : `backup-${timestamp}.sql`;

        const rutaArchivo = path.join(this.directorioBackups, nombreArchivo);
        const tablas = await this.obtenerTablasBase();

        let contenido = "";
        contenido += "-- Backup generado desde la aplicacion\n";
        contenido += `-- Fecha: ${new Date().toISOString()}\n\n`;
        contenido += "SET FOREIGN_KEY_CHECKS = 0;\n\n";

        for (const tabla of tablas) {
            const [createRows] = await pool.query<any[]>(`SHOW CREATE TABLE \`${tabla.nombre}\``);
            const createTable = String((createRows as any[])[0]?.["Create Table"] || "").trim();

            contenido += `-- Estructura y datos de ${tabla.nombre}\n`;
            contenido += `DROP TABLE IF EXISTS \`${tabla.nombre}\`;\n`;
            contenido += `${createTable};\n\n`;

            const [dataRows] = await pool.query<any[]>(`SELECT * FROM \`${tabla.nombre}\``);
            contenido += this.serializarInsert(tabla.nombre, dataRows as any[]);
            contenido += "\n";
        }

        contenido += "SET FOREIGN_KEY_CHECKS = 1;\n";

        fs.writeFileSync(rutaArchivo, contenido, "utf8");

        const stats = fs.statSync(rutaArchivo);
        return {
            nombre: nombreArchivo,
            rutaAbsoluta: rutaArchivo,
            tamanioBytes: stats.size,
            fechaModificacion: stats.mtime
        };
    }

    public async limpiarDatosSistema(): Promise<number> {
        const pool = getPool();
        const tablas = await this.obtenerTablasBase();

        await pool.query("SET FOREIGN_KEY_CHECKS = 0");

        for (const tabla of tablas) {
            await pool.query(`DELETE FROM \`${tabla.nombre}\``);
        }

        await pool.query("SET FOREIGN_KEY_CHECKS = 1");
        return tablas.length;
    }

    public async restaurarUltimoBackup(): Promise<string> {
        const backups = this.listarBackups();
        if (!backups.length) {
            throw new Error("No hay backups disponibles para restaurar.");
        }

        await this.restaurarDesdeRuta(backups[0].rutaAbsoluta);
        return backups[0].nombre;
    }

    public async restaurarBackupPorNombre(nombreArchivo: string): Promise<void> {
        const nombreLimpio = path.basename(nombreArchivo || "").trim();
        const coincidencia = this.listarBackups().find(b => b.nombre === nombreLimpio);

        if (!coincidencia) {
            throw new Error("El backup seleccionado no existe.");
        }

        await this.restaurarDesdeRuta(coincidencia.rutaAbsoluta);
    }

    private async restaurarDesdeRuta(rutaArchivo: string): Promise<void> {
        const pool = getPool();

        if (!fs.existsSync(rutaArchivo)) {
            throw new Error("No se encontro el archivo de backup.");
        }

        const contenido = fs.readFileSync(rutaArchivo, "utf8");
        const sinComentarios = contenido
            .split("\n")
            .filter(linea => !linea.trim().startsWith("--"))
            .join("\n");

        const sentencias = this.dividirSentenciasSQL(sinComentarios);

        for (const sentencia of sentencias) {
            await pool.query(sentencia);
        }
    }

    private asegurarDirectorioBackups(): void {
        if (!fs.existsSync(this.directorioBackups)) {
            fs.mkdirSync(this.directorioBackups, { recursive: true });
        }
    }

    private limpiarNombreArchivo(nombre: string): string {
        return String(nombre || "").replace(/[^a-zA-Z0-9-_]/g, "").trim();
    }

    private formatearTimestamp(fecha: Date): string {
        const yyyy = fecha.getFullYear();
        const mm = String(fecha.getMonth() + 1).padStart(2, "0");
        const dd = String(fecha.getDate()).padStart(2, "0");
        const hh = String(fecha.getHours()).padStart(2, "0");
        const min = String(fecha.getMinutes()).padStart(2, "0");
        const ss = String(fecha.getSeconds()).padStart(2, "0");

        return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
    }

    private async obtenerTablasBase(): Promise<RegistroTabla[]> {
        const pool = getPool();
        const [rows] = await pool.query<any[]>("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");

        return (rows as any[])
            .map((row: any) => ({ nombre: String(Object.values(row)[0]) }))
            .filter((tabla: RegistroTabla) => !ServicioBackups.TABLAS_EXCLUIDAS.has(tabla.nombre));
    }

    private serializarInsert(tabla: string, rows: any[]): string {
        if (!rows.length) {
            return "";
        }

        const columnas = Object.keys(rows[0]);
        const columnasSql = columnas.map(col => `\`${col}\``).join(", ");

        const valoresSql = rows
            .map((row: any) => {
                const valores = columnas.map(col => mysql.escape(row[col]));
                return `(${valores.join(", ")})`;
            })
            .join(",\n");

        return `INSERT INTO \`${tabla}\` (${columnasSql}) VALUES\n${valoresSql};\n`;
    }

    private dividirSentenciasSQL(sql: string): string[] {
        const sentencias: string[] = [];
        let actual = "";
        let enComillaSimple = false;
        let enComillaDoble = false;
        let enBacktick = false;

        for (let i = 0; i < sql.length; i++) {
            const char = sql[i];
            const prev = i > 0 ? sql[i - 1] : "";

            if (char === "'" && !enComillaDoble && !enBacktick && prev !== "\\") {
                enComillaSimple = !enComillaSimple;
                actual += char;
                continue;
            }

            if (char === '"' && !enComillaSimple && !enBacktick && prev !== "\\") {
                enComillaDoble = !enComillaDoble;
                actual += char;
                continue;
            }

            if (char === "`" && !enComillaSimple && !enComillaDoble) {
                enBacktick = !enBacktick;
                actual += char;
                continue;
            }

            if (char === ";" && !enComillaSimple && !enComillaDoble && !enBacktick) {
                const sentencia = actual.trim();
                if (sentencia) {
                    sentencias.push(sentencia);
                }
                actual = "";
                continue;
            }

            actual += char;
        }

        const remanente = actual.trim();
        if (remanente) {
            sentencias.push(remanente);
        }

        return sentencias;
    }
}
