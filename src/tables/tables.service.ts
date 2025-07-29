import { Injectable, NotFoundException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table } from './entities/table.entity';
import { CreateTableDto, UpdateTableDto, UpdateTableStatusDto } from './dto';
import { TableStatus } from '../common/enums/table-status.enum';
import { OrdersGateway } from '../websocket/orders.gateway';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @Inject(forwardRef(() => OrdersGateway))
    private readonly ordersGateway: OrdersGateway,
  ) {}

  async create(createTableDto: CreateTableDto): Promise<Table> {
    // Verificar se já existe uma mesa com o mesmo número
    const existingTable = await this.tableRepository.findOne({
      where: { number: createTableDto.number },
    });

    if (existingTable) {
      throw new ConflictException(`Mesa número ${createTableDto.number} já existe`);
    }

    const table = this.tableRepository.create({
      ...createTableDto,
      capacity: createTableDto.capacity || 4, // Default capacity
    });

    return await this.tableRepository.save(table);
  }

  async findAll(): Promise<Table[]> {
    return await this.tableRepository.find({
      order: { number: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Table> {
    const table = await this.tableRepository.findOne({
      where: { id },
    });

    if (!table) {
      throw new NotFoundException(`Mesa com ID ${id} não encontrada`);
    }

    return table;
  }

  async findByNumber(number: number): Promise<Table> {
    const table = await this.tableRepository.findOne({
      where: { number },
    });

    if (!table) {
      throw new NotFoundException(`Mesa número ${number} não encontrada`);
    }

    return table;
  }

  async update(id: number, updateTableDto: UpdateTableDto): Promise<Table> {
    const table = await this.findOne(id);

    // Se está tentando alterar o número, verificar se não existe outra mesa com esse número
    if (updateTableDto.number && updateTableDto.number !== table.number) {
      const existingTable = await this.tableRepository.findOne({
        where: { number: updateTableDto.number },
      });

      if (existingTable) {
        throw new ConflictException(`Mesa número ${updateTableDto.number} já existe`);
      }
    }

    Object.assign(table, updateTableDto);
    return await this.tableRepository.save(table);
  }

  async updateStatus(id: number, updateStatusDto: UpdateTableStatusDto): Promise<Table> {
    const table = await this.findOne(id);
    table.status = updateStatusDto.status;
    const updatedTable = await this.tableRepository.save(table);
    
    // Notificar sobre mudança de status da mesa
    this.ordersGateway.notifyTableStatusUpdate(updatedTable);
    
    return updatedTable;
  }

  async remove(id: number): Promise<void> {
    const table = await this.findOne(id);
    
    // Verificar se a mesa pode ser removida (não está ocupada)
    if (table.status === TableStatus.OCCUPIED) {
      throw new ConflictException('Não é possível remover uma mesa ocupada');
    }

    await this.tableRepository.remove(table);
  }

  async findAvailable(): Promise<Table[]> {
    return await this.tableRepository.find({
      where: { status: TableStatus.AVAILABLE },
      order: { number: 'ASC' },
    });
  }

  async findOccupied(): Promise<Table[]> {
    return await this.tableRepository.find({
      where: { status: TableStatus.OCCUPIED },
      order: { number: 'ASC' },
    });
  }

  async checkAvailability(id: number): Promise<boolean> {
    const table = await this.findOne(id);
    return table.status === TableStatus.AVAILABLE;
  }

  async getTablesSummary(): Promise<{
    total: number;
    available: number;
    occupied: number;
    reserved: number;
    cleaning: number;
  }> {
    const [total, available, occupied, reserved, cleaning] = await Promise.all([
      this.tableRepository.count(),
      this.tableRepository.count({ where: { status: TableStatus.AVAILABLE } }),
      this.tableRepository.count({ where: { status: TableStatus.OCCUPIED } }),
      this.tableRepository.count({ where: { status: TableStatus.RESERVED } }),
      this.tableRepository.count({ where: { status: TableStatus.CLEANING } }),
    ]);

    return {
      total,
      available,
      occupied,
      reserved,
      cleaning,
    };
  }
}