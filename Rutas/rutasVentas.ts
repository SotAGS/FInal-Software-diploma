import { Router } from "express";
import { mostrarVentas } from "../Controladoras/controladoraVentas";

const router = Router();

router.get("/", (req: any, res, next) => {
    const rol = req.usuario?.getRol()?.nombre;
    if (!["ADMIN", "GERENTE", "EMPLEADO"].includes(rol)) {
        return res.status(403).send("Acceso denegado");
    }

    next();
}, mostrarVentas);

export default router;
