import { OrdenCompraState } from "../State/OrdenCompraState";

export interface OrdenItem {
  productoId: number;
  cantidad: number;
}

export class OrdenCompra {
  public items: OrdenItem[] = [];
  public itemsRecibidos: { productoId: number; cantidadRecibida: number }[] = [];
  public itemsFaltantes: { productoId: number; cantidadFaltante: number }[] = [];
  public proveedorId?: number;
  public readonly usuarioCreadorId?: number;
  public readonly fechaCreacion: Date;

  constructor(
    public readonly id: number,
    public estado: OrdenCompraState,
    items: OrdenItem[] = [],
    proveedorId?: number,
    usuarioCreadorId?: number,
    fechaCreacion?: Date
  ) {
    this.items = items;
    this.proveedorId = proveedorId;
    this.usuarioCreadorId = usuarioCreadorId;
    this.fechaCreacion = fechaCreacion || new Date();
  }

  cambiarEstado(nuevoEstado: OrdenCompraState): void {
    this.estado = nuevoEstado;
  }

  recibirProductos(idUsuario: number): void {
    this.estado.recibirProducto(this, 0, idUsuario);
  }

  cancelar(idUsuario: number): void {
    this.estado.cancelar(this, idUsuario);
  }

  cerrarConFaltante(idUsuario: number): void {
    this.estado.cerrarConFaltante(this, idUsuario);
  }

  cerrar(idUsuario: number): void {
    this.estado.cerrar(this, idUsuario);
  }

  registrarItemRecibido(productoId: number, cantidad: number): void {
    const existing = this.itemsRecibidos.find(r => r.productoId === productoId);
    if (existing) {
      existing.cantidadRecibida += cantidad;
    } else {
      this.itemsRecibidos.push({ productoId, cantidadRecibida: cantidad });
    }
  }

  registrarFaltantes(faltantes: { productoId: number; cantidadFaltante: number }[]): void {
    this.itemsFaltantes = faltantes;
  }

  getFechaCreacion(): Date {
    return this.fechaCreacion;
  }

  getUsuarioCreadorId(): number | undefined {
    return this.usuarioCreadorId;
  }
}
