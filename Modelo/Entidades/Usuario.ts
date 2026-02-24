import { Rol } from "./Rol";

export class Usuario {

    constructor(
        private id: number,
        private nombre: string,
        private email: string,
        private password: string,
        private rol: Rol
    ) {}

    public getId(): number {
        return this.id;
    }

    public getNombre(): string {
        return this.nombre;
    }

    public getEmail(): string {
        return this.email;
    }

    public getPassword(): string {
        return this.password;
    }

    public getRol(): Rol {
        return this.rol;
    }

    public puede(codigoPermiso: string): boolean {
        return this.rol.puede(codigoPermiso);
    }
}