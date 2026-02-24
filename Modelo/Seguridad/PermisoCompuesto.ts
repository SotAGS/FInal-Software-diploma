import { Permiso } from "./Permiso";

export class PermisoCompuesto extends Permiso {
  private hijos: Permiso[] = [];

  agregar(permiso: Permiso): void {
    this.hijos.push(permiso);
  }

  tienePermiso(codigo: string): boolean {
    return this.hijos.some(p => p.tienePermiso(codigo));
  }
}
