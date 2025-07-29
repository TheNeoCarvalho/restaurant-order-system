import { ValidationOptions, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
export declare class IsValidPriceConstraint implements ValidatorConstraintInterface {
    validate(price: number, args: ValidationArguments): boolean;
    defaultMessage(args: ValidationArguments): string;
}
export declare function IsValidPrice(validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
