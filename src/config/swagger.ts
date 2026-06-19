import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Portus API",
      version: "0.1.0",
      description:
        "API do Portus RDO: cadastro de organizações, administrador do sistema, usuários vinculados, login e sessão.",
    },
    servers: [{ url: "/api", description: "Prefixo da API" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ApiSuccess: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
            message: { type: "string" },
          },
        },
        ApiError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            errors: { type: "array", items: { type: "object" } },
          },
        },
      },
    },
  },
  apis: ["./src/modules/**/*.routes.ts", "./dist/modules/**/*.routes.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
