module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/test/unit/**/*.test.js', '**/test/unit/**/*.spec.js'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'app/**/*.js',
        'server.js',
        '!app/assets/**',
        '!app/views/**'
    ],
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/test/',
        '/artifacts/'
    ],
    verbose: true
};
