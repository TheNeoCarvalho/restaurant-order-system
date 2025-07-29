import { PipeTransform, ArgumentMetadata } from '@nestjs/common';
export declare class ParseUuidPipe implements PipeTransform<string, string> {
    transform(value: string, metadata: ArgumentMetadata): string;
}
