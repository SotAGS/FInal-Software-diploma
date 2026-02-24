import { Request, Response } from "express";
import { RepositorioUsuario } from "../Modelo/Repositorios/RepositorioUsuario";
import { Usuario } from "../Modelo/Entidades/Usuario";

const repoUsuario = new RepositorioUsuario();

/* ===========================
   MOSTRAR MÓDULO USUARIOS
=========================== */
export const mostrarUsuarios = async (req: any, res: Response): Promise<void> => {

    try {
        const usuarios = await repoUsuario.obtenerTodos();
        res.render("usuarios/index", {
            usuarios: usuarios,
            error: null,
            success: null,
            titulo: "Gestión de Usuarios"
        });
    } catch (error) {
        console.error(error);
        res.status(500).render("usuarios/index", {
            usuarios: [],
            error: "Error al cargar usuarios",
            success: null,
            titulo: "Gestión de Usuarios"
        });
    }
};

/*
DUEÑO
Email:    dueno@empresa.com
Password: 1234
*/

/*
EMPLEADO
Email:    empleado@empresa.com
Password: 1234
*/