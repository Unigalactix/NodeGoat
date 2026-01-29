/**
 * Characterization Tests for SessionHandler
 * 
 * These tests capture the CURRENT behavior of app/routes/session.js
 * They are NOT testing ideal behavior, but documenting what the code does now.
 * This provides a safety net before refactoring.
 */

// Mock the dependencies before requiring SessionHandler
const mockUserDAOInstance = {
    validateLogin: jest.fn(),
    getUserById: jest.fn(),
    getUserByUserName: jest.fn(),
    addUser: jest.fn()
};

const mockAllocationsDAOInstance = {
    update: jest.fn()
};

jest.mock('../../app/data/user-dao', () => ({
    UserDAO: jest.fn().mockImplementation(() => mockUserDAOInstance)
}));

jest.mock('../../app/data/allocations-dao', () => ({
    AllocationsDAO: jest.fn().mockImplementation(() => mockAllocationsDAOInstance)
}));

// Mock config
jest.mock('../../config/config', () => ({
    environmentalScripts: []
}));

const SessionHandler = require('../../app/routes/session');

describe('SessionHandler - Characterization Tests', () => {
    let sessionHandler;
    let mockDb;
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDb = { collection: jest.fn() };
        sessionHandler = new SessionHandler(mockDb);
        mockReq = {
            session: {
                userId: null,
                regenerate: jest.fn((callback) => callback()),
                destroy: jest.fn((callback) => callback())
            },
            body: {}
        };
        mockRes = {
            render: jest.fn(),
            redirect: jest.fn()
        };
        mockNext = jest.fn();
    });

    describe('Constructor', () => {
        it('should create SessionHandler with all middleware functions', () => {
            expect(sessionHandler).toBeDefined();
            expect(typeof sessionHandler.isAdminUserMiddleware).toBe('function');
            expect(typeof sessionHandler.isLoggedInMiddleware).toBe('function');
            expect(typeof sessionHandler.displayLoginPage).toBe('function');
            expect(typeof sessionHandler.handleLoginRequest).toBe('function');
            expect(typeof sessionHandler.displayLogoutPage).toBe('function');
            expect(typeof sessionHandler.displaySignupPage).toBe('function');
            expect(typeof sessionHandler.handleSignup).toBe('function');
            expect(typeof sessionHandler.displayWelcomePage).toBe('function');
        });
    });


    describe('isAdminUserMiddleware', () => {
        it('should redirect to /login when no userId in session', () => {
            mockReq.session.userId = null;
            sessionHandler.isAdminUserMiddleware(mockReq, mockRes, mockNext);
            expect(mockRes.redirect).toHaveBeenCalledWith('/login');
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should redirect to /login when user is not admin', (done) => {
            mockReq.session.userId = '123';
            mockUserDAOInstance.getUserById.mockImplementation((userId, callback) => {
                callback(null, { _id: '123', userName: 'testuser', isAdmin: false });
            });
            sessionHandler.isAdminUserMiddleware(mockReq, mockRes, mockNext);
            setImmediate(() => {
                expect(mockUserDAOInstance.getUserById).toHaveBeenCalledWith('123', expect.any(Function));
                expect(mockRes.redirect).toHaveBeenCalledWith('/login');
                expect(mockNext).not.toHaveBeenCalled();
                done();
            });
        });

        it('should call next() when user is admin', (done) => {
            mockReq.session.userId = '456';
            mockUserDAOInstance.getUserById.mockImplementation((userId, callback) => {
                callback(null, { _id: '456', userName: 'admin', isAdmin: true });
            });
            sessionHandler.isAdminUserMiddleware(mockReq, mockRes, mockNext);
            setImmediate(() => {
                expect(mockUserDAOInstance.getUserById).toHaveBeenCalledWith('456', expect.any(Function));
                expect(mockNext).toHaveBeenCalled();
                expect(mockRes.redirect).not.toHaveBeenCalled();
                done();
            });
        });

        it('should redirect to /login when user is null', (done) => {
            mockReq.session.userId = '789';
            mockUserDAOInstance.getUserById.mockImplementation((userId, callback) => {
                callback(null, null);
            });
            sessionHandler.isAdminUserMiddleware(mockReq, mockRes, mockNext);
            setImmediate(() => {
                expect(mockRes.redirect).toHaveBeenCalledWith('/login');
                expect(mockNext).not.toHaveBeenCalled();
                done();
            });
        });
    });

    describe('displayLogoutPage', () => {
        it('should destroy session and redirect to /', (done) => {
            sessionHandler.displayLogoutPage(mockReq, mockRes);
            setImmediate(() => {
                expect(mockReq.session.destroy).toHaveBeenCalled();
                expect(mockRes.redirect).toHaveBeenCalledWith('/');
                done();
            });
        });
    });

    describe('isLoggedInMiddleware', () => {
        it('should redirect to /login when no userId in session', () => {
            mockReq.session.userId = null;
            sessionHandler.isLoggedInMiddleware(mockReq, mockRes, mockNext);
            expect(mockRes.redirect).toHaveBeenCalledWith('/login');
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should call next() when userId exists in session', () => {
            mockReq.session.userId = '123';
            sessionHandler.isLoggedInMiddleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.redirect).not.toHaveBeenCalled();
        });
    });

    describe('displayLoginPage', () => {
        it('should render login page with empty fields', () => {
            sessionHandler.displayLoginPage(mockReq, mockRes, mockNext);
            expect(mockRes.render).toHaveBeenCalledWith('login', {
                userName: '',
                password: '',
                loginError: '',
                environmentalScripts: []
            });
        });
    });

    describe('handleLoginRequest', () => {
        beforeEach(() => {
            mockReq.body = { userName: 'testuser', password: 'testpass' };
        });

        it('should render login with invalid username error', (done) => {
            mockUserDAOInstance.validateLogin.mockImplementation((userName, password, callback) => {
                callback({ noSuchUser: true }, null);
            });
            sessionHandler.handleLoginRequest(mockReq, mockRes, mockNext);
            setImmediate(() => {
                expect(mockRes.render).toHaveBeenCalledWith('login', {
                    userName: 'testuser',
                    password: '',
                    loginError: 'Invalid username',
                    environmentalScripts: []
                });
                done();
            });
        });

        it('should redirect non-admin user to /dashboard on success', (done) => {
            const mockUser = { _id: '123', userName: 'testuser', isAdmin: false };
            mockUserDAOInstance.validateLogin.mockImplementation((userName, password, callback) => {
                callback(null, mockUser);
            });
            sessionHandler.handleLoginRequest(mockReq, mockRes, mockNext);
            setImmediate(() => {
                expect(mockReq.session.userId).toBe('123');
                expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
                done();
            });
        });

        it('should NOT regenerate session on login (A2 vulnerability)', (done) => {
            const mockUser = { _id: '123', userName: 'testuser', isAdmin: false };
            mockUserDAOInstance.validateLogin.mockImplementation((userName, password, callback) => {
                callback(null, mockUser);
            });
            sessionHandler.handleLoginRequest(mockReq, mockRes, mockNext);
            setImmediate(() => {
                expect(mockReq.session.regenerate).not.toHaveBeenCalled();
                done();
            });
        });
    });

    describe('displaySignupPage', () => {
        it('should render signup page with empty fields', () => {
            sessionHandler.displaySignupPage(mockReq, mockRes);
            expect(mockRes.render).toHaveBeenCalledWith('signup', {
                userName: '',
                password: '',
                passwordError: '',
                email: '',
                userNameError: '',
                emailError: '',
                verifyError: '',
                environmentalScripts: []
            });
        });
    });

    describe('handleSignup', () => {
        beforeEach(() => {
            mockReq.body = {
                userName: 'newuser',
                firstName: 'John',
                lastName: 'Doe',
                password: 'password123',
                verify: 'password123',
                email: 'john@example.com'
            };
        });

        it('should reject empty username', () => {
            mockReq.body.userName = '';
            sessionHandler.handleSignup(mockReq, mockRes, mockNext);
            expect(mockRes.render).toHaveBeenCalledWith('signup', expect.objectContaining({
                userNameError: 'Invalid user name.'
            }));
        });

        it('should reject username > 20 chars', () => {
            mockReq.body.userName = 'a'.repeat(21);
            sessionHandler.handleSignup(mockReq, mockRes, mockNext);
            expect(mockRes.render).toHaveBeenCalledWith('signup', expect.objectContaining({
                userNameError: 'Invalid user name.'
            }));
        });

        it('should reject password > 20 chars', () => {
            mockReq.body.password = 'a'.repeat(21);
            mockReq.body.verify = 'a'.repeat(21);
            sessionHandler.handleSignup(mockReq, mockRes, mockNext);
            expect(mockRes.render).toHaveBeenCalledWith('signup', expect.objectContaining({
                passwordError: expect.stringContaining('Password must be')
            }));
        });

        it('should accept weak 1-char password (A2-2 vulnerability)', (done) => {
            mockReq.body.password = 'a';
            mockReq.body.verify = 'a';
            mockUserDAOInstance.getUserByUserName.mockImplementation((userName, callback) => {
                callback(null, null);
            });
            mockUserDAOInstance.addUser.mockImplementation((userName, firstName, lastName, password, email, callback) => {
                callback(null, { _id: '789', userName });
            });
            mockAllocationsDAOInstance.update.mockImplementation((userId, stocks, funds, bonds, callback) => {
                callback(null);
            });
            sessionHandler.handleSignup(mockReq, mockRes, mockNext);
            setImmediate(() => {
                expect(mockRes.render).toHaveBeenCalledWith('dashboard', expect.anything());
                done();
            });
        });

        it('should create user and render dashboard on success', (done) => {
            const mockUser = { _id: '789', userName: 'newuser', firstName: 'John', lastName: 'Doe' };
            mockUserDAOInstance.getUserByUserName.mockImplementation((userName, callback) => {
                callback(null, null);
            });
            mockUserDAOInstance.addUser.mockImplementation((userName, firstName, lastName, password, email, callback) => {
                callback(null, mockUser);
            });
            mockAllocationsDAOInstance.update.mockImplementation((userId, stocks, funds, bonds, callback) => {
                callback(null);
            });
            sessionHandler.handleSignup(mockReq, mockRes, mockNext);
            setImmediate(() => {
                expect(mockReq.session.regenerate).toHaveBeenCalled();
                expect(mockReq.session.userId).toBe('789');
                expect(mockRes.render).toHaveBeenCalledWith('dashboard', expect.objectContaining({
                    userId: '789'
                }));
                done();
            });
        });
    });

    describe('displayWelcomePage', () => {
        it('should redirect to /login when no userId', () => {
            mockReq.session.userId = null;
            sessionHandler.displayWelcomePage(mockReq, mockRes, mockNext);
            expect(mockRes.redirect).toHaveBeenCalledWith('/login');
        });

        it('should render dashboard with user data when userId exists', (done) => {
            mockReq.session.userId = '123';
            const mockUser = { _id: '123', userName: 'testuser', firstName: 'Test', lastName: 'User' };
            mockUserDAOInstance.getUserById.mockImplementation((userId, callback) => {
                callback(null, mockUser);
            });
            sessionHandler.displayWelcomePage(mockReq, mockRes, mockNext);
            setImmediate(() => {
                expect(mockRes.render).toHaveBeenCalledWith('dashboard', expect.objectContaining({
                    userId: '123'
                }));
                done();
            });
        });
    });
});
