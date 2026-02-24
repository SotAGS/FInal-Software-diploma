import { Proveedor } from "../Entidades/Proveedor";

export class RepositorioProveedor {
    private static instancia: RepositorioProveedor | null = null;
    private proveedores: Proveedor[] = [];
    private ultimoId = 0;

    private constructor() {
        this.crear("Panaderia La Masa", "contacto@lamasa.com");
        this.crear("Molinos SA", "ventas@molinos.com");
    }

    public static obtenerInstancia(): RepositorioProveedor {
        if (!RepositorioProveedor.instancia) {
            RepositorioProveedor.instancia = new RepositorioProveedor();
        }

        return RepositorioProveedor.instancia;
    }

    crear(nombre: string, contacto: string): Proveedor {
        const p = new Proveedor(++this.ultimoId, nombre, contacto);
        this.proveedores.push(p);
        return p;
    }

    obtenerTodos(): Proveedor[] {
        return this.proveedores;
    }

    buscarPorId(id: number): Proveedor | undefined {
        return this.proveedores.find(p => p.getId() === id);
    }

    actualizar(id: number, nombre: string, contacto: string): boolean {
        const index = this.proveedores.findIndex(p => p.getId() === id);
        if (index === -1) return false;

        this.proveedores[index] = new Proveedor(id, nombre, contacto);
        return true;
    }

    eliminar(id: number): boolean {
        const index = this.proveedores.findIndex(p => p.getId() === id);
        if (index === -1) return false;

        this.proveedores.splice(index, 1);
        return true;
    }
}
