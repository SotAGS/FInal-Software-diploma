import { OrdenCompra } from "../Entidades/OrdenCompra";

export interface OrdenCompraState {
  recibirProducto(
    orden: OrdenCompra,
    cantidad: number,
    idUsuario: number
  ): void;

  cancelar(
    orden: OrdenCompra,
    idUsuario: number
  ): void;

  cerrarConFaltante(
    orden: OrdenCompra,
    idUsuario: number
  ): void;
  
  cerrar(
    orden: OrdenCompra,
    idUsuario: number
  ): void;
}
