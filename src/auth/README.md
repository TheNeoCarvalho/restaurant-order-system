# Sistema de Autorização por Roles

Este documento explica como usar o sistema de autorização baseado em roles implementado no sistema de pedidos do restaurante.

## Componentes

### 1. RolesGuard

O `RolesGuard` é responsável por verificar se o usuário autenticado possui as permissões necessárias para acessar um endpoint específico.

```typescript
import { RolesGuard } from './guards/roles.guard';
```

### 2. @Roles Decorator

O decorator `@Roles` é usado para especificar quais roles têm permissão para acessar um endpoint.

```typescript
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Roles(UserRole.ADMIN)
@Get('admin-only')
adminOnlyEndpoint() {
  // Apenas usuários ADMIN podem acessar
}

@Roles(UserRole.WAITER, UserRole.KITCHEN)
@Get('waiter-kitchen')
waiterKitchenEndpoint() {
  // Usuários WAITER ou KITCHEN podem acessar
}
```

## Como Usar

### 1. Configuração Global

Os guards `JwtAuthGuard` e `RolesGuard` estão configurados globalmente no `AppModule`, então não é necessário aplicá-los manualmente em cada controller:

```typescript
// app.module.ts
providers: [
  {
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
  },
  {
    provide: APP_GUARD,
    useClass: RolesGuard,
  },
]
```

Isso significa que **todos os endpoints** requerem autenticação por padrão, exceto aqueles marcados com `@Public()`.

### 2. Configuração Manual (Opcional)

Se você quiser aplicar os guards manualmente em um controller específico (não recomendado com a configuração global):

```typescript
import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Controller('example')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExampleController {
  // endpoints aqui
}
```

### 3. Aplicando Roles nos Endpoints

```typescript
import { Get, Post } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('example')
export class ExampleController {
  
  // Endpoint acessível por qualquer usuário autenticado
  @Get('public-authenticated')
  publicAuthenticated() {
    return { message: 'Qualquer usuário autenticado pode acessar' };
  }

  // Endpoint apenas para administradores
  @Get('admin-only')
  @Roles(UserRole.ADMIN)
  adminOnly() {
    return { message: 'Apenas administradores' };
  }

  // Endpoint para garçons e administradores
  @Post('waiter-admin')
  @Roles(UserRole.WAITER, UserRole.ADMIN)
  waiterAdmin() {
    return { message: 'Garçons e administradores' };
  }

  // Endpoint para todos os tipos de usuário
  @Get('all-roles')
  @Roles(UserRole.ADMIN, UserRole.WAITER, UserRole.KITCHEN)
  allRoles() {
    return { message: 'Todos os tipos de usuário' };
  }
}
```

### 4. Endpoints Públicos

Para endpoints que não requerem autenticação, use o decorator `@Public()`:

```typescript
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Post('login')
login() {
  // Endpoint público - não requer autenticação
}
```

**Importante**: Com a configuração global, todos os endpoints requerem autenticação por padrão. Use `@Public()` apenas para endpoints que realmente devem ser acessíveis sem autenticação (como login, registro, etc.).

## Tipos de Usuário

O sistema suporta três tipos de usuário:

- **ADMIN**: Acesso completo ao sistema
- **WAITER**: Garçons - podem gerenciar comandas e visualizar status
- **KITCHEN**: Cozinha - podem visualizar pedidos e atualizar status de preparo

## Comportamento do Sistema

1. **Sem @Roles**: Qualquer usuário autenticado pode acessar
2. **Com @Roles**: Apenas usuários com os roles especificados podem acessar
3. **@Public()**: Endpoint público, não requer autenticação
4. **Sem usuário**: Retorna 401 Unauthorized
5. **Usuário sem permissão**: Retorna 403 Forbidden

## Exemplos de Uso por Módulo

### Módulo de Mesas (Tables)
```typescript
@Get() // Todos podem visualizar
@Roles(UserRole.ADMIN, UserRole.WAITER) // Apenas admin e garçom podem criar/editar
```

### Módulo de Cardápio (Menu)
```typescript
@Get() // Todos podem visualizar
@Roles(UserRole.ADMIN) // Apenas admin pode gerenciar
```

### Módulo de Pedidos (Orders)
```typescript
@Get() // Todos podem visualizar
@Roles(UserRole.ADMIN, UserRole.WAITER) // Admin e garçom podem criar/fechar
@Roles(UserRole.KITCHEN) // Cozinha pode atualizar status de preparo
```

## Testes

O sistema inclui testes unitários para o `RolesGuard` que verificam:

- Acesso quando não há roles requeridos
- Bloqueio quando usuário não está presente
- Acesso quando usuário tem o role correto
- Bloqueio quando usuário não tem o role necessário
- Acesso quando usuário tem um dos múltiplos roles permitidos

Execute os testes com:
```bash
npm run test -- roles.guard.spec.ts
```