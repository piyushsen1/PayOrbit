import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PayOrbit API',
      version: '1.0.0',
      description: 'Generated from JSDoc comments above each route handler.',
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  // Matches both ts-node (dev) and the compiled dist/ (prod) layouts.
  // The glob package needs forward slashes even on Windows, so normalize
  // path.join's backslashes rather than passing them straight through.
  apis: [path.join(__dirname, '..', 'routes', '*.{ts,js}').split(path.sep).join('/')],
});
