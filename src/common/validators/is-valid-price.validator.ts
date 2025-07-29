import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsValidPriceConstraint implements ValidatorConstraintInterface {
  validate(price: number, args: ValidationArguments) {
    if (typeof price !== 'number') return false;
    
    // Check if price is positive
    if (price <= 0) return false;
    
    // Check if price has at most 2 decimal places
    const decimalPlaces = (price.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) return false;
    
    // Check if price is reasonable (not too high)
    if (price > 9999.99) return false;
    
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Preço deve ser um número positivo com no máximo 2 casas decimais e menor que R$ 9999,99';
  }
}

export function IsValidPrice(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidPriceConstraint,
    });
  };
}