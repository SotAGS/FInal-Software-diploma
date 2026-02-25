const mockRepoOrden = {
  obtenerTodos: jest.fn(),
  buscarPorId: jest.fn(),
  crear: jest.fn(),
  guardarCambios: jest.fn()
};

const mockRepoProveedor = {
  obtenerTodos: jest.fn()
};

const mockRepoProducto = {
  obtenerTodos: jest.fn(),
  buscarPorId: jest.fn(),
  modificar: jest.fn()
};

jest.mock('../Modelo/Repositorios/RepositorioOrdenCompra', () => ({
  RepositorioOrdenCompra: {
    obtenerInstancia: () => mockRepoOrden
  }
}));

jest.mock('../Modelo/Repositorios/RepositorioProveedor', () => ({
  RepositorioProveedor: {
    obtenerInstancia: () => mockRepoProveedor
  }
}));

jest.mock('../Modelo/Repositorios/RepositorioProducto', () => ({
  RepositorioProducto: {
    obtenerInstancia: () => mockRepoProducto
  }
}));

import {
  agregarAlCarrito,
  cerrarOrden,
  guardarFaltantes
} from '../Controladoras/controladoraCompras';

describe('Validaciones defensivas en Compras', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('agregarAlCarrito rechaza cantidad inválida y redirige sin romper', () => {
    const req: any = {
      body: { productoId: '1', cantidad: '0' },
      session: {
        cart: [],
        message: '',
        save: jest.fn((cb: any) => cb())
      }
    };

    const res: any = {
      redirect: jest.fn()
    };

    agregarAlCarrito(req, res);

    expect(req.session.message).toContain('cantidad mayor a 0');
    expect(res.redirect).toHaveBeenCalledWith('/Compras/crear');
    expect(req.session.cart).toEqual([]);
  });

  test('cerrarOrden evita cierre cuando la orden ya está finalizada', async () => {
    mockRepoOrden.buscarPorId.mockResolvedValue({
      estado: { constructor: { name: 'EstadoCerrado' } },
      items: [],
      cerrar: jest.fn()
    });

    const req: any = {
      params: { id: '10' },
      session: {
        usuarioId: 7,
        message: ''
      }
    };

    const res: any = {
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };

    await cerrarOrden(req, res);

    expect(req.session.message).toContain('ya está finalizada');
    expect(res.redirect).toHaveBeenCalledWith('/Compras');
    expect(mockRepoProducto.modificar).not.toHaveBeenCalled();
    expect(mockRepoOrden.guardarCambios).not.toHaveBeenCalled();
  });

  test('guardarFaltantes rechaza faltante mayor a cantidad solicitada', async () => {
    mockRepoOrden.buscarPorId.mockResolvedValue({
      items: [
        { productoId: 5, cantidad: 2 }
      ],
      registrarFaltantes: jest.fn(),
      cerrarConFaltante: jest.fn()
    });

    const req: any = {
      params: { id: '22' },
      body: { faltante_5: '3' },
      session: {
        usuarioId: 3,
        message: ''
      }
    };

    const res: any = {
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };

    await guardarFaltantes(req, res);

    expect(req.session.message).toContain('supera la cantidad solicitada');
    expect(res.redirect).toHaveBeenCalledWith('/Compras/faltante/22');
    expect(mockRepoOrden.guardarCambios).not.toHaveBeenCalled();
  });
});
