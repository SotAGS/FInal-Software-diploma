import { Router } from "express";
import {
    mostrarLogin,
    login,
    logout
} from "../Controladoras/controladoraSeguridad";

import { autenticado } from "../Middlewares/autenticacion";

const router = Router();

/* ===========================
   LOGIN
=========================== */

router.get("/login", mostrarLogin);
router.post("/login", login);

/* ===========================
   LOGOUT
=========================== */

router.get("/logout", autenticado, logout);

export default router;