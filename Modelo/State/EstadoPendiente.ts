import { OrdenCompraState } from "./OrdenCompraState";
import { OrdenCompra } from "../Entidades/OrdenCompra";
import { ServicioAuditoria } from "../Servicios/ServicioAuditoria";
import { EstadoParcialmenteCompleto } from "./EstadoParcialmenteCompleto";
import { EstadoCompleto } from "./EstadoCompleto";
import { EstadoCancelado } from "./EstadoCancelado";

export class EstadoPendiente implements OrdenCompraState {

  recibirProducto(
    orden: OrdenCompra,
    cantidad: number,
    idUsuario: number
  ): void {
    // Al recibir productos de una orden Pendiente, pasa a ParcialmenteCompleto
    // (desde ahí se puede cerrar con faltante o terminar)
    orden.cambiarEstado(new EstadoParcialmenteCompleto());

    ServicioAuditoria.obtenerInstancia().registrarCambio(
      "OrdenCompra",
      orden.id,
      "RECIBIR_PRODUCTO",
      idUsuario,
      "Pendiente",
      "ParcialmenteCompleto"
    );
  }

  cancelar(
    orden: OrdenCompra,
    idUsuario: number
  ): void {
    orden.cambiarEstado(new EstadoCancelado());

    ServicioAuditoria.obtenerInstancia().registrarCambio(
      "OrdenCompra",
      orden.id,
      "CANCELAR",
      idUsuario,
      "Pendiente",
      "Cancelado"
    );
  }

  cerrarConFaltante(
    orden: OrdenCompra,
    idUsuario: number
  ): void {
    throw new Error(
      "No se puede cerrar con faltante una orden en estado Pendiente"
    );
  }

  cerrar(
    orden: OrdenCompra,
    idUsuario: number
  ): void {
    throw new Error("No se puede cerrar una orden en estado Pendiente");
  }
}