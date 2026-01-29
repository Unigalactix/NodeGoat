# Characterization Tests for SessionHandler

## Purpose

These tests were created as part of **KAN-14 Safety Protocol** to provide a safety net before refactoring legacy code.

**⚠️ CRITICAL:** These tests document the CURRENT behavior of `app/routes/session.js`, including known security vulnerabilities. They are NOT testing ideal behavior - they are capturing what the code does NOW.

## Test Coverage

The test suite covers all major functions of the SessionHandler:

### Middleware Functions
- ✅ `isAdminUserMiddleware` - Checks admin privileges and redirects non-admin users
- ✅ `isLoggedInMiddleware` - Ensures user is authenticated
- ✅ `displayLoginPage` - Renders the login page
- ✅ `handleLoginRequest` - Processes login attempts
- ✅ `displayLogoutPage` - Handles user logout
- ✅ `displaySignupPage` - Renders the signup page
- ✅ `handleSignup` - Processes new user registration
- ✅ `displayWelcomePage` - Shows dashboard for logged-in users

### What These Tests Document

#### Current Behavior
- Username validation (1-20 characters)
- Password validation (1-20 characters, **NO** complexity requirements)
- Email validation (simple regex pattern)
- Session management (creates but doesn't always regenerate sessions)
- Error handling and database interaction patterns

#### Known Vulnerabilities (Intentionally Captured)
1. **A2 - Broken Authentication**: Session is NOT regenerated on login
2. **A2-2 - Weak Password Policy**: Accepts 1-character passwords
3. **A2-2 - Username Enumeration**: Different error messages for invalid username vs invalid password
4. **A1-3 - Log Injection**: Username not encoded when logged

## Running the Tests

### Using Jest directly:
```bash
npm run test:jest
```

### Using Grunt:
```bash
grunt testunit
```

### Running all tests (Mocha + Jest):
```bash
grunt test
```

## Test Results

All 20 tests currently pass against the existing implementation:

- Constructor: 1 test
- isAdminUserMiddleware: 4 tests
- displayLogoutPage: 1 test  
- isLoggedInMiddleware: 2 tests
- displayLoginPage: 1 test
- handleLoginRequest: 3 tests
- displaySignupPage: 1 test
- handleSignup: 5 tests
- displayWelcomePage: 2 tests

## Important Notes

1. **DO NOT** "fix" these tests if they document a vulnerability - that's their purpose
2. **DO** ensure these tests continue to pass before refactoring
3. **DO** update these tests ONLY when intentionally changing behavior
4. After refactoring to fix vulnerabilities, create NEW tests for the secure behavior

## Next Steps

Once these tests are merged and passing in CI:
1. Begin refactoring `app/routes/session.js`
2. Fix security vulnerabilities one at a time
3. Update or create new tests for each fix
4. Ensure characterization tests still capture legacy behavior where unchanged

## Test Framework

- **Framework**: Jest 29.x
- **Mocking**: Jest's built-in mocking capabilities
- **Config**: `jest.config.js`
- **Location**: `test/unit/session.test.js`
