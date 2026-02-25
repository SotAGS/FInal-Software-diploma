module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: {
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
                types: ['jest', 'node']
            }
        }]
    },
    roots: ['<rootDir>'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    collectCoverageFrom: [
        'Modelo/**/*.ts',
        'Controladoras/**/*.ts',
        '!**/*.d.ts',
        '!**/node_modules/**',
        '!**/__tests__/**'
    ],
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '.d.ts'
    ],
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
    testTimeout: 10000
};
