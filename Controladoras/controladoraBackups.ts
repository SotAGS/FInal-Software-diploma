import { Response } from "express";
import { ServicioBackups } from "../Modelo/Servicios/ServicioBackups";

const servicioBackups = ServicioBackups.obtenerInstancia();

export const mostrarBackups = async (req: any, res: Response): Promise<void> => {
    try {
        const backups = servicioBackups.listarBackups();

        res.render("backups/index", {
            titulo: "Backups",
            backups,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error("Error cargando pantalla de backups:", error);
        res.status(500).render("backups/index", {
            titulo: "Backups",
            backups: [],
            success: null,
            error: "No se pudo cargar la pantalla de backups."
        });
    }
};

export const crearBackupDesdeApp = async (req: any, res: Response): Promise<void> => {
    try {
        const nombre = typeof req.body?.nombre === "string" ? req.body.nombre.trim() : "";
        const backup = await servicioBackups.crearBackup(nombre || undefined);

        res.redirect(`/Backups?success=${encodeURIComponent(`Backup creado: ${backup.nombre}`)}`);
    } catch (error) {
        console.error("Error al crear backup:", error);
        res.redirect(`/Backups?error=${encodeURIComponent("No se pudo crear el backup")}`);
    }
};

export const limpiarDatosDesdeApp = async (req: any, res: Response): Promise<void> => {
    try {
        const tablas = await servicioBackups.limpiarDatosSistema();

        // Mantener sesión ADMIN aunque se haya borrado la tabla usuarios.
        req.session.usuarioId = -1;
        req.session.isHardcodedAdmin = true;

        req.session.save((err: any) => {
            if (err) {
                console.error("Error guardando sesión luego de limpiar datos:", err);
            }

            res.redirect(`/Backups?success=${encodeURIComponent(`Datos borrados correctamente (${tablas} tablas).`)}`);
        });
    } catch (error) {
        console.error("Error al limpiar datos:", error);
        res.redirect(`/Backups?error=${encodeURIComponent("No se pudieron borrar los datos")}`);
    }
};

export const restaurarUltimoDesdeApp = async (_req: any, res: Response): Promise<void> => {
    try {
        const archivo = await servicioBackups.restaurarUltimoBackup();
        res.redirect(`/Backups?success=${encodeURIComponent(`Backup restaurado: ${archivo}`)}`);
    } catch (error) {
        console.error("Error restaurando último backup:", error);
        res.redirect(`/Backups?error=${encodeURIComponent((error as any)?.message || "No se pudo restaurar el backup")}`);
    }
};

export const restaurarArchivoDesdeApp = async (req: any, res: Response): Promise<void> => {
    try {
        const archivo = typeof req.body?.archivo === "string" ? req.body.archivo.trim() : "";

        if (!archivo) {
            return res.redirect(`/Backups?error=${encodeURIComponent("Debe seleccionar un archivo backup")}`);
        }

        await servicioBackups.restaurarBackupPorNombre(archivo);
        res.redirect(`/Backups?success=${encodeURIComponent(`Backup restaurado: ${archivo}`)}`);
    } catch (error) {
        console.error("Error restaurando backup seleccionado:", error);
        res.redirect(`/Backups?error=${encodeURIComponent((error as any)?.message || "No se pudo restaurar el backup")}`);
    }
};
