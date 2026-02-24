import { OrdenCompraState } from "./OrdenCompraState";
import { OrdenCompra } from "../Entidades/OrdenCompra";
import { ServicioAuditoria } from "../Servicios/ServicioAuditoria";
import { EstadoCerrado } from "./EstadoCerrado";

export class EstadoCompleto implements OrdenCompraState {

  recibirProducto(
    orden: OrdenCompra,
    cantidad: number,
    idUsuario: number
  ): void {
    throw new Error("La orden ya está completa");
  }

  cancelar(
    orden: OrdenCompra,
    idUsuario: number
  ): void {
    throw new Error("No se puede cancelar una orden completa");
  }

  cerrarConFaltante(
    orden: OrdenCompra,
    idUsuario: number
  ): void {
    throw new Error("La orden ya está completa");
  }

  cerrar(
    orden: OrdenCompra,
    idUsuario: number
  ): void {
    orden.cambiarEstado(new EstadoCerrado());
    ServicioAuditoria.obtenerInstancia().registrarCambio(
      "OrdenCompra",
      orden.id,
      "CERRAR",
      idUsuario,
      "Completo",
      "Cerrado"
    );
  }
}
