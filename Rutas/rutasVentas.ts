import { Router } from "express";
import {
    mostrarVentas,
    agregarAlCarritoVenta,
    quitarDelCarritoVenta,
    confirmarVenta,
    mostrarTicketVenta
} from "../Controladoras/controladoraVentas";
import { requiereAlgunPermiso } from "../Middlewares/autenticacion";

const router = Router();

router.use(requiereAlgunPermiso(["CREAR_VENTA", "EDITAR_VENTA"]));

router.get("/", mostrarVentas);

router.post("/cart/add", agregarAlCarritoVenta);
router.post("/cart/remove", quitarDelCarritoVenta);
router.post("/confirmar", confirmarVenta);
router.get("/:ventaId/ticket", mostrarTicketVenta);

export default router;
