import mysql, { Pool } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool: Pool | null = null;

const obtenerNumeroPuerto = (valor?: string): number => {
    const numero = Number(valor);
    return Number.isFinite(numero) && numero > 0 ? numero : 3306;
};

export async function initializePool(): Promise<Pool> {
    if (pool) return pool;

    const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL;

    if (databaseUrl) {
        pool = mysql.createPool(databaseUrl);
        console.log('✓ Pool MySQL conectado por URL');
        return pool;
    }

    const host = process.env.DB_HOST || process.env.MYSQLHOST || 'localhost';
    const user = process.env.DB_USER || process.env.MYSQLUSER || 'root';
    const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '';
    const database = process.env.DB_NAME || process.env.MYSQLDATABASE || 'gestion_empresarial';
    const port = obtenerNumeroPuerto(process.env.DB_PORT || process.env.MYSQLPORT);
    
    pool = mysql.createPool({
        host,
        user,
        password,
        database,
        port,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    
    console.log(`✓ Pool MySQL conectado (${host}:${port}/${database})`);
    return pool;
}

export function getPool(): Pool {
    if (!pool) {
        throw new Error('Pool no inicializado. Llama a initializePool() primero.');
    }
    return pool;
}
