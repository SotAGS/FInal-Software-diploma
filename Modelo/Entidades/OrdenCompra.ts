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

  constructor(
    public readonly id: number,
    public estado: OrdenCompraState,
    items: OrdenItem[] = [],
    proveedorId?: number
  ) {
    this.items = items;
    this.proveedorId = proveedorId;
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
}
