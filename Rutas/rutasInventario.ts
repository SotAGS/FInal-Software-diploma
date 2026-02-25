import { Router } from "express";
import { requierePermiso } from "../Middlewares/autenticacion";
import {
    listarProductos,
    mostrarCrearProducto,
    mostrarEditarProducto,
    editarProducto,
    crearProducto,
    eliminarProducto,
    recuperarProducto
} from "../Controladoras/controladoraProducto";
import { mostrarInventario } from "../Controladoras/controladoraInventario";

const router = Router();

router.get("/",
    requierePermiso("VER_STOCK"),
    mostrarInventario
);

router.get("/listado",
    requierePermiso("VER_STOCK"),
    listarProductos
);

router.get("/crear",
    requierePermiso("CREAR_PRODUCTO"),
    mostrarCrearProducto
);

router.get("/editar/:id",
    requierePermiso("EDITAR_PRODUCTO"),
    mostrarEditarProducto
);

router.post("/editar/:id",
    requierePermiso("EDITAR_PRODUCTO"),
    editarProducto
);

router.post("/crear",
    requierePermiso("CREAR_PRODUCTO"),
    crearProducto
);

router.post("/eliminar/:id",
    requierePermiso("ELIMINAR_PRODUCTO"),
    eliminarProducto
);

router.post("/recuperar/:id",
    requierePermiso("ELIMINAR_PRODUCTO"),
    recuperarProducto
);

export default router;