import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';

@ValidatorConstraint({ name: 'isTableAvailable', async: true })
@Injectable()
export class IsTableAvailableConstraint implements ValidatorConstraintInterface {
  async validate(tableId: number, args: ValidationArguments) {
    // This would typically check the database
    // For now, we'll just validate the basic structure
    return typeof tableId === 'number' && tableId > 0;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Mesa não está disponível ou não existe';
  }
}

export function IsTableAvailable(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTableAvailableConstraint,
    });
  };
}