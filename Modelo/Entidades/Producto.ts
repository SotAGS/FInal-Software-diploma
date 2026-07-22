export class Producto {

    constructor(
        private id: number,
        private nombre: string,
        private precioCompra: number,
        private precioVenta: number,
        private stock: number,
        private activo: boolean = true,
        private proveedorId?: number
    ) {}

    getId(): number {
        return this.id;
    }

    getNombre(): string {
        return this.nombre;
    }

    getPrecioCompra(): number {
        return this.precioCompra;
    }

    getPrecioVenta(): number {
        return this.precioVenta;
    }

    getStock(): number {
        return this.stock;
    }

    esActivo(): boolean {
        return this.activo;
    }

    getProveedorId(): number | undefined {
        return this.proveedorId;
    }

    setNombre(nombre: string): void {
        this.nombre = nombre;
    }

    setPrecioCompra(precioCompra: number): void {
        this.precioCompra = precioCompra;
    }

    setPrecioVenta(precioVenta: number): void {
        this.precioVenta = precioVenta;
    }

    setStock(stock: number): void {
        this.stock = stock;
    }

    setProveedorId(proveedorId?: number): void {
        this.proveedorId = proveedorId;
    }
}