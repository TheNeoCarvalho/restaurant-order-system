import { ValidationOptions, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
export declare class IsValidTableNumberConstraint implements ValidatorConstraintInterface {
    validate(tableNumber: number, args: ValidationArguments): boolean;
    defaultMessage(args: ValidationArguments): string;
}
export declare function IsValidTableNumber(validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
