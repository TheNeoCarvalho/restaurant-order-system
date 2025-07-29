import { ValidationOptions, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
export declare class IsTableAvailableConstraint implements ValidatorConstraintInterface {
    validate(tableId: number, args: ValidationArguments): Promise<boolean>;
    defaultMessage(args: ValidationArguments): string;
}
export declare function IsTableAvailable(validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
