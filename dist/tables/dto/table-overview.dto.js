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
exports.TablesOverviewQueryDto = exports.TableOverviewDto = exports.PendingOrderItemDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const table_status_enum_1 = require("../../common/enums/table-status.enum");
const order_item_status_enum_1 = require("../../common/enums/order-item-status.enum");
class PendingOrderItemDto {
    id;
    menuItemName;
    quantity;
    status;
    specialInstructions;
    createdAt;
    estimatedPreparationTime;
}
exports.PendingOrderItemDto = PendingOrderItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID do item do pedido' }),
    __metadata("design:type", String)
], PendingOrderItemDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nome do item do menu' }),
    __metadata("design:type", String)
], PendingOrderItemDto.prototype, "menuItemName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Quantidade' }),
    __metadata("design:type", Number)
], PendingOrderItemDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Status do item', enum: order_item_status_enum_1.OrderItemStatus }),
    __metadata("design:type", String)
], PendingOrderItemDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Instruções especiais', required: false }),
    __metadata("design:type", String)
], PendingOrderItemDto.prototype, "specialInstructions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Data de criação' }),
    __metadata("design:type", Date)
], PendingOrderItemDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tempo estimado de preparo em minutos', required: false }),
    __metadata("design:type", Number)
], PendingOrderItemDto.prototype, "estimatedPreparationTime", void 0);
class TableOverviewDto {
    id;
    number;
    capacity;
    status;
    activeOrderId;
    waiterName;
    orderTotal;
    totalItems;
    pendingItems;
    itemsInPreparation;
    readyItems;
    pendingOrderItems;
    orderOpenedAt;
    orderDurationMinutes;
    hasPendingOrders;
    priority;
}
exports.TableOverviewDto = TableOverviewDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID da mesa' }),
    __metadata("design:type", Number)
], TableOverviewDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Número da mesa' }),
    __metadata("design:type", Number)
], TableOverviewDto.prototype, "number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Capacidade da mesa' }),
    __metadata("design:type", Number)
], TableOverviewDto.prototype, "capacity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Status da mesa', enum: table_status_enum_1.TableStatus }),
    __metadata("design:type", String)
], TableOverviewDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID da comanda ativa', required: false }),
    __metadata("design:type", String)
], TableOverviewDto.prototype, "activeOrderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nome do garçom responsável', required: false }),
    __metadata("design:type", String)
], TableOverviewDto.prototype, "waiterName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Valor total da comanda ativa', required: false }),
    __metadata("design:type", Number)
], TableOverviewDto.prototype, "orderTotal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Número total de itens na comanda', required: false }),
    __metadata("design:type", Number)
], TableOverviewDto.prototype, "totalItems", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Número de itens pendentes', required: false }),
    __metadata("design:type", Number)
], TableOverviewDto.prototype, "pendingItems", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Número de itens em preparo', required: false }),
    __metadata("design:type", Number)
], TableOverviewDto.prototype, "itemsInPreparation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Número de itens prontos', required: false }),
    __metadata("design:type", Number)
], TableOverviewDto.prototype, "readyItems", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Lista de itens pendentes', type: [PendingOrderItemDto], required: false }),
    __metadata("design:type", Array)
], TableOverviewDto.prototype, "pendingOrderItems", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Data de abertura da comanda', required: false }),
    __metadata("design:type", Date)
], TableOverviewDto.prototype, "orderOpenedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tempo desde abertura da comanda em minutos', required: false }),
    __metadata("design:type", Number)
], TableOverviewDto.prototype, "orderDurationMinutes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Indica se a mesa tem pedidos pendentes' }),
    __metadata("design:type", Boolean)
], TableOverviewDto.prototype, "hasPendingOrders", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Prioridade da mesa baseada no tempo de espera', enum: ['low', 'medium', 'high'] }),
    __metadata("design:type", String)
], TableOverviewDto.prototype, "priority", void 0);
class TablesOverviewQueryDto {
    status;
    hasPendingOrders;
    sortBy;
    sortOrder;
    includeOrderDetails;
}
exports.TablesOverviewQueryDto = TablesOverviewQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Filtrar por status da mesa', enum: table_status_enum_1.TableStatus, required: false }),
    __metadata("design:type", String)
], TablesOverviewQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Filtrar apenas mesas com pedidos pendentes', required: false }),
    __metadata("design:type", Boolean)
], TablesOverviewQueryDto.prototype, "hasPendingOrders", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ordenar por campo', enum: ['number', 'status', 'orderDuration', 'pendingItems'], required: false }),
    __metadata("design:type", String)
], TablesOverviewQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Direção da ordenação', enum: ['ASC', 'DESC'], required: false }),
    __metadata("design:type", String)
], TablesOverviewQueryDto.prototype, "sortOrder", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Incluir detalhes dos itens pendentes', required: false }),
    __metadata("design:type", Boolean)
], TablesOverviewQueryDto.prototype, "includeOrderDetails", void 0);
//# sourceMappingURL=table-overview.dto.js.map