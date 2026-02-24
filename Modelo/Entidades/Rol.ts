import { Permiso } from "../Seguridad/Permiso";

export class Rol {
  constructor(
    public readonly nombre: string,
    public readonly permisoRaiz: Permiso
  ) {}

  puede(codigoPermiso: string): boolean {
    return this.permisoRaiz.tienePermiso(codigoPermiso);
  }
}
