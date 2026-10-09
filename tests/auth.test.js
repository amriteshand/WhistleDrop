const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_super_secret_jwt_key_whistledrop";

const app = require("../src/server");
const { verifyToken } = require("../src/middleware/auth");
const Moderator = require("../src/models/Moderator");

// Helper to make HTTP requests to the in-memory express server
function makeRequest(server, options, bodyData) {
    return new Promise((resolve, reject) => {
        const req = http.request(
            {
                hostname: "127.0.0.1",
                port: server.address().port,
                path: options.path,
                method: options.method || "GET",
                headers: options.headers || {}
            },
            (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    let parsed;
                    try {
                        parsed = JSON.parse(data);
                    } catch (e) {
                        parsed = data;
                    }
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: parsed
                    });
                });
            }
        );

        req.on("error", reject);

        if (bodyData) {
            req.write(typeof bodyData === "string" ? bodyData : JSON.stringify(bodyData));
        }
        req.end();
    });
}

describe("WhistleDrop Phase 1 - Authentication & Authorization", () => {
    let server;

    it("Setup test HTTP server", (t, done) => {
        server = app.listen(0, "127.0.0.1", () => {
            done();
        });
    });

    describe("1. Unit Tests for auth middleware (verifyToken)", () => {
        it("should reject request with no Authorization header (401)", () => {
            let statusCalled = null;
            let jsonSent = null;

            const req = { headers: {} };
            const res = {
                status: (code) => {
                    statusCalled = code;
                    return {
                        json: (data) => {
                            jsonSent = data;
                        }
                    };
                }
            };
            let nextCalled = false;
            const next = () => { nextCalled = true; };

            verifyToken(req, res, next);
            assert.strictEqual(statusCalled, 401);
            assert.deepStrictEqual(jsonSent, { message: "Access denied. No token provided." });
            assert.strictEqual(nextCalled, false);
        });

        it("should reject request with invalid token format (401)", () => {
            let statusCalled = null;
            let jsonSent = null;

            const req = { headers: { authorization: "Basic 123456" } };
            const res = {
                status: (code) => {
                    statusCalled = code;
                    return {
                        json: (data) => {
                            jsonSent = data;
                        }
                    };
                }
            };
            let nextCalled = false;
            const next = () => { nextCalled = true; };

            verifyToken(req, res, next);
            assert.strictEqual(statusCalled, 401);
            assert.deepStrictEqual(jsonSent, { message: "Access denied. No token provided." });
            assert.strictEqual(nextCalled, false);
        });

        it("should reject invalid/tampered token (401)", () => {
            let statusCalled = null;
            let jsonSent = null;

            const req = { headers: { authorization: "Bearer invalid.token.value" } };
            const res = {
                status: (code) => {
                    statusCalled = code;
                    return {
                        json: (data) => {
                            jsonSent = data;
                        }
                    };
                }
            };
            let nextCalled = false;
            const next = () => { nextCalled = true; };

            verifyToken(req, res, next);
            assert.strictEqual(statusCalled, 401);
            assert.deepStrictEqual(jsonSent, { message: "Invalid or expired token." });
            assert.strictEqual(nextCalled, false);
        });

        it("should accept valid token and populate req.moderator", () => {
            const token = jwt.sign(
                { id: "mod123", username: "admin" },
                process.env.JWT_SECRET
            );

            const req = { headers: { authorization: `Bearer ${token}` } };
            let nextCalled = false;
            const next = () => { nextCalled = true; };

            verifyToken(req, {}, next);
            assert.strictEqual(nextCalled, true);
            assert.strictEqual(req.moderator.id, "mod123");
            assert.strictEqual(req.moderator.username, "admin");
        });
    });

    describe("2. Auth Routes (POST /api/auth/login)", () => {
        it("should return 400 if username or password is missing", async () => {
            const res1 = await makeRequest(server, {
                path: "/api/auth/login",
                method: "POST",
                headers: { "Content-Type": "application/json" }
            }, { username: "admin" });

            assert.strictEqual(res1.statusCode, 400);
            assert.strictEqual(res1.body.message, "Username and password are required");

            const res2 = await makeRequest(server, {
                path: "/api/auth/login",
                method: "POST",
                headers: { "Content-Type": "application/json" }
            }, { password: "password123" });

            assert.strictEqual(res2.statusCode, 400);
            assert.strictEqual(res2.body.message, "Username and password are required");
        });

        it("should return 401 for invalid credentials when user does not exist", async () => {
            // Mock Moderator.findOne to return null
            const originalFindOne = Moderator.findOne;
            Moderator.findOne = async () => null;

            try {
                const res = await makeRequest(server, {
                    path: "/api/auth/login",
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                }, { username: "nonexistent", password: "password123" });

                assert.strictEqual(res.statusCode, 401);
                assert.strictEqual(res.body.message, "Invalid credentials");
            } finally {
                Moderator.findOne = originalFindOne;
            }
        });

        it("should return 401 for wrong password", async () => {
            const hashedPassword = await bcrypt.hash("correctPassword", 10);
            const originalFindOne = Moderator.findOne;
            Moderator.findOne = async () => ({
                _id: "mod-test-id",
                username: "admin",
                password: hashedPassword
            });

            try {
                const res = await makeRequest(server, {
                    path: "/api/auth/login",
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                }, { username: "admin", password: "wrongPassword" });

                assert.strictEqual(res.statusCode, 401);
                assert.strictEqual(res.body.message, "Invalid credentials");
            } finally {
                Moderator.findOne = originalFindOne;
            }
        });

        it("should return 200 with JWT token and moderator details for valid credentials", async () => {
            const password = "Whistle@Amritesh#2026!";
            const hashedPassword = await bcrypt.hash(password, 10);
            const originalFindOne = Moderator.findOne;
            Moderator.findOne = async () => ({
                _id: "mod-test-id",
                username: "admin",
                password: hashedPassword
            });

            try {
                const res = await makeRequest(server, {
                    path: "/api/auth/login",
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                }, { username: "admin", password });

                assert.strictEqual(res.statusCode, 200);
                assert.strictEqual(res.body.message, "Login successful");
                assert.ok(res.body.token, "Token should be present");
                assert.strictEqual(res.body.moderator.username, "admin");

                // Verify the generated token
                const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
                assert.strictEqual(decoded.username, "admin");
                assert.strictEqual(decoded.id, "mod-test-id");
            } finally {
                Moderator.findOne = originalFindOne;
            }
        });
    });

    describe("3. Protected Route: GET /api/auth/me", () => {
        it("should reject /api/auth/me without token (401)", async () => {
            const res = await makeRequest(server, {
                path: "/api/auth/me",
                method: "GET"
            });

            assert.strictEqual(res.statusCode, 401);
            assert.strictEqual(res.body.message, "Access denied. No token provided.");
        });

        it("should return moderator details with valid token", async () => {
            const originalFindById = Moderator.findById;
            Moderator.findById = () => ({
                select: async () => ({
                    _id: "mod-test-id",
                    username: "admin",
                    createdAt: new Date().toISOString()
                })
            });

            const token = jwt.sign(
                { id: "mod-test-id", username: "admin" },
                process.env.JWT_SECRET
            );

            try {
                const res = await makeRequest(server, {
                    path: "/api/auth/me",
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                assert.strictEqual(res.statusCode, 200);
                assert.strictEqual(res.body.moderator.username, "admin");
                assert.strictEqual(res.body.moderator.id, "mod-test-id");
            } finally {
                Moderator.findById = originalFindById;
            }
        });
    });

    describe("4. Route Protection: PATCH /api/reports/:caseCode/status", () => {
        it("should reject status update when unauthenticated (401)", async () => {
            const res = await makeRequest(server, {
                path: "/api/reports/WD-TESTCASE123/status",
                method: "PATCH",
                headers: { "Content-Type": "application/json" }
            }, { status: "UNDER_REVIEW" });

            assert.strictEqual(res.statusCode, 401);
            assert.strictEqual(res.body.message, "Access denied. No token provided.");
        });

        it("should reject invalid status even when authenticated (400)", async () => {
            const token = jwt.sign(
                { id: "mod-test-id", username: "admin" },
                process.env.JWT_SECRET
            );

            const res = await makeRequest(server, {
                path: "/api/reports/WD-TESTCASE123/status",
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }
            }, { status: "INVALID_STATUS" });

            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.body.message, "Invalid status");
        });
    });

    describe("5. Preservation of Existing Public Endpoints", () => {
        it("GET / should remain public and accessible (200)", async () => {
            const res = await makeRequest(server, {
                path: "/",
                method: "GET"
            });

            assert.strictEqual(res.statusCode, 200);
            assert.deepStrictEqual(res.body, { message: "WhistleDrop API is running" });
        });

        it("POST /api/reports should remain public and validate body (400 on empty)", async () => {
            const res = await makeRequest(server, {
                path: "/api/reports",
                method: "POST",
                headers: { "Content-Type": "application/json" }
            }, {});

            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.body.message, "Category and description are required");
        });
    });

    it("Teardown test HTTP server", (t, done) => {
        if (server) {
            server.close(done);
        } else {
            done();
        }
    });
});
