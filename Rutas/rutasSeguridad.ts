import { Router } from "express";
import {
    mostrarLogin,
    login,
   logout,
   mostrarRecuperarPassword,
   solicitarRecuperarPassword,
   mostrarResetPassword,
   procesarResetPassword
} from "../Controladoras/controladoraSeguridad";

import { autenticado } from "../Middlewares/autenticacion";

const router = Router();

/* ===========================
   LOGIN
=========================== */

router.get("/login", mostrarLogin);
router.post("/login", login);
router.get("/forgot-password", mostrarRecuperarPassword);
router.post("/forgot-password", solicitarRecuperarPassword);
router.get("/reset-password", mostrarResetPassword);
router.post("/reset-password", procesarResetPassword);

/* ===========================
   LOGOUT
=========================== */

router.get("/logout", autenticado, logout);

export default router;