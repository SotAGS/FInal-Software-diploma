export class Auditoria {
  constructor(
    public readonly entidad: string,
    public readonly idEntidad: number,
    public readonly accion: string,
    public readonly idUsuario: number,
    public readonly fechaHora: Date,
    public readonly valorAnterior: any,
    public readonly valorNuevo: any
  ) {}
}
