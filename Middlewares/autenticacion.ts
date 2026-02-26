import { Response, NextFunction } from "express";
import { Usuario } from "../Modelo/Entidades/Usuario";

export const autenticado = (
    req: any,
    res: Response,
    next: NextFunction
) => {

    if (!req.usuario) {
        return res.redirect("/login");
    }

    next();
};

export const requierePermiso = (codigoPermiso: string) => {

    return (req: any, res: Response, next: NextFunction) => {

        const usuario = req.usuario as Usuario;

        if (!usuario || !usuario.puede(codigoPermiso)) {
            return res.status(403).send("Acceso denegado");
        }

        next();
    };
};

export const requiereAlgunPermiso = (codigosPermiso: string[]) => {
    return (req: any, res: Response, next: NextFunction) => {
        const usuario = req.usuario as Usuario;

        if (!usuario) {
            return res.status(403).send("Acceso denegado");
        }

        const tienePermiso = codigosPermiso.some(codigo => usuario.puede(codigo));

        if (!tienePermiso) {
            return res.status(403).send("Acceso denegado");
        }

        next();
    };
};

export const soloAdmin = (req: any, res: Response, next: NextFunction) => {
    const usuario = req.usuario as Usuario;

    if (!usuario || usuario.getRol().nombre !== "ADMIN") {
        return res.status(403).send("Acceso denegado");
    }

    next();
};