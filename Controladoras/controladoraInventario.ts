import { Request, Response } from "express";

export const mostrarInventario = (req: Request, res: Response): void => {
    res.render("Inventario/index", {
        titulo: "Inventario"
    });
};