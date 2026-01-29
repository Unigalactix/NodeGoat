const should = require("should");
const SessionHandler = require("../../app/routes/session");

describe("SessionHandler - Characterization Tests", function() {
    "use strict";

    let sessionHandler;
    let mockDb;
    let mockReq;
    let mockRes;
    let mockNext;
    let userCollection;
    let allocationsCollection;

    beforeEach(function() {
        // Mock collections
        userCollection = {
            insert: function(doc, callback) {
                callback(null, { ops: [doc] });
            },
            findOne: function(query, callback) {
                callback(null, null);
            },
            update: function(query, doc, opts, callback) {
                callback(null, { result: { n: 1 } });
            }
        };

        allocationsCollection = {
            update: function(query, doc, opts, callback) {
                callback(null, { result: { n: 1 } });
            },
            findOne: function(query, callback) {
                callback(null, null);
            }
        };

        const countersCollection = {
            findAndModify: function(query, sort, update, opts, callback) {
                callback(null, { value: { _id: "userId", seq: 1 } });
            }
        };

        // Mock database object
        mockDb = {
            collection: function(name) {
                if (name === "users") {
                    return userCollection;
                }
                if (name === "allocations") {
                    return allocationsCollection;
                }
                if (name === "counters") {
                    return countersCollection;
                }
                return {};
            }
        };

        // Create session handler instance
        sessionHandler = new SessionHandler(mockDb);

        // Mock request object
        mockReq = {
            session: {},
            body: {},
            query: {}
        };

        // Mock response object
        mockRes = {
            redirect: function(path) {
                this.redirectPath = path;
            },
            render: function(view, data) {
                this.renderedView = view;
                this.renderedData = data;
            },
            redirectPath: null,
            renderedView: null,
            renderedData: null
        };

        // Mock next function
        mockNext = function(err) {
            mockNext.called = true;
            mockNext.error = err;
        };
        mockNext.called = false;
        mockNext.error = null;
    });

    describe("isAdminUserMiddleware", function() {
        it("should redirect to /login when no userId in session", function() {
            mockReq.session = {};
            
            sessionHandler.isAdminUserMiddleware(mockReq, mockRes, mockNext);
            
            mockRes.redirectPath.should.equal("/login");
        });

        it("should redirect to /login when user is not admin", function(done) {
            this.timeout(5000);
            mockReq.session.userId = "123";
            
            // Mock getUserById to return non-admin user
            userCollection.findOne = function(query, callback) {
                callback(null, { _id: 123, userName: "user1", isAdmin: false });
            };
            
            sessionHandler.isAdminUserMiddleware(mockReq, mockRes, function() {
                // Should not call next
                done(new Error("Should not call next for non-admin user"));
            });
            
            setTimeout(function() {
                try {
                    mockRes.redirectPath.should.equal("/login");
                    done();
                } catch (e) {
                    done(e);
                }
            }, 100);
        });

        it("should call next when user is admin", function(done) {
            this.timeout(5000);
            mockReq.session.userId = "123";
            
            // Mock getUserById to return admin user
            userCollection.findOne = function(query, callback) {
                callback(null, { _id: 123, userName: "admin", isAdmin: true });
            };
            
            sessionHandler.isAdminUserMiddleware(mockReq, mockRes, function() {
                done();
            });
        });
    });

    describe("isLoggedInMiddleware", function() {
        it("should call next when userId exists in session", function() {
            mockReq.session.userId = "123";
            
            sessionHandler.isLoggedInMiddleware(mockReq, mockRes, mockNext);
            
            mockNext.called.should.equal(true);
        });

        it("should redirect to /login when no userId in session", function() {
            mockReq.session = {};
            
            sessionHandler.isLoggedInMiddleware(mockReq, mockRes, mockNext);
            
            mockRes.redirectPath.should.equal("/login");
            mockNext.called.should.equal(false);
        });
    });

    describe("displayLoginPage", function() {
        it("should render login view with empty credentials and no error", function() {
            sessionHandler.displayLoginPage(mockReq, mockRes, mockNext);
            
            mockRes.renderedView.should.equal("login");
            should.exist(mockRes.renderedData);
            mockRes.renderedData.userName.should.equal("");
            mockRes.renderedData.password.should.equal("");
            mockRes.renderedData.loginError.should.equal("");
        });

        it("should include environmentalScripts in rendered data", function() {
            sessionHandler.displayLoginPage(mockReq, mockRes, mockNext);
            
            should.exist(mockRes.renderedData.environmentalScripts);
        });
    });

    describe("handleLoginRequest", function() {
        it("should render login with error for non-existent user", function(done) {
            this.timeout(5000);
            mockReq.body = {
                userName: "nonexistent",
                password: "password123"
            };
            
            // Mock getUserByUserName to return null (no user)
            userCollection.findOne = function(query, callback) {
                callback(null, null);
            };
            
            sessionHandler.handleLoginRequest(mockReq, mockRes, mockNext);
            
            setTimeout(function() {
                try {
                    mockRes.renderedView.should.equal("login");
                    mockRes.renderedData.userName.should.equal("nonexistent");
                    mockRes.renderedData.password.should.equal("");
                    mockRes.renderedData.loginError.should.equal("Invalid username");
                    done();
                } catch (e) {
                    done(e);
                }
            }, 100);
        });

        it("should render login with error for invalid password", function(done) {
            this.timeout(5000);
            mockReq.body = {
                userName: "user1",
                password: "wrongpassword"
            };
            
            // Mock getUserByUserName to return user but wrong password
            userCollection.findOne = function(query, callback) {
                if (query.userName) {
                    callback(null, { _id: 1, userName: "user1", password: "correctpassword" });
                } else {
                    callback(null, null);
                }
            };
            
            sessionHandler.handleLoginRequest(mockReq, mockRes, mockNext);
            
            setTimeout(function() {
                try {
                    mockRes.renderedView.should.equal("login");
                    mockRes.renderedData.userName.should.equal("user1");
                    mockRes.renderedData.password.should.equal("");
                    mockRes.renderedData.loginError.should.equal("Invalid password");
                    done();
                } catch (e) {
                    done(e);
                }
            }, 100);
        });

        it("should set session userId and redirect to /dashboard for regular user", function(done) {
            this.timeout(5000);
            mockReq.body = {
                userName: "user1",
                password: "User1_123"
            };
            mockReq.session = {};
            
            // Mock successful login for regular user
            userCollection.findOne = function(query, callback) {
                callback(null, { _id: 1, userName: "user1", password: "User1_123", isAdmin: false });
            };
            
            sessionHandler.handleLoginRequest(mockReq, mockRes, mockNext);
            
            setTimeout(function() {
                try {
                    mockReq.session.userId.should.equal(1);
                    mockRes.redirectPath.should.equal("/dashboard");
                    done();
                } catch (e) {
                    done(e);
                }
            }, 100);
        });

        it("should set session userId and redirect to /benefits for admin user", function(done) {
            this.timeout(5000);
            mockReq.body = {
                userName: "admin",
                password: "Admin_123"
            };
            mockReq.session = {};
            
            // Mock successful login for admin user
            userCollection.findOne = function(query, callback) {
                callback(null, { _id: 2, userName: "admin", password: "Admin_123", isAdmin: true });
            };
            
            sessionHandler.handleLoginRequest(mockReq, mockRes, mockNext);
            
            setTimeout(function() {
                try {
                    mockReq.session.userId.should.equal(2);
                    mockRes.redirectPath.should.equal("/benefits");
                    done();
                } catch (e) {
                    done(e);
                }
            }, 100);
        });

        it("should call next with error for unexpected errors", function(done) {
            this.timeout(5000);
            mockReq.body = {
                userName: "user1",
                password: "password"
            };
            
            // Mock database error
            userCollection.findOne = function(query, callback) {
                callback(new Error("Database error"), null);
            };
            
            sessionHandler.handleLoginRequest(mockReq, mockRes, function(err) {
                try {
                    should.exist(err);
                    err.message.should.equal("Database error");
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe("displayLogoutPage", function() {
        it("should destroy session and redirect to /", function(done) {
            mockReq.session = {
                userId: "123",
                destroy: function(callback) {
                    callback();
                }
            };
            
            sessionHandler.displayLogoutPage(mockReq, mockRes);
            
            setTimeout(function() {
                mockRes.redirectPath.should.equal("/");
                done();
            }, 10);
        });
    });

    describe("displaySignupPage", function() {
        it("should render signup view with empty fields and no errors", function() {
            sessionHandler.displaySignupPage(mockReq, mockRes);
            
            mockRes.renderedView.should.equal("signup");
            should.exist(mockRes.renderedData);
            mockRes.renderedData.userName.should.equal("");
            mockRes.renderedData.password.should.equal("");
            mockRes.renderedData.passwordError.should.equal("");
            mockRes.renderedData.email.should.equal("");
            mockRes.renderedData.userNameError.should.equal("");
            mockRes.renderedData.emailError.should.equal("");
            mockRes.renderedData.verifyError.should.equal("");
        });

        it("should include environmentalScripts in rendered data", function() {
            sessionHandler.displaySignupPage(mockReq, mockRes);
            
            should.exist(mockRes.renderedData.environmentalScripts);
        });
    });

    describe("handleSignup - validation", function() {
        it("should reject invalid username (empty)", function(done) {
            mockReq.body = {
                userName: "",
                firstName: "John",
                lastName: "Doe",
                password: "Password123",
                verify: "Password123",
                email: "john@example.com"
            };
            
            sessionHandler.handleSignup(mockReq, mockRes, mockNext);
            
            setTimeout(function() {
                mockRes.renderedView.should.equal("signup");
                mockRes.renderedData.userNameError.should.equal("Invalid user name.");
                done();
            }, 10);
        });

        it("should reject username longer than 20 characters", function(done) {
            mockReq.body = {
                userName: "a".repeat(21),
                firstName: "John",
                lastName: "Doe",
                password: "Password123",
                verify: "Password123",
                email: "john@example.com"
            };
            
            sessionHandler.handleSignup(mockReq, mockRes, mockNext);
            
            setTimeout(function() {
                mockRes.renderedView.should.equal("signup");
                mockRes.renderedData.userNameError.should.equal("Invalid user name.");
                done();
            }, 10);
        });

        it("should reject invalid firstName (empty)", function(done) {
            mockReq.body = {
                userName: "john",
                firstName: "",
                lastName: "Doe",
                password: "Password123",
                verify: "Password123",
                email: "john@example.com"
            };
            
            sessionHandler.handleSignup(mockReq, mockRes, mockNext);
            
            setTimeout(function() {
                mockRes.renderedView.should.equal("signup");
                mockRes.renderedData.firstNameError.should.equal("Invalid first name.");
                done();
            }, 10);
        });

        it("should reject invalid lastName (empty)", function(done) {
            mockReq.body = {
                userName: "john",
                firstName: "John",
                lastName: "",
                password: "Password123",
                verify: "Password123",
                email: "john@example.com"
            };
            
            sessionHandler.handleSignup(mockReq, mockRes, mockNext);
            
            setTimeout(function() {
                mockRes.renderedView.should.equal("signup");
                mockRes.renderedData.lastNameError.should.equal("Invalid last name.");
                done();
            }, 10);
        });

        it("should reject password longer than 20 characters", function(done) {
            mockReq.body = {
                userName: "john",
                firstName: "John",
                lastName: "Doe",
                password: "a".repeat(21),
                verify: "a".repeat(21),
                email: "john@example.com"
            };
            
            sessionHandler.handleSignup(mockReq, mockRes, mockNext);
            
            setTimeout(function() {
                try {
                    mockRes.renderedView.should.equal("signup");
                    mockRes.renderedData.passwordError.should.match(/Password must be/);
                    done();
                } catch (e) {
                    done(e);
                }
            }, 100);
        });

        it("should reject mismatched password and verify", function(done) {
            mockReq.body = {
                userName: "john",
                firstName: "John",
                lastName: "Doe",
                password: "Password123",
                verify: "DifferentPassword",
                email: "john@example.com"
            };
            
            sessionHandler.handleSignup(mockReq, mockRes, mockNext);
            
            setTimeout(function() {
                mockRes.renderedView.should.equal("signup");
                mockRes.renderedData.verifyError.should.equal("Password must match");
                done();
            }, 10);
        });

        it("should reject invalid email format", function(done) {
            mockReq.body = {
                userName: "john",
                firstName: "John",
                lastName: "Doe",
                password: "Password123",
                verify: "Password123",
                email: "invalid-email"
            };
            
            sessionHandler.handleSignup(mockReq, mockRes, mockNext);
            
            setTimeout(function() {
                mockRes.renderedView.should.equal("signup");
                mockRes.renderedData.emailError.should.equal("Invalid email address");
                done();
            }, 10);
        });

        it("should accept valid signup data with email", function(done) {
            this.timeout(5000);
            mockReq.body = {
                userName: "john",
                firstName: "John",
                lastName: "Doe",
                password: "Password123",
                verify: "Password123",
                email: "john@example.com"
            };
            mockReq.session = {
                regenerate: function(callback) {
                    mockReq.session.userId = 1;
                    callback();
                }
            };
            
            const createdUser = {
                _id: 1,
                userName: "john",
                firstName: "John",
                lastName: "Doe",
                password: "Password123",
                email: "john@example.com"
            };
            
            // Mock getUserByUserName - user doesn't exist
            userCollection.findOne = function(query, callback) {
                if (query.userName) {
                    // getUserByUserName - user doesn't exist yet
                    callback(null, null);
                } else if (query._id) {
                    // getUserById - return created user
                    callback(null, createdUser);
                } else {
                    callback(null, null);
                }
            };
            
            userCollection.insert = function(doc, callback) {
                callback(null, { ops: [createdUser] });
            };
            
            sessionHandler.handleSignup(mockReq, mockRes, mockNext);
            
            setTimeout(function() {
                try {
                    mockRes.renderedView.should.equal("dashboard");
                    should.exist(mockRes.renderedData);
                    done();
                } catch (e) {
                    done(e);
                }
            }, 200);
        });

        it("should accept valid signup data without email", function(done) {
            this.timeout(5000);
            mockReq.body = {
                userName: "john",
                firstName: "John",
                lastName: "Doe",
                password: "Password123",
                verify: "Password123",
                email: ""
            };
            mockReq.session = {
                regenerate: function(callback) {
                    mockReq.session.userId = 1;
                    callback();
                }
            };
            
            const createdUser = {
                _id: 1,
                userName: "john",
                firstName: "John",
                lastName: "Doe",
                password: "Password123"
            };
            
            // Mock getUserByUserName - user doesn't exist
            userCollection.findOne = function(query, callback) {
                if (query.userName) {
                    // getUserByUserName - user doesn't exist yet
                    callback(null, null);
                } else if (query._id) {
                    // getUserById - return created user
                    callback(null, createdUser);
                } else {
                    callback(null, null);
                }
            };
            
            userCollection.insert = function(doc, callback) {
                callback(null, { ops: [createdUser] });
            };
            
            sessionHandler.handleSignup(mockReq, mockRes, mockNext);
            
            setTimeout(function() {
                try {
                    mockRes.renderedView.should.equal("dashboard");
                    done();
                } catch (e) {
                    done(e);
                }
            }, 200);
        });

        it("should reject signup when username already exists", function(done) {
            this.timeout(5000);
            mockReq.body = {
                userName: "existinguser",
                firstName: "John",
                lastName: "Doe",
                password: "Password123",
                verify: "Password123",
                email: "john@example.com"
            };
            
            // Mock getUserByUserName - user exists
            userCollection.findOne = function(query, callback) {
                if (query.userName) {
                    callback(null, { _id: 1, userName: "existinguser" });
                }
            };
            
            sessionHandler.handleSignup(mockReq, mockRes, mockNext);
            
            setTimeout(function() {
                try {
                    mockRes.renderedView.should.equal("signup");
                    mockRes.renderedData.userNameError.should.equal("User name already in use. Please choose another");
                    done();
                } catch (e) {
                    done(e);
                }
            }, 100);
        });
    });

    describe("displayWelcomePage", function() {
        it("should redirect to /login when no userId in session", function() {
            mockReq.session = {};
            
            sessionHandler.displayWelcomePage(mockReq, mockRes, mockNext);
            
            mockRes.redirectPath.should.equal("/login");
        });

        it("should render dashboard with user data when userId exists", function(done) {
            this.timeout(5000);
            mockReq.session.userId = "123";
            
            // Mock getUserById
            userCollection.findOne = function(query, callback) {
                callback(null, {
                    _id: 123,
                    userName: "user1",
                    firstName: "John",
                    lastName: "Doe"
                });
            };
            
            sessionHandler.displayWelcomePage(mockReq, mockRes, mockNext);
            
            setTimeout(function() {
                try {
                    mockRes.renderedView.should.equal("dashboard");
                    should.exist(mockRes.renderedData);
                    mockRes.renderedData.userId.should.equal("123");
                    mockRes.renderedData.userName.should.equal("user1");
                    done();
                } catch (e) {
                    done(e);
                }
            }, 100);
        });

        it("should call next with error when getUserById fails", function(done) {
            this.timeout(5000);
            mockReq.session.userId = "123";
            
            // Mock getUserById to return error
            userCollection.findOne = function(query, callback) {
                callback(new Error("Database error"), null);
            };
            
            sessionHandler.displayWelcomePage(mockReq, mockRes, function(err) {
                try {
                    should.exist(err);
                    err.message.should.equal("Database error");
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe("prepareUserData (internal function)", function() {
        it("should generate random allocations for new user", function(done) {
            this.timeout(5000);
            // This is an internal function called during signup
            // We test it indirectly through handleSignup
            mockReq.body = {
                userName: "john",
                firstName: "John",
                lastName: "Doe",
                password: "Password123",
                verify: "Password123",
                email: "john@example.com"
            };
            mockReq.session = {
                regenerate: function(callback) {
                    mockReq.session.userId = 1;
                    callback();
                }
            };
            
            let allocationsCalled = false;
            let capturedStocks, capturedFunds, capturedBonds;
            
            const createdUser = {
                _id: 1,
                userName: "john",
                firstName: "John",
                lastName: "Doe",
                password: "Password123",
                email: "john@example.com"
            };
            
            userCollection.findOne = function(query, callback) {
                if (query.userName) {
                    // getUserByUserName - user doesn't exist yet
                    callback(null, null);
                } else if (query._id) {
                    // getUserById - return created user
                    callback(null, createdUser);
                } else {
                    callback(null, null);
                }
            };
            
            userCollection.insert = function(doc, callback) {
                callback(null, { ops: [createdUser] });
            };
            
            // Verify allocationsDAO.update is called
            allocationsCollection.update = function(query, doc, opts, callback) {
                allocationsCalled = true;
                capturedStocks = doc.stocks;
                capturedFunds = doc.funds;
                capturedBonds = doc.bonds;
                callback(null, { result: { n: 1 } });
            };
            
            allocationsCollection.findOne = function(query, callback) {
                callback(null, { userId: 1, stocks: capturedStocks, funds: capturedFunds, bonds: capturedBonds });
            };
            
            sessionHandler.handleSignup(mockReq, mockRes, mockNext);
            
            setTimeout(function() {
                try {
                    allocationsCalled.should.equal(true);
                    // Verify allocation percentages sum to 100
                    (capturedStocks + capturedFunds + capturedBonds).should.equal(100);
                    // Verify each is within valid range
                    capturedStocks.should.be.within(1, 40);
                    capturedFunds.should.be.within(1, 40);
                    capturedBonds.should.be.within(20, 98); // 100 - (min 1+1) = 98, 100 - (max 40+40) = 20
                    done();
                } catch (e) {
                    done(e);
                }
            }, 200);
        });
    });
});
