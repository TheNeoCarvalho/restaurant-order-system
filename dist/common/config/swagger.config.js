"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = setupSwagger;
const swagger_1 = require("@nestjs/swagger");
function setupSwagger(app) {
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Restaurant Order Management API')
        .setDescription(`
      API completa para gerenciamento de pedidos em restaurantes com funcionalidades em tempo real.
      
      ## Funcionalidades Principais
      - **Autenticação JWT**: Sistema seguro de login com tokens de acesso e renovação
      - **Gerenciamento de Usuários**: Controle de acesso baseado em roles (Admin, Garçom, Cozinha)
      - **Gerenciamento de Mesas**: Controle de status e disponibilidade das mesas
      - **Cardápio Digital**: CRUD completo de itens do cardápio com histórico de preços
      - **Sistema de Comandas**: Criação, gerenciamento e fechamento de pedidos
      - **Controle de Status**: Acompanhamento em tempo real do status dos itens
      - **Notificações WebSocket**: Atualizações em tempo real para todos os usuários
      
      ## Tipos de Usuário
      - **Admin**: Acesso completo ao sistema, pode gerenciar usuários, cardápio, mesas e comandas
      - **Garçom**: Pode criar comandas, adicionar itens, fechar contas e gerenciar mesas
      - **Cozinha**: Pode visualizar pedidos e atualizar status dos itens (pendente → em preparo → pronto)
      
      ## Fluxo de Trabalho
      1. **Login**: Usuário faz login e recebe tokens JWT
      2. **Criar Comanda**: Garçom cria nova comanda para uma mesa disponível
      3. **Adicionar Itens**: Itens do cardápio são adicionados à comanda
      4. **Preparo**: Cozinha recebe notificação e atualiza status dos itens
      5. **Entrega**: Garçom marca itens como entregues
      6. **Fechamento**: Conta é fechada com cálculo de totais e impostos
      
      ## Autenticação
      Para acessar endpoints protegidos, inclua o token JWT no header:
      \`Authorization: Bearer <seu-token>\`
      
      ## Status dos Itens
      - **PENDING**: Item foi pedido, aguardando preparo
      - **IN_PREPARATION**: Item está sendo preparado na cozinha
      - **READY**: Item está pronto para entrega
      - **DELIVERED**: Item foi entregue ao cliente
      - **CANCELLED**: Item foi cancelado
      
      ## WebSocket Events
      O sistema emite eventos em tempo real via WebSocket:
      - \`new-order\`: Novo pedido criado
      - \`order-status-updated\`: Status de item atualizado
      - \`table-status-updated\`: Status de mesa alterado
    `)
        .setVersion('1.0.0')
        .setContact('Equipe de Desenvolvimento', 'https://github.com/restaurant-order-system', 'dev@restaurant-system.com')
        .setLicense('MIT', 'https://opensource.org/licenses/MIT')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Token JWT para autenticação. Formato: Bearer <token>',
        in: 'header',
    })
        .addTag('Authentication', 'Endpoints para autenticação, login, logout e renovação de tokens')
        .addTag('Orders', 'Gerenciamento completo de comandas, pedidos e itens')
        .addTag('Menu', 'Gerenciamento do cardápio: criar, editar, remover itens e controlar disponibilidade')
        .addTag('tables', 'Gerenciamento de mesas: status, disponibilidade e visão geral')
        .addServer('http://localhost:3000', 'Servidor de desenvolvimento')
        .addServer('https://api.restaurant-system.com', 'Servidor de produção')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config, {
        operationIdFactory: (controllerKey, methodKey) => methodKey,
        deepScanRoutes: true,
    });
    document.info.termsOfService = 'https://restaurant-system.com/terms';
    if (!document.components) {
        document.components = {};
    }
    if (!document.components.schemas) {
        document.components.schemas = {};
    }
    document.components.schemas.ErrorResponse = {
        type: 'object',
        properties: {
            statusCode: {
                type: 'number',
                example: 400
            },
            message: {
                oneOf: [
                    { type: 'string', example: 'Mensagem de erro' },
                    {
                        type: 'array',
                        items: { type: 'string' },
                        example: ['Campo obrigatório', 'Formato inválido']
                    }
                ]
            },
            error: {
                type: 'string',
                example: 'Bad Request'
            },
            timestamp: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-01T12:00:00.000Z'
            },
            path: {
                type: 'string',
                example: '/api/orders'
            }
        }
    };
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            docExpansion: 'none',
            filter: true,
            showRequestHeaders: true,
            tryItOutEnabled: true,
        },
        customSiteTitle: 'Restaurant Order API - Documentação',
        customfavIcon: '/favicon.ico',
        customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .info .title { color: #2c3e50 }
    `,
    });
}
//# sourceMappingURL=swagger.config.js.map