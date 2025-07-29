import { ValidationPipeOptions } from '@nestjs/common';

export const validationConfig: ValidationPipeOptions = {
  // Remove properties that are not in the DTO
  whitelist: true,
  
  // Throw error if non-whitelisted properties are present
  forbidNonWhitelisted: true,
  
  // Transform payloads to be objects typed according to their DTO classes
  transform: true,
  
  // Enable detailed error messages
  disableErrorMessages: false,
  
  // Don't include target and value in error messages for security
  validationError: {
    target: false,
    value: false,
  },
  
  // Custom error message format
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
    
    return {
      message: 'Dados de entrada inválidos',
      errors: messages,
      statusCode: 400,
    };
  },
};