import { initializePool, getPool } from "../config/database";
import { RepositorioVenta } from "../Modelo/Repositorios/RepositorioVenta";

async function main(): Promise<void> {
    await initializePool();
    const pool = getPool();
    const repoVenta = RepositorioVenta.obtenerInstancia();

    const [productoRows] = await pool.query<any[]>(
        `SELECT id, nombre, stock
         FROM productos
         WHERE activo = 1 AND stock > 0
         ORDER BY id
         LIMIT 1`
    );

    const producto = (productoRows as any[])[0];
    if (!producto) {
        throw new Error("No hay productos activos con stock para probar ventas.");
    }

    const productoId = Number(producto.id);
    const stockAntes = Number(producto.stock);

    const venta = await repoVenta.crear("Cliente Smoke Test", [{ productoId, cantidad: 1 }], undefined);

    const [productoDespuesRows] = await pool.query<any[]>(
        `SELECT stock FROM productos WHERE id = ?`,
        [productoId]
    );

    const stockDespues = Number((productoDespuesRows as any[])[0]?.stock || 0);

    if (stockDespues !== stockAntes - 1) {
        throw new Error(
            `La venta no desconto stock correctamente. Stock antes: ${stockAntes}, despues: ${stockDespues}.`
        );
    }

    const [ventaRows] = await pool.query<any[]>(
        `SELECT id, total, cliente_nombre FROM ventas WHERE id = ?`,
        [venta.getId()]
    );

    if (!(ventaRows as any[]).length) {
        throw new Error("No se encontro la venta creada en base de datos.");
    }

    console.log("OK_SMOKE_VENTAS");
    console.log(`producto_id=${productoId}`);
    console.log(`stock_antes=${stockAntes}`);
    console.log(`stock_despues=${stockDespues}`);
    console.log(`venta_id=${venta.getId()}`);
    console.log(`venta_total=${Number(venta.getTotal()).toFixed(2)}`);
}

main().catch((error) => {
    console.error("ERROR_SMOKE_VENTAS", (error as any)?.message || error);
    process.exit(1);
});
