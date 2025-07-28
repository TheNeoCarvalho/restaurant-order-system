import { MenuItem } from './menu-item.entity';
export declare class PriceHistory {
    id: string;
    menuItem: MenuItem;
    menuItemId: string;
    oldPrice: number;
    newPrice: number;
    changedBy: string;
    reason: string;
    changedAt: Date;
}
