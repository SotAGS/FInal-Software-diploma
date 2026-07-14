import { Router } from "express";
import {
    mostrarVentas,
    agregarAlCarritoVenta,
    quitarDelCarritoVenta,
    confirmarVenta
} from "../Controladoras/controladoraVentas";

const router = Router();

router.get("/", (req: any, res, next) => {
    const rol = req.usuario?.getRol()?.nombre;
    if (!["ADMIN", "GERENTE", "EMPLEADO"].includes(rol)) {
        return res.status(403).send("Acceso denegado");
    }

    next();
}, mostrarVentas);

router.post("/cart/add", agregarAlCarritoVenta);
router.post("/cart/remove", quitarDelCarritoVenta);
router.post("/confirmar", confirmarVenta);

export default router;
