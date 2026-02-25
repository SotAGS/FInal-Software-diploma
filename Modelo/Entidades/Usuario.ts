import { Rol } from "./Rol";

export class Usuario {

    constructor(
        private id: number,
        private nombre: string,
        private email: string,
        private password: string,
        private rol: Rol,
        private activo: boolean = true,
        private backupEmail: string | null = null
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

    public getBackupEmail(): string | null {
        return this.backupEmail;
    }

    public getRol(): Rol {
        return this.rol;
    }

    public esActivo(): boolean {
        return this.activo;
    }

    public puede(codigoPermiso: string): boolean {
        return this.rol.puede(codigoPermiso);
    }
}