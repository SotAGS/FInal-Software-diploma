import { Router } from "express";
import {
    listarUsuarios,
    mostrarFormularioCrear,
    crearUsuario,
    mostrarFormularioEditar,
    actualizarUsuario,
    eliminarUsuario
} from "../Controladoras/controladoraSeguridad";
import { requierePermiso } from "../Middlewares/autenticacion";

const router = Router();

// Listar usuarios (solo admin)
router.get("/", requierePermiso("GESTIONAR_USUARIOS"), listarUsuarios);

// Formulario para crear (solo admin)
router.get("/crear", requierePermiso("GESTIONAR_USUARIOS"), mostrarFormularioCrear);

// Crear usuario (solo admin)
router.post("/", requierePermiso("GESTIONAR_USUARIOS"), crearUsuario);

// Formulario para editar (solo admin)
router.get("/:id/editar", requierePermiso("GESTIONAR_USUARIOS"), mostrarFormularioEditar);

// Actualizar usuario (solo admin)
router.post("/:id", requierePermiso("GESTIONAR_USUARIOS"), actualizarUsuario);

// Eliminar usuario (solo admin)
router.post("/:id/eliminar", requierePermiso("GESTIONAR_USUARIOS"), eliminarUsuario);

export default router;
