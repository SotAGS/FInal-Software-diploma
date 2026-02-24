import { OrdenCompraState } from "./OrdenCompraState";
import { OrdenCompra } from "../Entidades/OrdenCompra";

export class EstadoCerradoConFaltante implements OrdenCompraState {

  recibirProducto(
    orden: OrdenCompra,
    cantidad: number,
    idUsuario: number
  ): void {
    throw new Error("La orden está cerrada con faltante");
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
