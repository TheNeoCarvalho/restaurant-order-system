import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsValidQuantityConstraint implements ValidatorConstraintInterface {
  validate(quantity: number, args: ValidationArguments) {
    if (typeof quantity !== 'number') return false;
    
    // Check if quantity is positive integer
    if (!Number.isInteger(quantity) || quantity <= 0) return false;
    
    // Check if quantity is reasonable (not too high)
    if (quantity > 50) return false;
    
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Quantidade deve ser um número inteiro positivo e menor que 50';
  }
}

export function IsValidQuantity(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidQuantityConstraint,
    });
  };
}