import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsValidTableNumberConstraint implements ValidatorConstraintInterface {
  validate(tableNumber: number, args: ValidationArguments) {
    return typeof tableNumber === 'number' && tableNumber > 0 && tableNumber <= 100;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Número da mesa deve ser um número entre 1 e 100';
  }
}

export function IsValidTableNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidTableNumberConstraint,
    });
  };
}