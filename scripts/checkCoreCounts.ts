import { initializePool, getPool } from "../config/database";

async function main(): Promise<void> {
    await initializePool();
    const pool = getPool();

    const tablas = [
        "usuarios",
        "roles",
        "productos",
        "proveedores",
        "ordenes_compra",
        "ventas",
        "ventas_items",
        "auditoria",
        "login_logout"
    ];

    for (const tabla of tablas) {
        const [rows] = await pool.query<any[]>(`SELECT COUNT(*) AS total FROM \`${tabla}\``);
        const total = Number((rows as any[])[0]?.total || 0);
        console.log(`${tabla}=${total}`);
    }
}

main().catch((error) => {
    console.error("ERROR_CHECK_COUNTS", (error as any)?.message || error);
    process.exit(1);
});
