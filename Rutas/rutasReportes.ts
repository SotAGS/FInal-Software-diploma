import { Router } from "express";
import {
  mostrarReportes,
  mostrarDesempenioCompras,
  mostrarRotacionInventario,
  mostrarAuditoriaAccesos,
  mostrarBusquedaOrdenesPorFecha,
  descargarReportePdf,
  obtenerDesempenioCompras,
  obtenerRotacionInventario,
  obtenerAuditoriaAccesos,
} from "../Controladoras/controladoraReportes";
import { requierePermiso } from "../Middlewares/autenticacion";

const router = Router();

router.use(requierePermiso("VER_REPORTES"));

// Rutas de vistas
router.get("/", mostrarReportes);
router.get("/desempenio-compras", mostrarDesempenioCompras);
router.get("/rotacion-inventario", mostrarRotacionInventario);
router.get("/auditoria-accesos", mostrarAuditoriaAccesos);
router.get("/busqueda-ordenes-fecha", mostrarBusquedaOrdenesPorFecha);
router.get("/pdf/:reporte", descargarReportePdf);

// API endpoints (JSON)
router.get("/api/desempenio-compras", obtenerDesempenioCompras);
router.get("/api/rotacion-inventario", obtenerRotacionInventario);
router.get("/api/auditoria-accesos", obtenerAuditoriaAccesos);

export default router;