module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src/tests'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    testMatch: ['**/?(*.)+(spec|test).ts'],

    // Module name mapper for path aliases (match tsconfig.json paths)
    moduleNameMapper: {
        '^@src/(.*)$': '<rootDir>/src/$1',
        '^@utils/(.*)$': '<rootDir>/src/helpers/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
        '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
        '^@models/(.*)$': '<rootDir>/src/models/$1',
        '^@routes/(.*)$': '<rootDir>/src/routes/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
        '^@helpers/(.*)$': '<rootDir>/src/helpers/$1',
        '^@types/(.*)$': '<rootDir>/src/types/$1',
    },

    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.json',
        },
    },
    setupFilesAfterEnv: [],
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['src/**/*.{ts,js}', '!src/**/*.d.ts'],
};
