/**
 * Characterization Tests for app/routes/index.js
 * 
 * These tests capture the current behavior of the routing configuration module.
 * They are designed to establish a safety net before any refactoring.
 * 
 * IMPORTANT: These tests document EXISTING behavior as of the time they were written.
 * When refactoring, if behavior changes are intentional, update these tests deliberately
 * to reflect the new expected behavior. Do not modify tests just to make them pass.
 */

const index = require('../../app/routes/index');

describe('app/routes/index.js - Characterization Tests', () => {
    
    describe('Module Exports', () => {
        test('should export a function', () => {
            expect(typeof index).toBe('function');
        });
    });

    describe('Route Registration', () => {
        let mockApp;
        let mockDb;
        let registeredRoutes;

        beforeEach(() => {
            registeredRoutes = [];
            
            // Mock Express app
            mockApp = {
                get: jest.fn((path, ...handlers) => {
                    registeredRoutes.push({ method: 'GET', path, handlers });
                }),
                post: jest.fn((path, ...handlers) => {
                    registeredRoutes.push({ method: 'POST', path, handlers });
                }),
                use: jest.fn((path, handler) => {
                    if (typeof path === 'function') {
                        registeredRoutes.push({ method: 'USE', path: '*', handlers: [path] });
                    } else {
                        registeredRoutes.push({ method: 'USE', path, handlers: [handler] });
                    }
                })
            };

            // Mock database with collection method
            const mockCollection = {
                find: jest.fn(),
                findOne: jest.fn(),
                insert: jest.fn(),
                update: jest.fn(),
                remove: jest.fn()
            };
            
            mockDb = {
                collection: jest.fn(() => mockCollection)
            };
        });

        test('should register routes when called with app and db', () => {
            expect(() => {
                index(mockApp, mockDb);
            }).not.toThrow();
        });

        test('should register the root path GET route', () => {
            index(mockApp, mockDb);
            
            const rootRoute = registeredRoutes.find(r => 
                r.method === 'GET' && r.path === '/'
            );
            
            expect(rootRoute).toBeDefined();
            expect(rootRoute.handlers).toHaveLength(1);
        });

        test('should register login GET and POST routes', () => {
            index(mockApp, mockDb);
            
            const loginGetRoute = registeredRoutes.find(r => 
                r.method === 'GET' && r.path === '/login'
            );
            const loginPostRoute = registeredRoutes.find(r => 
                r.method === 'POST' && r.path === '/login'
            );
            
            expect(loginGetRoute).toBeDefined();
            expect(loginGetRoute.handlers).toHaveLength(1);
            expect(loginPostRoute).toBeDefined();
            expect(loginPostRoute.handlers).toHaveLength(1);
        });

        test('should register signup GET and POST routes', () => {
            index(mockApp, mockDb);
            
            const signupGetRoute = registeredRoutes.find(r => 
                r.method === 'GET' && r.path === '/signup'
            );
            const signupPostRoute = registeredRoutes.find(r => 
                r.method === 'POST' && r.path === '/signup'
            );
            
            expect(signupGetRoute).toBeDefined();
            expect(signupGetRoute.handlers).toHaveLength(1);
            expect(signupPostRoute).toBeDefined();
            expect(signupPostRoute.handlers).toHaveLength(1);
        });

        test('should register logout GET route', () => {
            index(mockApp, mockDb);
            
            const logoutRoute = registeredRoutes.find(r => 
                r.method === 'GET' && r.path === '/logout'
            );
            
            expect(logoutRoute).toBeDefined();
            expect(logoutRoute.handlers).toHaveLength(1);
        });

        test('should register dashboard GET route with isLoggedIn middleware', () => {
            index(mockApp, mockDb);
            
            const dashboardRoute = registeredRoutes.find(r => 
                r.method === 'GET' && r.path === '/dashboard'
            );
            
            expect(dashboardRoute).toBeDefined();
            // Should have 2 handlers: isLoggedIn middleware and the handler
            expect(dashboardRoute.handlers.length).toBeGreaterThanOrEqual(2);
        });

        test('should register profile GET and POST routes with isLoggedIn middleware', () => {
            index(mockApp, mockDb);
            
            const profileGetRoute = registeredRoutes.find(r => 
                r.method === 'GET' && r.path === '/profile'
            );
            const profilePostRoute = registeredRoutes.find(r => 
                r.method === 'POST' && r.path === '/profile'
            );
            
            expect(profileGetRoute).toBeDefined();
            expect(profileGetRoute.handlers.length).toBeGreaterThanOrEqual(2);
            expect(profilePostRoute).toBeDefined();
            expect(profilePostRoute.handlers.length).toBeGreaterThanOrEqual(2);
        });

        test('should register contributions GET and POST routes with isLoggedIn middleware', () => {
            index(mockApp, mockDb);
            
            const contributionsGetRoute = registeredRoutes.find(r => 
                r.method === 'GET' && r.path === '/contributions'
            );
            const contributionsPostRoute = registeredRoutes.find(r => 
                r.method === 'POST' && r.path === '/contributions'
            );
            
            expect(contributionsGetRoute).toBeDefined();
            expect(contributionsGetRoute.handlers.length).toBeGreaterThanOrEqual(2);
            expect(contributionsPostRoute).toBeDefined();
            expect(contributionsPostRoute.handlers.length).toBeGreaterThanOrEqual(2);
        });

        test('should register benefits GET and POST routes with isLoggedIn middleware', () => {
            index(mockApp, mockDb);
            
            const benefitsGetRoute = registeredRoutes.find(r => 
                r.method === 'GET' && r.path === '/benefits'
            );
            const benefitsPostRoute = registeredRoutes.find(r => 
                r.method === 'POST' && r.path === '/benefits'
            );
            
            expect(benefitsGetRoute).toBeDefined();
            expect(benefitsGetRoute.handlers.length).toBeGreaterThanOrEqual(2);
            expect(benefitsPostRoute).toBeDefined();
            expect(benefitsPostRoute.handlers.length).toBeGreaterThanOrEqual(2);
        });

        test('should register allocations GET route with userId parameter and isLoggedIn middleware', () => {
            index(mockApp, mockDb);
            
            const allocationsRoute = registeredRoutes.find(r => 
                r.method === 'GET' && r.path === '/allocations/:userId'
            );
            
            expect(allocationsRoute).toBeDefined();
            expect(allocationsRoute.handlers.length).toBeGreaterThanOrEqual(2);
        });

        test('should register memos GET and POST routes with isLoggedIn middleware', () => {
            index(mockApp, mockDb);
            
            const memosGetRoute = registeredRoutes.find(r => 
                r.method === 'GET' && r.path === '/memos'
            );
            const memosPostRoute = registeredRoutes.find(r => 
                r.method === 'POST' && r.path === '/memos'
            );
            
            expect(memosGetRoute).toBeDefined();
            expect(memosGetRoute.handlers.length).toBeGreaterThanOrEqual(2);
            expect(memosPostRoute).toBeDefined();
            expect(memosPostRoute.handlers.length).toBeGreaterThanOrEqual(2);
        });

        test('should register learn GET route with isLoggedIn middleware', () => {
            index(mockApp, mockDb);
            
            const learnRoute = registeredRoutes.find(r => 
                r.method === 'GET' && r.path === '/learn'
            );
            
            expect(learnRoute).toBeDefined();
            expect(learnRoute.handlers.length).toBeGreaterThanOrEqual(2);
        });

        test('should register research GET route with isLoggedIn middleware', () => {
            index(mockApp, mockDb);
            
            const researchRoute = registeredRoutes.find(r => 
                r.method === 'GET' && r.path === '/research'
            );
            
            expect(researchRoute).toBeDefined();
            expect(researchRoute.handlers.length).toBeGreaterThanOrEqual(2);
        });

        test('should mount tutorial router at /tutorial', () => {
            index(mockApp, mockDb);
            
            const tutorialRoute = registeredRoutes.find(r => 
                r.method === 'USE' && r.path === '/tutorial'
            );
            
            expect(tutorialRoute).toBeDefined();
            expect(tutorialRoute.handlers).toHaveLength(1);
        });

        test('should register error handler middleware last', () => {
            index(mockApp, mockDb);
            
            // Error handler should be registered with app.use() and be the last middleware
            const useRoutes = registeredRoutes.filter(r => r.method === 'USE');
            expect(useRoutes.length).toBeGreaterThanOrEqual(1);
            
            // The last USE should be the error handler
            const lastUse = useRoutes[useRoutes.length - 1];
            expect(lastUse.handlers).toHaveLength(1);
        });

        test('should register exactly the expected number of routes', () => {
            index(mockApp, mockDb);
            
            // Count all registered routes
            const getMethods = registeredRoutes.filter(r => r.method === 'GET');
            const postMethods = registeredRoutes.filter(r => r.method === 'POST');
            const useMethods = registeredRoutes.filter(r => r.method === 'USE');
            
            // Verify we have the expected number of each type
            expect(getMethods.length).toBe(12); // /, /login, /signup, /logout, /dashboard, /profile, /contributions, /benefits, /allocations/:userId, /memos, /learn, /research
            expect(postMethods.length).toBe(6); // /login, /signup, /profile, /contributions, /benefits, /memos
            expect(useMethods.length).toBe(2); // /tutorial, error handler
        });
    });

    describe('Learn Route Behavior', () => {
        let mockApp;
        let mockDb;
        let learnHandler;

        beforeEach(() => {
            mockApp = {
                get: jest.fn((path, ...handlers) => {
                    if (path === '/learn') {
                        // Store the actual handler (last one after middleware)
                        learnHandler = handlers[handlers.length - 1];
                    }
                }),
                post: jest.fn(),
                use: jest.fn()
            };
            
            // Mock database with collection method
            const mockCollection = {
                find: jest.fn(),
                findOne: jest.fn(),
                insert: jest.fn(),
                update: jest.fn(),
                remove: jest.fn()
            };
            
            mockDb = {
                collection: jest.fn(() => mockCollection)
            };
        });

        test('should register a handler for /learn route', () => {
            index(mockApp, mockDb);
            expect(learnHandler).toBeDefined();
            expect(typeof learnHandler).toBe('function');
        });

        test('/learn handler should accept req and res parameters', () => {
            index(mockApp, mockDb);
            
            // The handler should be a function with at least 2 parameters (req, res)
            expect(learnHandler.length).toBeGreaterThanOrEqual(2);
        });

        test('/learn handler should redirect using unvalidated req.query.url (SECURITY VULNERABILITY)', () => {
            index(mockApp, mockDb);
            
            const mockReq = {
                query: {
                    url: 'http://example.com'
                }
            };
            const mockRes = {
                redirect: jest.fn()
            };

            learnHandler(mockReq, mockRes);
            
            // This documents a known security vulnerability - open redirect
            // The handler does not validate req.query.url before redirecting
            expect(mockRes.redirect).toHaveBeenCalledWith('http://example.com');
            expect(mockRes.redirect).toHaveBeenCalledTimes(1);
        });

        test('/learn handler should redirect to undefined if query.url is not provided (SECURITY VULNERABILITY)', () => {
            index(mockApp, mockDb);
            
            const mockReq = {
                query: {}
            };
            const mockRes = {
                redirect: jest.fn()
            };

            learnHandler(mockReq, mockRes);
            
            // This documents current behavior - no validation of url parameter
            expect(mockRes.redirect).toHaveBeenCalledWith(undefined);
            expect(mockRes.redirect).toHaveBeenCalledTimes(1);
        });
    });

    describe('Handler Initialization', () => {
        let mockApp;
        let mockDb;

        beforeEach(() => {
            mockApp = {
                get: jest.fn(),
                post: jest.fn(),
                use: jest.fn()
            };
            
            // Mock database with collection method
            const mockCollection = {
                find: jest.fn(),
                findOne: jest.fn(),
                insert: jest.fn(),
                update: jest.fn(),
                remove: jest.fn()
            };
            
            mockDb = {
                collection: jest.fn(() => mockCollection)
            };
        });

        test('should pass database instance to handler constructors and call db.collection', () => {
            // This test verifies that handlers receive the db instance
            // and that db.collection is called during initialization
            index(mockApp, mockDb);
            
            // Verify db.collection was called (handlers initialize their collections)
            expect(mockDb.collection).toHaveBeenCalled();
            // Multiple handlers should request their collections
            expect(mockDb.collection.mock.calls.length).toBeGreaterThan(0);
        });

        test('should initialize SessionHandler', () => {
            // Verify SessionHandler is required and used
            const SessionHandler = require('../../app/routes/session');
            expect(SessionHandler).toBeDefined();
            expect(typeof SessionHandler).toBe('function');
        });

        test('should initialize ProfileHandler', () => {
            const ProfileHandler = require('../../app/routes/profile');
            expect(ProfileHandler).toBeDefined();
            expect(typeof ProfileHandler).toBe('function');
        });

        test('should initialize BenefitsHandler', () => {
            const BenefitsHandler = require('../../app/routes/benefits');
            expect(BenefitsHandler).toBeDefined();
            expect(typeof BenefitsHandler).toBe('function');
        });

        test('should initialize ContributionsHandler', () => {
            const ContributionsHandler = require('../../app/routes/contributions');
            expect(ContributionsHandler).toBeDefined();
            expect(typeof ContributionsHandler).toBe('function');
        });

        test('should initialize AllocationsHandler', () => {
            const AllocationsHandler = require('../../app/routes/allocations');
            expect(AllocationsHandler).toBeDefined();
            expect(typeof AllocationsHandler).toBe('function');
        });

        test('should initialize MemosHandler', () => {
            const MemosHandler = require('../../app/routes/memos');
            expect(MemosHandler).toBeDefined();
            expect(typeof MemosHandler).toBe('function');
        });

        test('should initialize ResearchHandler', () => {
            const ResearchHandler = require('../../app/routes/research');
            expect(ResearchHandler).toBeDefined();
            expect(typeof ResearchHandler).toBe('function');
        });

        test('should require tutorial router', () => {
            const tutorialRouter = require('../../app/routes/tutorial');
            expect(tutorialRouter).toBeDefined();
        });

        test('should require error handler', () => {
            const { errorHandler } = require('../../app/routes/error');
            expect(errorHandler).toBeDefined();
            expect(typeof errorHandler).toBe('function');
        });
    });

    describe('Middleware Application', () => {
        let mockApp;
        let mockDb;
        let capturedMiddleware;

        beforeEach(() => {
            capturedMiddleware = {};
            
            mockApp = {
                get: jest.fn((path, ...handlers) => {
                    capturedMiddleware[path] = handlers;
                }),
                post: jest.fn((path, ...handlers) => {
                    capturedMiddleware[path] = handlers;
                }),
                use: jest.fn()
            };
            
            // Mock database with collection method
            const mockCollection = {
                find: jest.fn(),
                findOne: jest.fn(),
                insert: jest.fn(),
                update: jest.fn(),
                remove: jest.fn()
            };
            
            mockDb = {
                collection: jest.fn(() => mockCollection)
            };
        });

        test('should apply middleware before handlers on protected routes', () => {
            index(mockApp, mockDb);
            
            // Routes that should have middleware (isLoggedIn)
            const protectedRoutes = [
                '/dashboard',
                '/profile',
                '/contributions',
                '/benefits',
                '/allocations/:userId',
                '/memos',
                '/learn',
                '/research'
            ];

            protectedRoutes.forEach(route => {
                expect(capturedMiddleware[route]).toBeDefined();
                expect(capturedMiddleware[route].length).toBeGreaterThanOrEqual(2);
            });
        });

        test('should not apply authentication middleware to public routes', () => {
            index(mockApp, mockDb);
            
            // Public routes should have only 1 handler (no middleware)
            const publicRoutes = [
                '/',
                '/login',
                '/signup',
                '/logout'
            ];

            publicRoutes.forEach(route => {
                expect(capturedMiddleware[route]).toBeDefined();
                expect(capturedMiddleware[route].length).toBe(1);
            });
        });

        test('should use the same middleware function for all protected routes', () => {
            index(mockApp, mockDb);
            
            // Get the middleware from dashboard route (first handler)
            const dashboardMiddleware = capturedMiddleware['/dashboard'][0];
            
            // Verify same middleware is used on other protected routes
            expect(capturedMiddleware['/profile'][0]).toBe(dashboardMiddleware);
            expect(capturedMiddleware['/contributions'][0]).toBe(dashboardMiddleware);
            expect(capturedMiddleware['/benefits'][0]).toBe(dashboardMiddleware);
        });
    });

    describe('Route Order', () => {
        test('should register error handler after all route handlers', () => {
            const routeRegistrationOrder = [];
            
            const mockApp = {
                get: jest.fn((path) => {
                    routeRegistrationOrder.push({ type: 'route', method: 'GET', path });
                }),
                post: jest.fn((path) => {
                    routeRegistrationOrder.push({ type: 'route', method: 'POST', path });
                }),
                use: jest.fn((path) => {
                    if (typeof path === 'string') {
                        routeRegistrationOrder.push({ type: 'middleware', method: 'USE', path });
                    } else {
                        routeRegistrationOrder.push({ type: 'middleware', method: 'USE', path: '*' });
                    }
                })
            };
            
            // Mock database with collection method
            const mockCollection = {
                find: jest.fn(),
                findOne: jest.fn(),
                insert: jest.fn(),
                update: jest.fn(),
                remove: jest.fn()
            };
            
            const mockDb = {
                collection: jest.fn(() => mockCollection)
            };
            
            index(mockApp, mockDb);
            
            // Find positions of last route and error handler
            const lastRouteIndex = routeRegistrationOrder.map(r => r.type).lastIndexOf('route');
            const errorHandlerIndex = routeRegistrationOrder.findIndex(r => 
                r.type === 'middleware' && r.path === '*'
            );
            
            // Error handler should come after all routes
            expect(errorHandlerIndex).toBeGreaterThan(lastRouteIndex);
        });
    });

    describe('Module Dependencies', () => {
        test('should require all necessary route handlers', () => {
            // Verify that the module can require all its dependencies
            expect(() => {
                require('../../app/routes/session');
                require('../../app/routes/profile');
                require('../../app/routes/benefits');
                require('../../app/routes/contributions');
                require('../../app/routes/allocations');
                require('../../app/routes/memos');
                require('../../app/routes/research');
                require('../../app/routes/tutorial');
                require('../../app/routes/error');
            }).not.toThrow();
        });
    });
});
