const UserDAO = require("../data/user-dao").UserDAO;
const AllocationsDAO = require("../data/allocations-dao").AllocationsDAO;
const jwt = require("jsonwebtoken");
const {
    environmentalScripts,
    cookieSecret
} = require("../../config/config");

/* The SessionHandler must be constructed with a connected db */
function SessionHandler(db) {
    "use strict";

    const userDAO = new UserDAO(db);
    const allocationsDAO = new AllocationsDAO(db);

    // JWT Configuration
    const JWT_SECRET = cookieSecret || "your-secret-key";
    const JWT_EXPIRY = "24h";

    // Helper function to generate JWT token
    const generateToken = (userId, isAdmin = false) => {
        return jwt.sign(
            { userId, isAdmin },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );
    };

    // Helper function to verify JWT token
    const verifyToken = (token) => {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return null;
        }
    };

    // Helper function to extract userId from request (JWT or session fallback)
    const getUserIdFromRequest = (req) => {
        // Try JWT token from cookies first
        if (req.cookies && req.cookies.token) {
            const decoded = verifyToken(req.cookies.token);
            if (decoded) {
                return decoded.userId;
            }
        }
        // Fallback to session for backward compatibility
        return req.session.userId;
    };

    // Helper function to extract user info from request
    const getUserInfoFromRequest = (req) => {
        // Try JWT token from cookies first
        if (req.cookies && req.cookies.token) {
            const decoded = verifyToken(req.cookies.token);
            if (decoded) {
                return decoded;
            }
        }
        // Fallback to session for backward compatibility
        if (req.session.userId) {
            return { userId: req.session.userId };
        }
        return null;
    };

    const prepareUserData = (user, next) => {
        // Generate random allocations
        const stocks = Math.floor((Math.random() * 40) + 1);
        const funds = Math.floor((Math.random() * 40) + 1);
        const bonds = 100 - (stocks + funds);

        allocationsDAO.update(user._id, stocks, funds, bonds, (err) => {
            if (err) return next(err);
        });
    };

    this.isAdminUserMiddleware = (req, res, next) => {
        const userInfo = getUserInfoFromRequest(req);
        if (userInfo && userInfo.userId) {
            return userDAO.getUserById(userInfo.userId, (err, user) => {
               return user && user.isAdmin ? next() : res.redirect("/login");
            });
        }
        console.log("redirecting to login");
        return res.redirect("/login");

    };

    this.isLoggedInMiddleware = (req, res, next) => {
        const userInfo = getUserInfoFromRequest(req);
        if (userInfo && userInfo.userId) {
            return next();
        }
        console.log("redirecting to login");
        return res.redirect("/login");
    };

    this.displayLoginPage = (req, res, next) => {
        return res.render("login", {
            userName: "",
            password: "",
            loginError: "",
            environmentalScripts
        });
    };

    this.handleLoginRequest = (req, res, next) => {
        const {
            userName,
            password
        } = req.body;
        userDAO.validateLogin(userName, password, (err, user) => {
            const errorMessage = "Invalid username and/or password";
            const invalidUserNameErrorMessage = "Invalid username";
            const invalidPasswordErrorMessage = "Invalid password";
            if (err) {
                if (err.noSuchUser) {
                    console.log("Error: attempt to login with invalid user: ", userName);

                    // Fix for A1 - 3 Log Injection - encode/sanitize input for CRLF Injection
                    // that could result in log forging:
                    // - Step 1: Require a module that supports encoding
                    // const ESAPI = require('node-esapi');
                    // - Step 2: Encode the user input that will be logged in the correct context
                    // following are a few examples:
                    // console.log('Error: attempt to login with invalid user: %s',
                    //     ESAPI.encoder().encodeForHTML(userName));
                    // console.log('Error: attempt to login with invalid user: %s',
                    //     ESAPI.encoder().encodeForJavaScript(userName));
                    // console.log('Error: attempt to login with invalid user: %s',
                    //     ESAPI.encoder().encodeForURL(userName));
                    // or if you know that this is a CRLF vulnerability you can target this specifically as follows:
                    // console.log('Error: attempt to login with invalid user: %s',
                    //     userName.replace(/(\r\n|\r|\n)/g, '_'));

                    return res.render("login", {
                        userName: userName,
                        password: "",
                        loginError: invalidUserNameErrorMessage,
                        //Fix for A2-2 Broken Auth - Uses identical error for both username, password error
                        // loginError: errorMessage
                        environmentalScripts
                    });
                } else if (err.invalidPassword) {
                    return res.render("login", {
                        userName: userName,
                        password: "",
                        loginError: invalidPasswordErrorMessage,
                        //Fix for A2-2 Broken Auth - Uses identical error for both username, password error
                        // loginError: errorMessage
                        environmentalScripts
                    });
                } else {
                    return next(err);
                }
            }

            // A2-Broken Authentication and Session Management
            // Upon login, a security best practice with regards to cookies session management
            // would be to regenerate the session id so that if an id was already created for
            // a user on an insecure medium (i.e: non-HTTPS website or otherwise), or if an
            // attacker was able to get their hands on the cookie id before the user logged-in,
            // then the old session id will render useless as the logged-in user with new privileges
            // holds a new session id now.

            // Fix the problem by regenerating a session in each login
            // by wrapping the below code as a function callback for the method req.session.regenerate()
            // i.e:
            // `req.session.regenerate(() => {})`
            
            // Generate JWT token
            const token = generateToken(user._id, user.isAdmin);
            
            // Set JWT token in httpOnly cookie
            res.cookie("token", token, {
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
                // secure: true // Enable this in production with HTTPS
            });
            
            // Also maintain session for backward compatibility
            req.session.userId = user._id;
            return res.redirect(user.isAdmin ? "/benefits" : "/dashboard");
        });
    };

    this.displayLogoutPage = (req, res) => {
        // Clear JWT cookie
        res.clearCookie("token");
        req.session.destroy(() => res.redirect("/"));
    };

    this.displaySignupPage = (req, res) => {
        res.render("signup", {
            userName: "",
            password: "",
            passwordError: "",
            email: "",
            userNameError: "",
            emailError: "",
            verifyError: "",
            environmentalScripts
        });
    };

    const validateSignup = (userName, firstName, lastName, password, verify, email, errors) => {

        const USER_RE = /^.{1,20}$/;
        const FNAME_RE = /^.{1,100}$/;
        const LNAME_RE = /^.{1,100}$/;
        const EMAIL_RE = /^[\S]+@[\S]+\.[\S]+$/;
        const PASS_RE = /^.{1,20}$/;
        /*
        //Fix for A2-2 - Broken Authentication -  requires stronger password
        //(at least 8 characters with numbers and both lowercase and uppercase letters.)
        const PASS_RE =/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
        */

        errors.userNameError = "";
        errors.firstNameError = "";
        errors.lastNameError = "";

        errors.passwordError = "";
        errors.verifyError = "";
        errors.emailError = "";

        if (!USER_RE.test(userName)) {
            errors.userNameError = "Invalid user name.";
            return false;
        }
        if (!FNAME_RE.test(firstName)) {
            errors.firstNameError = "Invalid first name.";
            return false;
        }
        if (!LNAME_RE.test(lastName)) {
            errors.lastNameError = "Invalid last name.";
            return false;
        }
        if (!PASS_RE.test(password)) {
            errors.passwordError = "Password must be 8 to 18 characters" +
                " including numbers, lowercase and uppercase letters.";
            return false;
        }
        if (password !== verify) {
            errors.verifyError = "Password must match";
            return false;
        }
        if (email !== "") {
            if (!EMAIL_RE.test(email)) {
                errors.emailError = "Invalid email address";
                return false;
            }
        }
        return true;
    };

    this.handleSignup = (req, res, next) => {

        const {
            email,
            userName,
            firstName,
            lastName,
            password,
            verify
        } = req.body;

        // set these up in case we have an error case
        const errors = {
            "userName": userName,
            "email": email
        };

        if (validateSignup(userName, firstName, lastName, password, verify, email, errors)) {

            userDAO.getUserByUserName(userName, (err, user) => {

                if (err) return next(err);

                if (user) {
                    errors.userNameError = "User name already in use. Please choose another";
                    return res.render("signup", {
                        ...errors,
                        environmentalScripts
                    });
                }

                userDAO.addUser(userName, firstName, lastName, password, email, (err, user) => {

                    if (err) return next(err);

                    //prepare data for the user
                    prepareUserData(user, next);
                    /*
                    sessionDAO.startSession(user._id, (err, sessionId) => {
                        if (err) return next(err);
                        res.cookie("session", sessionId);
                        req.session.userId = user._id;
                        return res.render("dashboard", { ...user, environmentalScripts });
                    });
                    */
                    req.session.regenerate(() => {
                        req.session.userId = user._id;
                        // Set userId property. Required for left nav menu links
                        user.userId = user._id;

                        // Generate JWT token for new user
                        const token = generateToken(user._id, user.isAdmin || false);
                        
                        // Set JWT token in httpOnly cookie
                        res.cookie("token", token, {
                            httpOnly: true,
                            maxAge: 24 * 60 * 60 * 1000 // 24 hours
                            // secure: true // Enable this in production with HTTPS
                        });

                        return res.render("dashboard", {
                            ...user,
                            environmentalScripts
                        });
                    });

                });
            });
        } else {
            console.log("user did not validate");
            return res.render("signup", {
                ...errors,
                environmentalScripts
            });
        }
    };

    this.displayWelcomePage = (req, res, next) => {
        const userInfo = getUserInfoFromRequest(req);

        if (!userInfo || !userInfo.userId) {
            console.log("welcome: Unable to identify user...redirecting to login");
            return res.redirect("/login");
        }

        const userId = userInfo.userId;

        userDAO.getUserById(userId, (err, doc) => {
            if (err) return next(err);
            doc.userId = userId;
            return res.render("dashboard", {
                ...doc,
                environmentalScripts
            });
        });
    };
}

module.exports = SessionHandler;
