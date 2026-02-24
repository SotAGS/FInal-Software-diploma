import { login } from "../Controladoras/controladoraSeguridad";
import { RepositorioUsuario } from "../Modelo/Repositorios/RepositorioUsuario";
import { ServicioAuditoria } from "../Modelo/Servicios/ServicioAuditoria";

/**
 * Pruebas de caja blanca: Login flow with auditing
 * Verifies that login attempts are correctly logged in audit trail
 */

describe("Login - Caja Blanca", () => {
    let mockReq: any;
    let mockRes: any;
    let repo: RepositorioUsuario;
    let servicio: ServicioAuditoria;

    beforeEach(() => {
        repo = new RepositorioUsuario();
        servicio = ServicioAuditoria.obtenerInstancia();

        mockReq = {
            body: {},
            session: {}
        };

        mockRes = {
            render: jest.fn(),
            redirect: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe("Login exitoso", () => {
        test("debe registrar LOGIN en login_logout cuando credenciales son correctas", async () => {
            mockReq.body = {
                email: "admin@empresa.com",
                password: "admin123"
            };

            // Ejecutar login
            await login(mockReq, mockRes);

            // Verificar que se creó sesión
            expect(mockReq.session.usuarioId).toBeDefined();

            // Verificar que se redirigió a home
            expect(mockRes.redirect).toHaveBeenCalledWith("/");
        });

        test("debe llamar a ServicioAuditoria.registrarLogin", async () => {
            const spy = jest.spyOn(servicio, "registrarLogin");

            mockReq.body = {
                email: "admin@empresa.com",
                password: "admin123"
            };

            await login(mockReq, mockRes);

            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });
    });

    describe("Login fallido", () => {
        test("debe rechazar si falta email o password", async () => {
            mockReq.body = { email: "", password: "" };

            await login(mockReq, mockRes);

            expect(mockRes.render).toHaveBeenCalledWith(
                "seguridad/login",
                expect.objectContaining({
                    error: expect.stringContaining("campos")
                })
            );
        });

        test("debe registrar LOGIN_FAIL cuando email no existe", async () => {
            const spy = jest.spyOn(servicio, "registrarLoginFallido");

            mockReq.body = {
                email: "noexiste@empresa.com",
                password: "cualquier_password"
            };

            await login(mockReq, mockRes);

            expect(spy).toHaveBeenCalledWith(
                "noexiste@empresa.com",
                expect.any(String)
            );

            spy.mockRestore();
        });

        test("debe registrar LOGIN_FAIL cuando password es incorrecto", async () => {
            const spy = jest.spyOn(servicio, "registrarLoginFallido");

            mockReq.body = {
                email: "admin@empresa.com",
                password: "password_incorrecto"
            };

            await login(mockReq, mockRes);

            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });

        test("debe mostrar error cuando credenciales son incorrectas", async () => {
            mockReq.body = {
                email: "admin@empresa.com",
                password: "wrong_password"
            };

            await login(mockReq, mockRes);

            expect(mockRes.render).toHaveBeenCalledWith(
                "seguridad/login",
                expect.objectContaining({
                    error: "Credenciales incorrectas"
                })
            );
        });
    });
});

/**
 * Pruebas de caja negra: Login endpoint
 * Tests external behavior without knowing internals
 */

describe("Login - Caja Negra", () => {
    let mockReq: any;
    let mockRes: any;

    beforeEach(() => {
        mockReq = {
            body: {},
            session: {}
        };

        mockRes = {
            render: jest.fn(),
            redirect: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe("Comportamiento externo", () => {
        test("usuario válido puede iniciar sesión", async () => {
            mockReq.body = {
                email: "admin@empresa.com",
                password: "admin123"
            };

            await login(mockReq, mockRes);

            // Output: Usuario debe ser redirigido o tener sesión
            expect(mockReq.session.usuarioId !== undefined || mockRes.redirect.called).toBe(true);
        });

        test("usuario inválido recibe error", async () => {
            mockReq.body = {
                email: "invalido@test.com",
                password: "cualquierpass"
            };

            await login(mockReq, mockRes);

            // Output: Debe renderizar login con error
            expect(mockRes.render).toHaveBeenCalled();
        });

        test("campos vacíos producen error", async () => {
            mockReq.body = { email: "", password: "" };

            await login(mockReq, mockRes);

            // Output: Debe mostrar error
            expect(mockRes.render).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ error: expect.any(String) })
            );
        });
    });
});
