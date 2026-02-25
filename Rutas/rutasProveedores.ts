import { Router } from "express";
import {
    listarProveedores,
    mostrarFormularioCrearProveedor,
    crearProveedor,
    mostrarFormularioEditarProveedor,
    actualizarProveedor,
    eliminarProveedor,
    recuperarProveedor
} from "../Controladoras/controladoraProveedores";
import { requiereAlgunPermiso } from "../Middlewares/autenticacion";

const router = Router();

router.use(requiereAlgunPermiso(["CREAR_ORDEN_COMPRA", "EDITAR_ORDEN_COMPRA"]));

router.get("/", listarProveedores);
router.get("/crear", mostrarFormularioCrearProveedor);
router.post("/", crearProveedor);
router.get("/:id/editar", mostrarFormularioEditarProveedor);
router.post("/:id", actualizarProveedor);
router.post("/:id/eliminar", eliminarProveedor);
router.post("/:id/recuperar", recuperarProveedor);

export default router;
