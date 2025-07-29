"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_config_1 = require("./common/config/swagger.config");
const logger_config_1 = require("./common/config/logger.config");
async function bootstrap() {
    const customLogger = (0, logger_config_1.createLogger)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: customLogger || undefined,
    });
    const logger = new common_1.Logger('Bootstrap');
    app.enableCors();
    app.setGlobalPrefix('api');
    (0, swagger_config_1.setupSwagger)(app);
    await app.listen(process.env.PORT ?? 3000);
    logger.log(`Application is running on: ${await app.getUrl()}`);
    logger.log(`Swagger documentation available at: ${await app.getUrl()}/api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map