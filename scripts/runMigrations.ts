import fs from 'fs';
import path from 'path';
import { getPool, initializePool } from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

async function runMigrations() {
    await initializePool();
    const pool = getPool();
    const migrationsDir = path.join(process.cwd(), 'migrations');

    try {
        console.log('🔄 Iniciando migraciones...');

        // Crear tabla de control de migraciones si no existe
        await pool.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INT PRIMARY KEY AUTO_INCREMENT,
                filename VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Leer archivos de migración
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        console.log(`📁 Se encontraron ${files.length} migraciones`);

        for (const file of files) {
            try {
                // Verificar si la migración ya fue ejecutada
                const [result] = await pool.query(
                    'SELECT * FROM migrations WHERE filename = ?',
                    [file]
                );

                const rows = result as any[];
                if (rows && rows.length > 0) {
                    console.log(`✅ ${file} - Ya ejecutada`);
                    continue;
                }

                // Leer y ejecutar la migración
                const filePath = path.join(migrationsDir, file);
                const sql = fs.readFileSync(filePath, 'utf-8');

                console.log(`⏳ Ejecutando ${file}...`);

                // Eliminar comentarios de una línea y dividir por ;
                const sqlSinComentarios = sql.replace(/^\s*--.*$/gm, '');

                const statements = sqlSinComentarios
                    .split(';')
                    .map(s => s.trim())
                    .filter(s => s.length > 0);

                for (const statement of statements) {
                    const statementNormalizado = statement.replace(/\s+/g, ' ').trim();

                    if (/^USE\s+/i.test(statementNormalizado)) {
                        console.log(`⏭️ Omitiendo sentencia USE en ${file}`);
                        continue;
                    }

                    if (/^CREATE\s+DATABASE\s+/i.test(statementNormalizado)) {
                        console.log(`⏭️ Omitiendo CREATE DATABASE en ${file}`);
                        continue;
                    }

                    await pool.query(statement);
                }

                // Registrar la migración como ejecutada
                await pool.query(
                    'INSERT INTO migrations (filename) VALUES (?)',
                    [file]
                );

                console.log(`✅ ${file} - Completada`);
            } catch (error) {
                console.error(`❌ Error en ${file}:`, (error as any).message);
                throw error;
            }
        }

        console.log('\n✨ ¡Todas las migraciones completadas exitosamente!');
    } catch (error) {
        console.error('❌ Error durante las migraciones:', error);
        process.exit(1);
    }
}

// Ejecutar migraciones
runMigrations();
