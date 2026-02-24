import { Permiso } from "./Permiso";

export class PermisoAtomico extends Permiso {
  tienePermiso(codigo: string): boolean {
    return this.codigo === codigo;
  }
}
