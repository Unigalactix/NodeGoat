module.exports = {
    testEnvironment: 'node',
    testMatch: [
        '**/test/unit/**/*.test.js'
    ],
    collectCoverageFrom: [
        'app/**/*.js',
        '!app/assets/**',
        '!app/views/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    testTimeout: 10000,
    verbose: true
};
