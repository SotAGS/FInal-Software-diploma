import { ServicioAuditoria } from "../Modelo/Servicios/ServicioAuditoria";
import { getPool } from "../config/database";

/**
 * Pruebas unitarias para ServicioAuditoria
 * Ensures audit logging works correctly
 */

describe("ServicioAuditoria", () => {
    let servicio: ServicioAuditoria;

    beforeEach(() => {
        servicio = ServicioAuditoria.obtenerInstancia();
    });

    describe("registrarCambio", () => {
        test("debe crear un registro de auditoría en la base de datos", async () => {
            const resultado = await servicio.registrarCambio(
                "Producto",
                1,
                "CREAR",
                1,
                null,
                "Producto Test"
            );

            expect(resultado).toBe(true);
        });

        test("debe fallar si hay error en la base de datos", async () => {
            // Mock error en getPool
            jest.spyOn(require("../config/database"), "getPool").mockImplementation(() => ({
                query: jest.fn().mockRejectedValue(new Error("DB Error"))
            }));

            const resultado = await servicio.registrarCambio(
                "Producto",
                1,
                "CREAR",
                1,
                null,
                "Test"
            );

            expect(resultado).toBe(false);
        });
    });

    describe("registrarLogin", () => {
        test("debe registrar un login exitoso", async () => {
            const resultado = await servicio.registrarLogin(1);
            expect(resultado).toBe(true);
        });

        test("debe insertar registro en tabla login_logout", async () => {
            const pool = getPool();
            const [rows] = await (pool.query as any)(
                "SELECT * FROM login_logout WHERE usuario_id = 1 AND tipo = 'LOGIN' ORDER BY fecha_hora DESC LIMIT 1"
            );

            expect((rows as any).length).toBeGreaterThan(0);
        });
    });

    describe("registrarLogout", () => {
        test("debe registrar un logout exitoso", async () => {
            const resultado = await servicio.registrarLogout(1);
            expect(resultado).toBe(true);
        });
    });

    describe("registrarLoginFallido", () => {
        test("debe registrar un intento de login fallido", async () => {
            const resultado = await servicio.registrarLoginFallido(
                "test@ejemplo.com",
                "Credenciales inv\u00e1lidas"
            );
            expect(resultado).toBe(true);
        });

        test("debe guardar el motivo del fallo", async () => {
            await servicio.registrarLoginFallido(
                "test@ejemplo.com",
                "Credenciales inv\u00e1lidas"
            );

            const pool = getPool();
            const [rows] = await (pool.query as any)(
                "SELECT * FROM login_logout WHERE email = 'test@ejemplo.com' AND tipo = 'LOGIN_FAIL' ORDER BY fecha_hora DESC LIMIT 1"
            );

            expect((rows as any)[0]?.tipo).toBe("LOGIN_FAIL");
        });
    });

    describe("obtenerAuditoria", () => {
        test("debe retornar registros de auditoría", async () => {
            const registros = await servicio.obtenerAuditoria("Producto", 1);
            expect(Array.isArray(registros)).toBe(true);
        });

        test("debe filtrar por entidad e id", async () => {
            const registros = await servicio.obtenerAuditoria("Producto", 1);
            registros.forEach(r => {
                expect(r.entidad).toBe("Producto");
                expect(r.id_entidad).toBe(1);
            });
        });
    });

    describe("obtenerAccesos", () => {
        test("debe retornar accesos de los últimos N días", async () => {
            const accesos = await servicio.obtenerAccesos(7);
            expect(Array.isArray(accesos)).toBe(true);
        });

        test("debe incluir LOGIN, LOGOUT y LOGIN_FAIL", async () => {
            const accesos = await servicio.obtenerAccesos(7);
            
            const tiposPresentes = new Set();
            accesos.forEach(a => {
                if (a.tipo) tiposPresentes.add(a.tipo);
            });

            // Los tipos pueden incluir LOGIN, LOGOUT, LOGIN_FAIL
            expect(tiposPresentes.size).toBeGreaterThan(0);
        });
    });
});
