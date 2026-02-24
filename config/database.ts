import mysql, { Pool } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool: Pool | null = null;

export async function initializePool(): Promise<Pool> {
    if (pool) return pool;
    
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_empresarial',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    
    console.log('✓ Pool MySQL conectado');
    return pool;
}

export function getPool(): Pool {
    if (!pool) {
        throw new Error('Pool no inicializado. Llama a initializePool() primero.');
    }
    return pool;
}
