import { OrdenCompra, OrdenItem } from "../Entidades/OrdenCompra";
import { EstadoPendiente } from "../State/EstadoPendiente";

export class RepositorioOrdenCompra {
    private static instancia: RepositorioOrdenCompra;
    private ordenes: OrdenCompra[] = [];
    private ultimoId: number = 0;

    public static obtenerInstancia(): RepositorioOrdenCompra {
        if (!RepositorioOrdenCompra.instancia) {
            RepositorioOrdenCompra.instancia = new RepositorioOrdenCompra();
        }
        return RepositorioOrdenCompra.instancia;
    }

    obtenerTodos(): OrdenCompra[] {
        return this.ordenes;
    }

    buscarPorId(id: number): OrdenCompra | undefined {
        return this.ordenes.find(o => o['id'] === id);
    }

    crear(items: OrdenItem[], proveedorId?: number): OrdenCompra {
        const orden = new OrdenCompra(++this.ultimoId, new EstadoPendiente(), items, proveedorId);
        this.ordenes.push(orden);
        return orden;
    }
}
