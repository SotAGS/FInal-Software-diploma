import { Router } from "express";
import {
  mostrarReportes,
  mostrarDesempenioCompras,
  mostrarRotacionInventario,
  mostrarAuditoriaAccesos,
  mostrarProductosMasVendidos,
  mostrarVariacionPreciosCompra,
  mostrarResumenVentasMensual,
  mostrarBusquedaOrdenesPorFecha,
  descargarReportePdf,
  obtenerDesempenioCompras,
  obtenerRotacionInventario,
  obtenerAuditoriaAccesos,
  obtenerProductosMasVendidos,
  obtenerVariacionPreciosCompra,
  obtenerResumenVentasMensual,
} from "../Controladoras/controladoraReportes";
import { requierePermiso } from "../Middlewares/autenticacion";

const router = Router();

router.use(requierePermiso("VER_REPORTES"));

// Rutas de vistas
router.get("/", mostrarReportes);
router.get("/desempenio-compras", mostrarDesempenioCompras);
router.get("/rotacion-inventario", mostrarRotacionInventario);
router.get("/auditoria-accesos", mostrarAuditoriaAccesos);
router.get("/productos-mas-vendidos", mostrarProductosMasVendidos);
router.get("/variacion-precios-compra", mostrarVariacionPreciosCompra);
router.get("/resumen-ventas-mensual", mostrarResumenVentasMensual);
router.get("/busqueda-ordenes-fecha", mostrarBusquedaOrdenesPorFecha);
router.get("/pdf/:reporte", descargarReportePdf);

// API endpoints (JSON)
router.get("/api/desempenio-compras", obtenerDesempenioCompras);
router.get("/api/rotacion-inventario", obtenerRotacionInventario);
router.get("/api/auditoria-accesos", obtenerAuditoriaAccesos);
router.get("/api/productos-mas-vendidos", obtenerProductosMasVendidos);
router.get("/api/variacion-precios-compra", obtenerVariacionPreciosCompra);
router.get("/api/resumen-ventas-mensual", obtenerResumenVentasMensual);

export default router;