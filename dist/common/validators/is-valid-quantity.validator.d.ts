import { ValidationOptions, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
export declare class IsValidQuantityConstraint implements ValidatorConstraintInterface {
    validate(quantity: number, args: ValidationArguments): boolean;
    defaultMessage(args: ValidationArguments): string;
}
export declare function IsValidQuantity(validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
