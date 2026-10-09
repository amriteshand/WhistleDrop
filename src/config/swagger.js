const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const swaggerDefinition = {
    openapi: "3.0.0",
    info: {
        title: "WhistleDrop API",
        version: "1.0.0",
        description:
            "Secure and anonymous whistleblowing API platform. Allows public anonymous reporting, case tracking, and protected moderator report management with pagination and filtering.",
        contact: {
            name: "WhistleDrop Support"
        }
    },
    servers: [
        {
            url: "http://localhost:5000",
            description: "Local development server"
        },
        {
            url: "/",
            description: "Current host server"
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "Enter your JWT token obtained from POST /api/auth/login"
            }
        },
        schemas: {
            Report: {
                type: "object",
                properties: {
                    _id: {
                        type: "string",
                        example: "6706e23b8893112a912c7710"
                    },
                    caseCode: {
                        type: "string",
                        example: "WD-A1B2C3D4E5F67890"
                    },
                    category: {
                        type: "string",
                        example: "Financial Misconduct"
                    },
                    description: {
                        type: "string",
                        example: "Discrepancies observed in procurement invoices during Q3."
                    },
                    evidenceUrl: {
                        type: "string",
                        nullable: true,
                        example: "https://example.com/evidence/doc.pdf"
                    },
                    status: {
                        type: "string",
                        enum: ["SUBMITTED", "UNDER_REVIEW", "RESOLVED", "DISMISSED"],
                        example: "SUBMITTED"
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                        example: "2026-10-09T14:30:00.000Z"
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                        example: "2026-10-09T14:30:00.000Z"
                    }
                }
            },
            CreateReportInput: {
                type: "object",
                required: ["category", "description"],
                properties: {
                    category: {
                        type: "string",
                        example: "Bribery & Corruption"
                    },
                    description: {
                        type: "string",
                        example: "Detailed explanation of observed misconduct."
                    },
                    evidenceUrl: {
                        type: "string",
                        nullable: true,
                        example: "https://drive.google.com/file/d/evidence123"
                    }
                }
            },
            CreateReportResponse: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        example: "Report submitted successfully"
                    },
                    caseCode: {
                        type: "string",
                        example: "WD-A1B2C3D4E5F67890"
                    }
                }
            },
            TrackReportResponse: {
                type: "object",
                properties: {
                    caseCode: {
                        type: "string",
                        example: "WD-A1B2C3D4E5F67890"
                    },
                    category: {
                        type: "string",
                        example: "Bribery & Corruption"
                    },
                    description: {
                        type: "string",
                        example: "Detailed explanation of observed misconduct."
                    },
                    status: {
                        type: "string",
                        enum: ["SUBMITTED", "UNDER_REVIEW", "RESOLVED", "DISMISSED"],
                        example: "UNDER_REVIEW"
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                        example: "2026-10-09T14:30:00.000Z"
                    }
                }
            },
            UpdateStatusInput: {
                type: "object",
                required: ["status"],
                properties: {
                    status: {
                        type: "string",
                        enum: ["SUBMITTED", "UNDER_REVIEW", "RESOLVED", "DISMISSED"],
                        example: "UNDER_REVIEW"
                    }
                }
            },
            UpdateStatusResponse: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        example: "Report status updated successfully"
                    },
                    caseCode: {
                        type: "string",
                        example: "WD-A1B2C3D4E5F67890"
                    },
                    status: {
                        type: "string",
                        example: "UNDER_REVIEW"
                    }
                }
            },
            LoginInput: {
                type: "object",
                required: ["username", "password"],
                properties: {
                    username: {
                        type: "string",
                        example: "admin"
                    },
                    password: {
                        type: "string",
                        format: "password",
                        example: "Whistle@Amritesh#2026!"
                    }
                }
            },
            LoginResponse: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        example: "Login successful"
                    },
                    token: {
                        type: "string",
                        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    },
                    moderator: {
                        type: "object",
                        properties: {
                            id: {
                                type: "string",
                                example: "6706e12a8893112a912c7700"
                            },
                            username: {
                                type: "string",
                                example: "admin"
                            }
                        }
                    }
                }
            },
            ModeratorProfile: {
                type: "object",
                properties: {
                    moderator: {
                        type: "object",
                        properties: {
                            id: {
                                type: "string",
                                example: "6706e12a8893112a912c7700"
                            },
                            username: {
                                type: "string",
                                example: "admin"
                            },
                            createdAt: {
                                type: "string",
                                format: "date-time",
                                example: "2026-10-09T14:00:00.000Z"
                            }
                        }
                    }
                }
            },
            PaginationMeta: {
                type: "object",
                properties: {
                    page: {
                        type: "integer",
                        example: 1
                    },
                    limit: {
                        type: "integer",
                        example: 10
                    },
                    total: {
                        type: "integer",
                        example: 25
                    },
                    totalPages: {
                        type: "integer",
                        example: 3
                    }
                }
            },
            PaginatedReportsResponse: {
                type: "object",
                properties: {
                    reports: {
                        type: "array",
                        items: {
                            $ref: "#/components/schemas/Report"
                        }
                    },
                    total: {
                        type: "integer",
                        example: 25
                    },
                    page: {
                        type: "integer",
                        example: 1
                    },
                    limit: {
                        type: "integer",
                        example: 10
                    },
                    totalPages: {
                        type: "integer",
                        example: 3
                    },
                    pagination: {
                        $ref: "#/components/schemas/PaginationMeta"
                    }
                }
            },
            ErrorResponse: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        example: "Access denied. No token provided."
                    }
                }
            }
        }
    },
    paths: {
        "/": {
            get: {
                summary: "API Health Check",
                description: "Returns the operational status of WhistleDrop API.",
                responses: {
                    200: {
                        description: "API is healthy and online",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: {
                                            type: "string",
                                            example: "WhistleDrop API is running"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/reports": {
            post: {
                summary: "Submit Anonymous Report",
                description: "Public endpoint for whistleblowers to submit an anonymous incident report. Returns a unique tracking caseCode.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/CreateReportInput"
                            }
                        }
                    }
                },
                responses: {
                    201: {
                        description: "Report created successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/CreateReportResponse"
                                }
                            }
                        }
                    },
                    400: {
                        description: "Missing required fields (category or description)",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse"
                                }
                            }
                        }
                    },
                    500: {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse"
                                }
                            }
                        }
                    }
                }
            },
            get: {
                summary: "List Reports (Moderator Only)",
                description: "Protected endpoint for authenticated moderators to view reports with pagination and filtering by status and category.",
                security: [
                    {
                        bearerAuth: []
                    }
                ],
                parameters: [
                    {
                        name: "page",
                        in: "query",
                        required: false,
                        description: "Page number (defaults to 1)",
                        schema: {
                            type: "integer",
                            default: 1,
                            minimum: 1
                        }
                    },
                    {
                        name: "limit",
                        in: "query",
                        required: false,
                        description: "Number of records per page (defaults to 10)",
                        schema: {
                            type: "integer",
                            default: 10,
                            minimum: 1
                        }
                    },
                    {
                        name: "status",
                        in: "query",
                        required: false,
                        description: "Filter by report status",
                        schema: {
                            type: "string",
                            enum: ["SUBMITTED", "UNDER_REVIEW", "RESOLVED", "DISMISSED"]
                        }
                    },
                    {
                        name: "category",
                        in: "query",
                        required: false,
                        description: "Filter by report category (e.g. Fraud, Harassment, Bribery)",
                        schema: {
                            type: "string"
                        }
                    }
                ],
                responses: {
                    200: {
                        description: "Paginated list of reports",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/PaginatedReportsResponse"
                                }
                            }
                        }
                    },
                    401: {
                        description: "Unauthorized - missing or invalid JWT token",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse"
                                }
                            }
                        }
                    },
                    500: {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/reports/{caseCode}": {
            get: {
                summary: "Track Report Status by Case Code",
                description: "Public endpoint for whistleblowers to check the current status of their anonymous report using their unique caseCode.",
                parameters: [
                    {
                        name: "caseCode",
                        in: "path",
                        required: true,
                        description: "Unique case code (e.g., WD-A1B2C3D4E5F67890)",
                        schema: {
                            type: "string"
                        }
                    }
                ],
                responses: {
                    200: {
                        description: "Report status found",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/TrackReportResponse"
                                }
                            }
                        }
                    },
                    404: {
                        description: "Report not found with the given case code",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse"
                                }
                            }
                        }
                    },
                    500: {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/reports/{caseCode}/status": {
            patch: {
                summary: "Update Report Status (Moderator Only)",
                description: "Protected endpoint for authenticated moderators to change the review status of a report.",
                security: [
                    {
                        bearerAuth: []
                    }
                ],
                parameters: [
                    {
                        name: "caseCode",
                        in: "path",
                        required: true,
                        description: "Unique case code of the report to update",
                        schema: {
                            type: "string"
                        }
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/UpdateStatusInput"
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Status updated successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/UpdateStatusResponse"
                                }
                            }
                        }
                    },
                    400: {
                        description: "Invalid status value",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse"
                                }
                            }
                        }
                    },
                    401: {
                        description: "Unauthorized - missing or invalid token",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse"
                                }
                            }
                        }
                    },
                    404: {
                        description: "Report not found",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse"
                                }
                            }
                        }
                    },
                    500: {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/auth/login": {
            post: {
                summary: "Moderator Login",
                description: "Authenticates moderator credentials and issues a JWT bearer token for accessing protected endpoints.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/LoginInput"
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Login successful, returns JWT token",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/LoginResponse"
                                }
                            }
                        }
                    },
                    400: {
                        description: "Username or password missing",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse"
                                }
                            }
                        }
                    },
                    401: {
                        description: "Invalid credentials",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse"
                                }
                            }
                        }
                    },
                    500: {
                        description: "Internal login failure",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/auth/me": {
            get: {
                summary: "Get Authenticated Moderator Profile",
                description: "Protected endpoint that returns the profile details of the currently authenticated moderator.",
                security: [
                    {
                        bearerAuth: []
                    }
                ],
                responses: {
                    200: {
                        description: "Moderator profile retrieved successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ModeratorProfile"
                                }
                            }
                        }
                    },
                    401: {
                        description: "Unauthorized - missing or invalid token",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse"
                                }
                            }
                        }
                    },
                    404: {
                        description: "Moderator record not found",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse"
                                }
                            }
                        }
                    },
                    500: {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse"
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

const swaggerSpec = swaggerJsdoc({
    swaggerDefinition,
    apis: []
});

module.exports = {
    swaggerSpec,
    swaggerUi
};
