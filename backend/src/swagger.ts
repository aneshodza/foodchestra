import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Foodchestra API',
      version: '1.0.0',
      description: 'Food supply chain transparency API',
    },
  },
  apis: ['./src/routers/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
