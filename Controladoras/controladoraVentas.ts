import { Response } from "express";

export const mostrarVentas = (req: any, res: Response): void => {
    res.render("ventas", {
        titulo: "Ventas"
    });
};
