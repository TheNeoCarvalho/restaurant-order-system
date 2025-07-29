"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderItemsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const order_item_entity_1 = require("./entities/order-item.entity");
const user_entity_1 = require("../users/entities/user.entity");
const order_items_service_1 = require("./order-items.service");
const websocket_module_1 = require("../websocket/websocket.module");
let OrderItemsModule = class OrderItemsModule {
};
exports.OrderItemsModule = OrderItemsModule;
exports.OrderItemsModule = OrderItemsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([order_item_entity_1.OrderItem, user_entity_1.User]),
            (0, common_1.forwardRef)(() => websocket_module_1.WebsocketModule),
        ],
        providers: [order_items_service_1.OrderItemsService],
        exports: [order_items_service_1.OrderItemsService, typeorm_1.TypeOrmModule],
    })
], OrderItemsModule);
//# sourceMappingURL=order-items.module.js.map