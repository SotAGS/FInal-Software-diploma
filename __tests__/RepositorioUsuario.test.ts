import { RepositorioUsuario } from "../Modelo/Repositorios/RepositorioUsuario";
import { Usuario } from "../Modelo/Entidades/Usuario";
import { Rol } from "../Modelo/Entidades/Rol";
import { PermisoCompuesto } from "../Modelo/Seguridad/PermisoCompuesto";

/**
 * Pruebas unitarias para RepositorioUsuario
 * Tests CRUD operations and database synchronization
 */

describe("RepositorioUsuario", () => {
    let repo: RepositorioUsuario;

    beforeEach(() => {
        repo = new RepositorioUsuario();
    });

    describe("obtenerTodos", () => {
        test("debe retornar un array de usuarios", async () => {
            const usuarios = await repo.obtenerTodos();
            expect(Array.isArray(usuarios)).toBe(true);
        });

        test("debe retornar usuarios con propiedades correctas", async () => {
            const usuarios = await repo.obtenerTodos();
            if (usuarios.length > 0) {
                const usuario = usuarios[0];
                expect(usuario.getId()).toBeDefined();
                expect(usuario.getNombre()).toBeDefined();
                expect(usuario.getEmail()).toBeDefined();
                expect(usuario.getRol()).toBeDefined();
            }
        });
    });

    describe("buscarPorEmail", () => {
        test("debe encontrar un usuario por email", async () => {
            // Primero crear un usuario
            const permisos = new PermisoCompuesto("TEST", "Test");
            const rol = new Rol("TEST", permisos);
            const nuevoUsuario = new Usuario(0, "Test User", "test@ejemplo.com", "password123", rol);
            
            await repo.crear(nuevoUsuario);

            // Ahora buscarlo
            const usuario = await repo.buscarPorEmail("test@ejemplo.com");
            expect(usuario).toBeDefined();
            expect(usuario?.getEmail()).toBe("test@ejemplo.com");
        });

        test("debe retornar undefined si el email no existe", async () => {
            const usuario = await repo.buscarPorEmail("noexiste@ejemplo.com");
            expect(usuario).toBeUndefined();
        });
    });

    describe("buscarPorId", () => {
        test("debe encontrar un usuario por id", async () => {
            const usuarios = await repo.obtenerTodos();
            if (usuarios.length > 0) {
                const id = usuarios[0].getId();
                const usuario = await repo.buscarPorId(id);
                expect(usuario?.getId()).toBe(id);
            }
        });

        test("debe retornar undefined si el id no existe", async () => {
            const usuario = await repo.buscarPorId(99999);
            expect(usuario).toBeUndefined();
        });
    });

    describe("crear", () => {
        test("debe crear un nuevo usuario", async () => {
            const permisos = new PermisoCompuesto("NUEVO", "Nuevo");
            const rol = new Rol("NUEVO", permisos);
            const nuevoUsuario = new Usuario(0, "Usuario Nuevo", "nuevo@ejemplo.com", "pass123", rol);

            const resultado = await repo.crear(nuevoUsuario);
            expect(resultado).toBe(true);

            // Verificar que se creó
            const usuarioCreado = await repo.buscarPorEmail("nuevo@ejemplo.com");
            expect(usuarioCreado).toBeDefined();
        });

        test("debe fallar si el email ya existe", async () => {
            const permisos = new PermisoCompuesto("TEST", "Test");
            const rol = new Rol("TEST", permisos);
            
            const usuario1 = new Usuario(0, "Usuario 1", "duplicado@ejemplo.com", "pass1", rol);
            const usuario2 = new Usuario(0, "Usuario 2", "duplicado@ejemplo.com", "pass2", rol);

            await repo.crear(usuario1);
            const resultado = await repo.crear(usuario2);

            // Debería fallar debido a constraint UNIQUE en email
            expect(resultado).toBe(false);
        });
    });

    describe("actualizar", () => {
        test("debe actualizar un usuario existente", async () => {
            const usuarios = await repo.obtenerTodos();
            if (usuarios.length > 0) {
                const usuario = usuarios[0];
                const nuevoNombre = "Nombre Actualizado";
                
                const usuarioActualizado = new Usuario(
                    usuario.getId(),
                    nuevoNombre,
                    usuario.getEmail(),
                    usuario.getPassword(),
                    usuario.getRol()
                );

                const resultado = await repo.actualizar(usuarioActualizado);
                expect(resultado).toBe(true);

                // Verificar que se actualizó
                const usuarioVerificacion = await repo.buscarPorId(usuario.getId());
                expect(usuarioVerificacion?.getNombre()).toBe(nuevoNombre);
            }
        });
    });

    describe("eliminar", () => {
        test("debe marcar un usuario como inactivo (soft delete)", async () => {
            // Crear un usuario para eliminar
            const permisos = new PermisoCompuesto("TEMP", "Temporal");
            const rol = new Rol("TEMP", permisos);
            const usuarioTemp = new Usuario(0, "Usuario Temporal", "temporal@ejemplo.com", "pass123", rol);
            
            await repo.crear(usuarioTemp);

            // Obtener el ID
            const usuarioGuardado = await repo.buscarPorEmail("temporal@ejemplo.com");
            if (usuarioGuardado) {
                const resultado = await repo.eliminar(usuarioGuardado.getId());
                expect(resultado).toBe(true);

                // Verificar que no aparece en obtenerTodos (porque está inactivo)
                const usuarioElim = await repo.buscarPorId(usuarioGuardado.getId());
                expect(usuarioElim).toBeUndefined();
            }
        });
    });
});
