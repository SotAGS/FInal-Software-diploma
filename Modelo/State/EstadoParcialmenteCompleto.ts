import { OrdenCompraState } from "./OrdenCompraState";
import { OrdenCompra } from "../Entidades/OrdenCompra";
import { ServicioAuditoria } from "../Servicios/ServicioAuditoria";
import { EstadoCompleto } from "./EstadoCompleto";
import { EstadoCerradoConFaltante } from "./EstadoCerradoConFaltante";
import { EstadoCancelado } from "./EstadoCancelado";

export class EstadoParcialmenteCompleto implements OrdenCompraState {

  recibirProducto(
    orden: OrdenCompra,
    cantidad: number,
    idUsuario: number
  ): void {
    orden.cambiarEstado(new EstadoCompleto());

    ServicioAuditoria.obtenerInstancia().registrarCambio(
      "OrdenCompra",
      orden.id,
      "RECIBIR_PRODUCTO",
      idUsuario,
      "ParcialmenteCompleto",
      "Completo"
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
      "ParcialmenteCompleto",
      "Cancelado"
    );
  }

  cerrarConFaltante(
    orden: OrdenCompra,
    idUsuario: number
  ): void {
    orden.cambiarEstado(new EstadoCerradoConFaltante());

    ServicioAuditoria.obtenerInstancia().registrarCambio(
      "OrdenCompra",
      orden.id,
      "CERRAR_CON_FALTANTE",
      idUsuario,
      "ParcialmenteCompleto (recibida parcialmente)",
      `CerradoConFaltante - Items solicitados: ${orden.items.length}, Recibidos: ${orden.itemsRecibidos.length}, Faltantes: ${orden.itemsFaltantes.length}`
    );
  }
  
  cerrar(
    orden: OrdenCompra,
    idUsuario: number
  ): void {
    // Pasar de ParcialmenteCompleto a Completo si el usuario decide cerrar sin faltantes
    orden.cambiarEstado(new EstadoCompleto());
    ServicioAuditoria.obtenerInstancia().registrarCambio(
      "OrdenCompra",
      orden.id,
      "CERRAR",
      idUsuario,
      "ParcialmenteCompleto",
      "Completo"
    );
  }
}
