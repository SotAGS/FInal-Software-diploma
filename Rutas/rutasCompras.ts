import { Router } from "express";
import {
    listarOrdenes,
    mostrarCrearOrden,
    crearOrden,
    agregarAlCarrito,
    quitarDelCarrito,
    recibirProducto,
    cancelarOrden,
    cerrarConFaltante,
    cerrarOrden,
    mostrarEspecificarFaltante,
    guardarFaltantes
} from "../Controladoras/controladoraCompras";
import { requiereAlgunPermiso } from "../Middlewares/autenticacion";

const router = Router();

router.use(requiereAlgunPermiso(["CREAR_ORDEN_COMPRA", "EDITAR_ORDEN_COMPRA"]));

router.get("/", listarOrdenes);
router.get("/crear", mostrarCrearOrden);
router.post("/cart/add", agregarAlCarrito);
router.post("/cart/remove", quitarDelCarrito);
router.post("/crear", crearOrden);
router.post("/recibir/:id", recibirProducto);
router.post("/cancelar/:id", cancelarOrden);
router.get("/faltante/:id", mostrarEspecificarFaltante);
router.post("/faltante/:id", guardarFaltantes);
router.post("/cerrarConFaltante/:id", cerrarConFaltante);
router.post("/cerrar/:id", cerrarOrden);

export default router;