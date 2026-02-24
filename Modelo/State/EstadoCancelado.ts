import { OrdenCompraState } from "./OrdenCompraState";
import { OrdenCompra } from "../Entidades/OrdenCompra";

export class EstadoCancelado implements OrdenCompraState {

  recibirProducto(
    orden: OrdenCompra,
    cantidad: number,
    idUsuario: number
  ): void {
    throw new Error("La orden está cancelada");
  }

  cancelar(
    orden: OrdenCompra,
    idUsuario: number
  ): void {
    throw new Error("La orden ya está cancelada");
  }

  cerrarConFaltante(
    orden: OrdenCompra,
    idUsuario: number
  ): void {
    throw new Error("La orden está cancelada");
  }

  cerrar(
    orden: OrdenCompra,
    idUsuario: number
  ): void {
    throw new Error("La orden está cancelada");
  }
}
