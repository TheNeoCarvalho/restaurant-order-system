import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuItem, PriceHistory } from './entities';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MenuItem, PriceHistory])],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [TypeOrmModule, MenuService],
})
export class MenuModule {}