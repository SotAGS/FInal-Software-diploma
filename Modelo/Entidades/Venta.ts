export interface VentaItem {
    productoId: number;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
}

export class Venta {
    constructor(
        private id: number,
        private clienteNombre: string,
        private total: number,
        private items: VentaItem[],
        private usuarioVendedorId?: number,
        private fechaCreacion?: Date
    ) {}

    public getId(): number {
        return this.id;
    }

    public getClienteNombre(): string {
        return this.clienteNombre;
    }

    public getTotal(): number {
        return this.total;
    }

    public getItems(): VentaItem[] {
        return this.items;
    }

    public getUsuarioVendedorId(): number | undefined {
        return this.usuarioVendedorId;
    }

    public getFechaCreacion(): Date | undefined {
        return this.fechaCreacion;
    }
}
