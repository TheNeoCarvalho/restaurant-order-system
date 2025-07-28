import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { CreateMenuItemDto, UpdateMenuItemDto, MenuItemResponseDto } from './dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Menu')
@ApiBearerAuth()
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Criar novo item do cardápio (apenas ADMIN)' })
  @ApiResponse({
    status: 201,
    description: 'Item criado com sucesso',
    type: MenuItemResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou item já existe',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas administradores',
  })
  async create(
    @Body() createMenuItemDto: CreateMenuItemDto,
  ): Promise<MenuItemResponseDto> {
    const menuItem = await this.menuService.create(createMenuItemDto);
    return new MenuItemResponseDto(menuItem);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar todos os itens do cardápio' })
  @ApiQuery({
    name: 'available',
    required: false,
    description: 'Filtrar apenas itens disponíveis',
    type: Boolean,
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filtrar por categoria',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de itens do cardápio',
    type: [MenuItemResponseDto],
  })
  async findAll(
    @Query('available') available?: string,
    @Query('category') category?: string,
  ): Promise<MenuItemResponseDto[]> {
    let menuItems;

    if (available === 'true') {
      menuItems = await this.menuService.findAvailable();
    } else if (category) {
      menuItems = await this.menuService.findByCategory(category);
    } else {
      menuItems = await this.menuService.findAll();
    }

    return menuItems.map((item) => new MenuItemResponseDto(item));
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Listar todas as categorias disponíveis' })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorias',
    type: [String],
  })
  async getCategories(): Promise<string[]> {
    return await this.menuService.getCategories();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Buscar item específico do cardápio' })
  @ApiParam({
    name: 'id',
    description: 'ID do item do cardápio',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Item encontrado',
    type: MenuItemResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Item não encontrado',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MenuItemResponseDto> {
    const menuItem = await this.menuService.findOne(id);
    return new MenuItemResponseDto(menuItem);
  }

  @Get(':id/price-history')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Buscar histórico de preços (apenas ADMIN)' })
  @ApiParam({
    name: 'id',
    description: 'ID do item do cardápio',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico de preços',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas administradores',
  })
  @ApiResponse({
    status: 404,
    description: 'Item não encontrado',
  })
  async getPriceHistory(@Param('id', ParseUUIDPipe) id: string) {
    return await this.menuService.getPriceHistory(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar item do cardápio (apenas ADMIN)' })
  @ApiParam({
    name: 'id',
    description: 'ID do item do cardápio',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Item atualizado com sucesso',
    type: MenuItemResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas administradores',
  })
  @ApiResponse({
    status: 404,
    description: 'Item não encontrado',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
    @CurrentUser() user: User,
  ): Promise<MenuItemResponseDto> {
    const menuItem = await this.menuService.update(
      id,
      updateMenuItemDto,
      user.id,
    );
    return new MenuItemResponseDto(menuItem);
  }

  @Patch(':id/toggle-availability')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Alternar disponibilidade do item (apenas ADMIN)' })
  @ApiParam({
    name: 'id',
    description: 'ID do item do cardápio',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Disponibilidade alterada com sucesso',
    type: MenuItemResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas administradores',
  })
  @ApiResponse({
    status: 404,
    description: 'Item não encontrado',
  })
  async toggleAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<MenuItemResponseDto> {
    const menuItem = await this.menuService.toggleAvailability(id, user.id);
    return new MenuItemResponseDto(menuItem);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover item do cardápio (apenas ADMIN)' })
  @ApiParam({
    name: 'id',
    description: 'ID do item do cardápio',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Item removido com sucesso',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas administradores',
  })
  @ApiResponse({
    status: 404,
    description: 'Item não encontrado',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.menuService.remove(id);
  }
}