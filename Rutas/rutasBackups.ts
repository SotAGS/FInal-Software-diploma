import { Router } from "express";
import { soloAdmin } from "../Middlewares/autenticacion";
import {
    mostrarBackups,
    crearBackupDesdeApp,
    limpiarDatosDesdeApp,
    restaurarUltimoDesdeApp,
    restaurarArchivoDesdeApp
} from "../Controladoras/controladoraBackups";

const router = Router();

router.get("/", soloAdmin, mostrarBackups);
router.post("/crear", soloAdmin, crearBackupDesdeApp);
router.post("/limpiar", soloAdmin, limpiarDatosDesdeApp);
router.post("/restaurar-ultimo", soloAdmin, restaurarUltimoDesdeApp);
router.post("/restaurar", soloAdmin, restaurarArchivoDesdeApp);

export default router;
