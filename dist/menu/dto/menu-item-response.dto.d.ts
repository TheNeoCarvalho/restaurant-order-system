import { MenuItem } from '../entities';
export declare class MenuItemResponseDto {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    isAvailable: boolean;
    preparationTime: number | null;
    createdAt: Date;
    updatedAt: Date;
    constructor(menuItem: MenuItem);
}
