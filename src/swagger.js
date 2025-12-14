import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Community Vaadi Booking API",
      version: "1.0.0",
      description: "API documentation for Community Vaadi Booking System",
      contact: {
        name: "Harshad Sonagara",
        email: "harshadsonagara@gmail.com",
      },
    },
    servers: [
      {
        url: "http://localhost:8000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "User ID",
            },
            fullName: {
              type: "string",
              description: "Full name of the user",
            },
            email: {
              type: "string",
              format: "email",
              description: "Email address",
            },
            isEmailVerified: {
              type: "boolean",
              description: "Email verification status",
            },
            lastLoginAt: {
              type: "string",
              format: "date-time",
              description: "Last login timestamp",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["fullName", "email", "password", "frontendUrl"],
          properties: {
            fullName: {
              type: "string",
              example: "John Doe",
            },
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
            password: {
              type: "string",
              format: "password",
              minLength: 6,
              example: "password123",
            },
            frontendUrl: {
              type: "string",
              example: "http://localhost:3000",
              description: "Frontend URL for email verification link",
            },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
            password: {
              type: "string",
              format: "password",
              example: "password123",
            },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            statusCode: {
              type: "number",
              example: 200,
            },
            data: {
              type: "object",
              properties: {
                user: {
                  $ref: "#/components/schemas/User",
                },
                accessToken: {
                  type: "string",
                },
                refreshToken: {
                  type: "string",
                },
              },
            },
            message: {
              type: "string",
            },
            success: {
              type: "boolean",
              example: true,
            },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            statusCode: {
              type: "number",
              example: 200,
            },
            data: {
              type: "object",
            },
            message: {
              type: "string",
            },
            success: {
              type: "boolean",
              example: true,
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            statusCode: {
              type: "number",
              example: 400,
            },
            message: {
              type: "string",
              example: "Error message",
            },
            success: {
              type: "boolean",
              example: false,
            },
            errors: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.js"], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
