const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_super_secret_jwt_key_whistledrop";

const app = require("../src/server");
const Report = require("../src/models/Report");

// Helper to make HTTP requests to the in-memory test server
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

describe("WhistleDrop Phase 2 - Moderator Report Management Endpoints", () => {
    let server;
    const validToken = jwt.sign(
        { id: "mod-test-id", username: "admin" },
        process.env.JWT_SECRET
    );

    it("Setup test HTTP server", (t, done) => {
        server = app.listen(0, "127.0.0.1", () => {
            done();
        });
    });

    describe("1. GET /api/reports - Authentication & Authorization", () => {
        it("should reject request without Authorization header (401)", async () => {
            const res = await makeRequest(server, {
                path: "/api/reports",
                method: "GET"
            });

            assert.strictEqual(res.statusCode, 401);
            assert.strictEqual(res.body.message, "Access denied. No token provided.");
        });

        it("should reject request with malformed or invalid token (401)", async () => {
            const res = await makeRequest(server, {
                path: "/api/reports",
                method: "GET",
                headers: {
                    Authorization: "Bearer invalid_token_xyz"
                }
            });

            assert.strictEqual(res.statusCode, 401);
            assert.strictEqual(res.body.message, "Invalid or expired token.");
        });

        it("should allow access with valid moderator token (200)", async () => {
            const originalFind = Report.find;
            const originalCount = Report.countDocuments;

            const mockReports = [
                { caseCode: "WD-1111", category: "Fraud", description: "Test 1", status: "SUBMITTED" }
            ];

            Report.find = () => ({
                sort: () => ({
                    skip: () => ({
                        limit: async () => mockReports
                    })
                })
            });
            Report.countDocuments = async () => 1;

            try {
                const res = await makeRequest(server, {
                    path: "/api/reports",
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${validToken}`
                    }
                });

                assert.strictEqual(res.statusCode, 200);
                assert.strictEqual(res.body.reports.length, 1);
                assert.strictEqual(res.body.reports[0].caseCode, "WD-1111");
                assert.strictEqual(res.body.pagination.total, 1);
            } finally {
                Report.find = originalFind;
                Report.countDocuments = originalCount;
            }
        });
    });

    describe("2. GET /api/reports - Pagination", () => {
        it("should apply default pagination (page=1, limit=10)", async () => {
            const originalFind = Report.find;
            const originalCount = Report.countDocuments;

            let capturedSkip = null;
            let capturedLimit = null;

            Report.find = () => ({
                sort: () => ({
                    skip: (s) => {
                        capturedSkip = s;
                        return {
                            limit: async (l) => {
                                capturedLimit = l;
                                return [];
                            }
                        };
                    }
                })
            });
            Report.countDocuments = async () => 25;

            try {
                const res = await makeRequest(server, {
                    path: "/api/reports",
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${validToken}`
                    }
                });

                assert.strictEqual(res.statusCode, 200);
                assert.strictEqual(capturedSkip, 0);
                assert.strictEqual(capturedLimit, 10);
                assert.strictEqual(res.body.pagination.page, 1);
                assert.strictEqual(res.body.pagination.limit, 10);
                assert.strictEqual(res.body.pagination.total, 25);
                assert.strictEqual(res.body.pagination.totalPages, 3);
            } finally {
                Report.find = originalFind;
                Report.countDocuments = originalCount;
            }
        });

        it("should respect custom page and limit query parameters", async () => {
            const originalFind = Report.find;
            const originalCount = Report.countDocuments;

            let capturedSkip = null;
            let capturedLimit = null;

            Report.find = () => ({
                sort: () => ({
                    skip: (s) => {
                        capturedSkip = s;
                        return {
                            limit: async (l) => {
                                capturedLimit = l;
                                return [];
                            }
                        };
                    }
                })
            });
            Report.countDocuments = async () => 50;

            try {
                const res = await makeRequest(server, {
                    path: "/api/reports?page=3&limit=15",
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${validToken}`
                    }
                });

                assert.strictEqual(res.statusCode, 200);
                assert.strictEqual(capturedSkip, 30); // (3 - 1) * 15 = 30
                assert.strictEqual(capturedLimit, 15);
                assert.strictEqual(res.body.pagination.page, 3);
                assert.strictEqual(res.body.pagination.limit, 15);
                assert.strictEqual(res.body.pagination.total, 50);
                assert.strictEqual(res.body.pagination.totalPages, 4); // ceil(50 / 15) = 4
            } finally {
                Report.find = originalFind;
                Report.countDocuments = originalCount;
            }
        });
    });

    describe("3. GET /api/reports - Filtering", () => {
        it("should filter by status", async () => {
            const originalFind = Report.find;
            const originalCount = Report.countDocuments;

            let capturedFilter = null;
            let capturedCountFilter = null;

            Report.find = (filter) => {
                capturedFilter = filter;
                return {
                    sort: () => ({
                        skip: () => ({
                            limit: async () => []
                        })
                    })
                };
            };
            Report.countDocuments = async (filter) => {
                capturedCountFilter = filter;
                return 5;
            };

            try {
                const res = await makeRequest(server, {
                    path: "/api/reports?status=UNDER_REVIEW",
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${validToken}`
                    }
                });

                assert.strictEqual(res.statusCode, 200);
                assert.strictEqual(capturedFilter.status, "UNDER_REVIEW");
                assert.strictEqual(capturedCountFilter.status, "UNDER_REVIEW");
                assert.strictEqual(res.body.pagination.total, 5);
            } finally {
                Report.find = originalFind;
                Report.countDocuments = originalCount;
            }
        });

        it("should filter by category", async () => {
            const originalFind = Report.find;
            const originalCount = Report.countDocuments;

            let capturedFilter = null;

            Report.find = (filter) => {
                capturedFilter = filter;
                return {
                    sort: () => ({
                        skip: () => ({
                            limit: async () => []
                        })
                    })
                };
            };
            Report.countDocuments = async () => 3;

            try {
                const res = await makeRequest(server, {
                    path: "/api/reports?category=Bribery",
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${validToken}`
                    }
                });

                assert.strictEqual(res.statusCode, 200);
                assert.strictEqual(capturedFilter.category, "Bribery");
            } finally {
                Report.find = originalFind;
                Report.countDocuments = originalCount;
            }
        });

        it("should combine status and category filtering", async () => {
            const originalFind = Report.find;
            const originalCount = Report.countDocuments;

            let capturedFilter = null;

            Report.find = (filter) => {
                capturedFilter = filter;
                return {
                    sort: () => ({
                        skip: () => ({
                            limit: async () => []
                        })
                    })
                };
            };
            Report.countDocuments = async () => 2;

            try {
                const res = await makeRequest(server, {
                    path: "/api/reports?status=RESOLVED&category=Harassment",
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${validToken}`
                    }
                });

                assert.strictEqual(res.statusCode, 200);
                assert.strictEqual(capturedFilter.status, "RESOLVED");
                assert.strictEqual(capturedFilter.category, "Harassment");
            } finally {
                Report.find = originalFind;
                Report.countDocuments = originalCount;
            }
        });
    });

    describe("4. PATCH /api/reports/:caseCode/status - Moderator Protection", () => {
        it("should reject status update without token (401)", async () => {
            const res = await makeRequest(server, {
                path: "/api/reports/WD-TESTCASE/status",
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                }
            }, { status: "RESOLVED" });

            assert.strictEqual(res.statusCode, 401);
            assert.strictEqual(res.body.message, "Access denied. No token provided.");
        });

        it("should allow status update with valid moderator token (200)", async () => {
            const originalFindOneAndUpdate = Report.findOneAndUpdate;

            Report.findOneAndUpdate = async (query, update) => ({
                caseCode: query.caseCode,
                status: update.status
            });

            try {
                const res = await makeRequest(server, {
                    path: "/api/reports/WD-TESTCASE/status",
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${validToken}`
                    }
                }, { status: "RESOLVED" });

                assert.strictEqual(res.statusCode, 200);
                assert.strictEqual(res.body.message, "Report status updated successfully");
                assert.strictEqual(res.body.caseCode, "WD-TESTCASE");
                assert.strictEqual(res.body.status, "RESOLVED");
            } finally {
                Report.findOneAndUpdate = originalFindOneAndUpdate;
            }
        });
    });

    describe("5. Public Endpoints Preservation", () => {
        it("POST /api/reports should remain public and accessible without token", async () => {
            const originalCreate = Report.create;
            Report.create = async (data) => ({
                caseCode: data.caseCode,
                category: data.category,
                description: data.description
            });

            try {
                const res = await makeRequest(server, {
                    path: "/api/reports",
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    }
                }, {
                    category: "Whistleblowing",
                    description: "Public anonymous report submission"
                });

                assert.strictEqual(res.statusCode, 201);
                assert.strictEqual(res.body.message, "Report submitted successfully");
                assert.ok(res.body.caseCode.startsWith("WD-"));
            } finally {
                Report.create = originalCreate;
            }
        });

        it("GET /api/reports/:caseCode should remain public and accessible without token", async () => {
            const originalFindOne = Report.findOne;
            Report.findOne = async ({ caseCode }) => ({
                caseCode,
                category: "Corruption",
                description: "Public case check",
                status: "SUBMITTED",
                createdAt: new Date().toISOString()
            });

            try {
                const res = await makeRequest(server, {
                    path: "/api/reports/WD-PUBLIC123",
                    method: "GET"
                });

                assert.strictEqual(res.statusCode, 200);
                assert.strictEqual(res.body.caseCode, "WD-PUBLIC123");
                assert.strictEqual(res.body.category, "Corruption");
            } finally {
                Report.findOne = originalFindOne;
            }
        });
    });

    describe("6. Security Hardening (Helmet, CORS, JWT_SECRET)", () => {
        it("Helmet headers should be present on API responses", async () => {
            const res = await makeRequest(server, {
                path: "/",
                method: "GET"
            });

            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.headers["x-content-type-options"], "nosniff");
            assert.strictEqual(res.headers["x-frame-options"], "SAMEORIGIN");
        });

        it("CORS should not include wildcard Access-Control-Allow-Origin by default", async () => {
            const res = await makeRequest(server, {
                path: "/",
                method: "GET",
                headers: {
                    Origin: "https://malicious-site.com"
                }
            });

            assert.notStrictEqual(res.headers["access-control-allow-origin"], "*");
            assert.strictEqual(res.headers["access-control-allow-origin"], undefined);
        });

        it("verifyToken should return 500 if JWT_SECRET is missing", () => {
            const { verifyToken } = require("../src/middleware/auth");
            const originalSecret = process.env.JWT_SECRET;
            delete process.env.JWT_SECRET;

            let statusSent = null;
            let jsonSent = null;
            const req = {
                headers: {
                    authorization: "Bearer some_dummy_token"
                }
            };
            const res = {
                status: (code) => {
                    statusSent = code;
                    return {
                        json: (data) => {
                            jsonSent = data;
                        }
                    };
                }
            };
            let nextCalled = false;

            try {
                verifyToken(req, res, () => { nextCalled = true; });
                assert.strictEqual(statusSent, 500);
                assert.strictEqual(jsonSent.message, "Server misconfiguration: JWT_SECRET is not configured.");
                assert.strictEqual(nextCalled, false);
            } finally {
                process.env.JWT_SECRET = originalSecret;
            }
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
