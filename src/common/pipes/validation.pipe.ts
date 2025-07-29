import {
  Injectable,
  ValidationPipe as NestValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { validationConfig } from '../config/validation.config';

@Injectable()
export class CustomValidationPipe extends NestValidationPipe {
  constructor() {
    super({
      ...validationConfig,
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          const constraints = error.constraints;
          if (constraints) {
            return {
              property: error.property,
              messages: Object.values(constraints),
            };
          }
          return {
            property: error.property,
            messages: ['Validation failed'],
          };
        });
        
        return new BadRequestException({
          message: 'Dados de entrada inválidos',
          errors: messages,
          statusCode: 400,
        });
      },
    });
  }
}