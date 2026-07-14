import fs from "fs";
import path from "path";
import mysql from "mysql2";
import { initializePool, getPool } from "../config/database";

const DIRECTORIO_BACKUPS = path.join(process.cwd(), "backups");
const TABLAS_EXCLUIDAS = new Set<string>(["migrations"]);

function obtenerArgumento(flag: string): string | undefined {
    const args = process.argv.slice(2);
    const index = args.findIndex(arg => arg === flag || arg.startsWith(`${flag}=`));

    if (index === -1) {
        return undefined;
    }

    if (args[index].includes("=")) {
        return args[index].split("=").slice(1).join("=").trim();
    }

    return args[index + 1]?.trim();
}

function limpiarNombreArchivo(nombre: string): string {
    return nombre.replace(/[^a-zA-Z0-9-_]/g, "").trim();
}

function formatearTimestamp(fecha: Date): string {
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, "0");
    const dd = String(fecha.getDate()).padStart(2, "0");
    const hh = String(fecha.getHours()).padStart(2, "0");
    const min = String(fecha.getMinutes()).padStart(2, "0");
    const ss = String(fecha.getSeconds()).padStart(2, "0");

    return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

async function obtenerTablasBase(): Promise<string[]> {
    const pool = getPool();
    const [rows] = await pool.query<any[]>("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");

    return (rows as any[])
        .map((row: any) => String(Object.values(row)[0]))
        .filter((table: string) => !TABLAS_EXCLUIDAS.has(table));
}

function serializarInsert(tabla: string, rows: any[]): string {
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

async function crearBackup(): Promise<void> {
    await initializePool();
    const pool = getPool();

    if (!fs.existsSync(DIRECTORIO_BACKUPS)) {
        fs.mkdirSync(DIRECTORIO_BACKUPS, { recursive: true });
    }

    const nombreCustom = limpiarNombreArchivo(obtenerArgumento("--name") || "");
    const nombreArchivo = nombreCustom
        ? `backup-${formatearTimestamp(new Date())}-${nombreCustom}.sql`
        : `backup-${formatearTimestamp(new Date())}.sql`;

    const rutaArchivo = path.join(DIRECTORIO_BACKUPS, nombreArchivo);
    const tablas = await obtenerTablasBase();

    let contenido = "";
    contenido += "-- Backup completo generado por scripts/backupDatabase.ts\n";
    contenido += `-- Fecha: ${new Date().toISOString()}\n\n`;
    contenido += "SET FOREIGN_KEY_CHECKS = 0;\n\n";

    for (const tabla of tablas) {
        const [createRows] = await pool.query<any[]>(`SHOW CREATE TABLE \`${tabla}\``);
        const createTable = String((createRows as any[])[0]?.["Create Table"] || "").trim();

        contenido += `-- Estructura y datos de ${tabla}\n`;
        contenido += `DROP TABLE IF EXISTS \`${tabla}\`;\n`;
        contenido += `${createTable};\n\n`;

        const [dataRows] = await pool.query<any[]>(`SELECT * FROM \`${tabla}\``);
        contenido += serializarInsert(tabla, dataRows as any[]);
        contenido += "\n";
    }

    contenido += "SET FOREIGN_KEY_CHECKS = 1;\n";

    fs.writeFileSync(rutaArchivo, contenido, "utf8");

    console.log("Backup creado correctamente:");
    console.log(rutaArchivo);
    console.log(`Tablas incluidas: ${tablas.length}`);
}

async function limpiarDatos(): Promise<void> {
    await initializePool();
    const pool = getPool();
    const tablas = await obtenerTablasBase();

    await pool.query("SET FOREIGN_KEY_CHECKS = 0");

    for (const tabla of tablas) {
        await pool.query(`DELETE FROM \`${tabla}\``);
        console.log(`Datos borrados: ${tabla}`);
    }

    await pool.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("Limpieza completa finalizada.");
}

function dividirSentenciasSQL(sql: string): string[] {
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

function obtenerUltimoBackup(): string {
    if (!fs.existsSync(DIRECTORIO_BACKUPS)) {
        throw new Error("No existe la carpeta backups.");
    }

    const backups = fs
        .readdirSync(DIRECTORIO_BACKUPS)
        .filter(nombre => nombre.toLowerCase().endsWith(".sql"))
        .sort();

    if (!backups.length) {
        throw new Error("No se encontraron archivos .sql en backups.");
    }

    return path.join(DIRECTORIO_BACKUPS, backups[backups.length - 1]);
}

async function restaurarBackup(): Promise<void> {
    await initializePool();
    const pool = getPool();

    const fileArg = obtenerArgumento("--file");
    const rutaArchivo = fileArg
        ? path.isAbsolute(fileArg)
            ? fileArg
            : path.join(process.cwd(), fileArg)
        : obtenerUltimoBackup();

    if (!fs.existsSync(rutaArchivo)) {
        throw new Error(`No existe el backup indicado: ${rutaArchivo}`);
    }

    const contenido = fs.readFileSync(rutaArchivo, "utf8");
    const sinComentarios = contenido
        .split("\n")
        .filter(linea => !linea.trim().startsWith("--"))
        .join("\n");

    const sentencias = dividirSentenciasSQL(sinComentarios);

    for (const sentencia of sentencias) {
        await pool.query(sentencia);
    }

    console.log("Backup restaurado correctamente desde:");
    console.log(rutaArchivo);
    console.log(`Sentencias ejecutadas: ${sentencias.length}`);
}

async function main() {
    const accion = (process.argv[2] || "").toLowerCase();

    if (accion === "create") {
        await crearBackup();
        return;
    }

    if (accion === "clear-data") {
        await limpiarDatos();
        return;
    }

    if (accion === "restore") {
        await restaurarBackup();
        return;
    }

    console.log("Uso:");
    console.log("  npm run backup:create -- --name=pre-examen");
    console.log("  npm run backup:clear");
    console.log("  npm run backup:restore -- --file=backups/archivo.sql");
    console.log("  npm run backup:restore   (restaura el ultimo backup)");
}

main().catch(error => {
    console.error("Error en backupDatabase:", (error as any)?.message || error);
    process.exit(1);
});
