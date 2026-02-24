import { Router } from "express";
import {
    listarRoles,
    mostrarFormularioCrearRol,
    crearRol,
    mostrarFormularioEditarRol,
    actualizarRol,
    eliminarRol
} from "../Controladoras/controladoraRoles";
import { soloAdmin } from "../Middlewares/autenticacion";

const router = Router();

router.get("/", soloAdmin, listarRoles);
router.get("/crear", soloAdmin, mostrarFormularioCrearRol);
router.post("/", soloAdmin, crearRol);
router.get("/:id/editar", soloAdmin, mostrarFormularioEditarRol);
router.post("/:id", soloAdmin, actualizarRol);
router.post("/:id/eliminar", soloAdmin, eliminarRol);

export default router;
