export class Proveedor {
    constructor(
        private id: number,
        private nombre: string,
        private contacto: string
    ) {}

    getId(): number { return this.id; }
    getNombre(): string { return this.nombre; }
    getContacto(): string { return this.contacto; }
}
