"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceHistory = void 0;
const typeorm_1 = require("typeorm");
const menu_item_entity_1 = require("./menu-item.entity");
let PriceHistory = class PriceHistory {
    id;
    menuItem;
    menuItemId;
    oldPrice;
    newPrice;
    changedBy;
    reason;
    changedAt;
};
exports.PriceHistory = PriceHistory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PriceHistory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => menu_item_entity_1.MenuItem, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'menu_item_id' }),
    __metadata("design:type", menu_item_entity_1.MenuItem)
], PriceHistory.prototype, "menuItem", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], PriceHistory.prototype, "menuItemId", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PriceHistory.prototype, "oldPrice", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PriceHistory.prototype, "newPrice", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], PriceHistory.prototype, "changedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PriceHistory.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PriceHistory.prototype, "changedAt", void 0);
exports.PriceHistory = PriceHistory = __decorate([
    (0, typeorm_1.Entity)('menu_item_price_history')
], PriceHistory);
//# sourceMappingURL=price-history.entity.js.map