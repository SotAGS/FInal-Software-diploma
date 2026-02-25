export class Producto {

    constructor(
        private id: number,
        private nombre: string,
        private precio: number,
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

    getPrecio(): number {
        return this.precio;
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

    setPrecio(precio: number): void {
        this.precio = precio;
    }

    setStock(stock: number): void {
        this.stock = stock;
    }

    setProveedorId(proveedorId?: number): void {
        this.proveedorId = proveedorId;
    }
}