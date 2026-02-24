export abstract class Permiso {
  constructor(
    public readonly codigo: string,
    public readonly nombre: string
  ) {}

  abstract tienePermiso(codigo: string): boolean;
}
