import { OrdenCompraState } from "./OrdenCompraState";
import { OrdenCompra } from "../Entidades/OrdenCompra";

export class EstadoCerrado implements OrdenCompraState {

  recibirProducto(
    orden: OrdenCompra,
    cantidad: number,
    idUsuario: number
  ): void {
    throw new Error("La orden ya fue cerrada");
  }

  cancelar(
    orden: OrdenCompra,
    idUsuario: number
  ): void {
    throw new Error("La orden ya fue cerrada");
  }

  cerrarConFaltante(
    orden: OrdenCompra,
    idUsuario: number
  ): void {
    throw new Error("La orden ya fue cerrada");
  }

  cerrar(
    orden: OrdenCompra,
    idUsuario: number
  ): void {
    throw new Error("La orden ya fue cerrada");
  }
}
