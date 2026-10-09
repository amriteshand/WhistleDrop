const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_super_secret_jwt_key_whistledrop";

const app = require("../src/server");

function makeRequest(server, options) {
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
        req.end();
    });
}

describe("WhistleDrop - Swagger / OpenAPI Documentation", () => {
    let server;

    it("Setup test HTTP server", (t, done) => {
        server = app.listen(0, "127.0.0.1", () => {
            done();
        });
    });

    it("GET /api-docs.json should serve OpenAPI 3.0 specification", async () => {
        const res = await makeRequest(server, {
            path: "/api-docs.json"
        });

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.body.openapi, "3.0.0");
        assert.strictEqual(res.body.info.title, "WhistleDrop API");
        assert.ok(res.body.paths["/api/reports"]);
        assert.ok(res.body.paths["/api/reports/{caseCode}"]);
        assert.ok(res.body.paths["/api/reports/{caseCode}/status"]);
        assert.ok(res.body.paths["/api/auth/login"]);
        assert.ok(res.body.paths["/api/auth/me"]);
        assert.ok(res.body.components.securitySchemes.bearerAuth);
    });

    it("GET /api-docs/ should serve Swagger UI HTML", async () => {
        const res = await makeRequest(server, {
            path: "/api-docs/"
        });

        assert.strictEqual(res.statusCode, 200);
        assert.ok(typeof res.body === "string");
        assert.ok(res.body.includes("swagger-ui") || res.body.includes("SwaggerUIBundle"));
    });

    it("GET /docs should redirect to /api-docs (302)", async () => {
        const res = await makeRequest(server, {
            path: "/docs"
        });

        assert.strictEqual(res.statusCode, 302);
        assert.strictEqual(res.headers.location, "/api-docs");
    });

    it("GET /api/docs should redirect to /api-docs (302)", async () => {
        const res = await makeRequest(server, {
            path: "/api/docs"
        });

        assert.strictEqual(res.statusCode, 302);
        assert.strictEqual(res.headers.location, "/api-docs");
    });

    it("Teardown test HTTP server", (t, done) => {
        if (server) {
            server.close(done);
        } else {
            done();
        }
    });
});
