# NedaPay Backend API

Express.js backend with TypeScript, migrated from Next.js API routes.

## Architecture

This backend follows **Clean Architecture** principles with clear separation of concerns:

```
src/
├── config/           # Configuration management (environment variables)
├── controllers/      # HTTP request handlers (thin layer)
├── middleware/       # Express middleware (auth, validation, error handling)
├── models/           # TypeScript interfaces and types
├── repositories/     # Data access layer (Prisma queries)
├── routes/           # Route definitions (Express Router)
├── services/         # Business logic layer
├── utils/            # Utility functions and helpers
├── validators/       # Zod validation schemas
├── types/            # TypeScript type definitions
├── errors/           # Custom error classes
├── app.ts            # Express app setup
└── server.ts         # Server entry point
```

## Design Principles

### SOLID Principles

1. **Single Responsibility**: Each class/module has one reason to change
2. **Open/Closed**: Open for extension, closed for modification
3. **Liskov Substitution**: Subtypes are substitutable for base types
4. **Interface Segregation**: Many specific interfaces over one general
5. **Dependency Inversion**: Depend on abstractions, not concretions

### Patterns Used

- **Repository Pattern**: Abstract data access behind interfaces
- **Service Layer**: Business logic separate from controllers
- **Factory Pattern**: Create complex objects (e.g., Prisma client)
- **Middleware Chain**: Cross-cutting concerns (auth, logging, errors)
- **DTO Pattern**: Data Transfer Objects for API requests/responses

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- PostgreSQL database
- npm or yarn

### Installation

```bash
# Navigate to backend directory
cd backend-migration

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:push

# Start development server
npm run dev
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |
| `npm run typecheck` | Type check without building |

## API Structure

Base URL: `http://localhost:4000/api/v1`

### Health Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Basic health check |
| `/health/ready` | GET | Readiness check (includes DB) |
| `/health/live` | GET | Liveness check |

### Migrated Endpoints (TODO)

As we migrate from Next.js, the following routes will be added:

- [ ] `/auth` - Authentication
- [ ] `/users` - User management
- [ ] `/transactions` - Transaction history
- [ ] `/idrx` - IDRX integration
- [ ] `/kyc` - KYC verification
- [ ] `/contacts` - Contact management
- [ ] `/admin` - Admin operations
- [ ] ... and more

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "statusCode": 400,
    "fields": {
      "email": ["Invalid email format"]
    }
  },
  "timestamp": "2025-11-28T15:00:00.000Z",
  "requestId": "abc-123"
}
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `AUTHENTICATION_ERROR` | 401 | Authentication required or failed |
| `AUTHORIZATION_ERROR` | 403 | Permission denied |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT_ERROR` | 409 | Resource already exists |
| `RATE_LIMIT_ERROR` | 429 | Too many requests |
| `EXTERNAL_SERVICE_ERROR` | 502 | External API error |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Adding New Routes

### 1. Create Validator

```typescript
// src/validators/user.validator.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
```

### 2. Create Repository

```typescript
// src/repositories/user.repository.ts
import { prisma } from './prisma.js';
import { CreateUserInput } from '../validators/user.validator.js';

export const userRepository = {
  async create(data: CreateUserInput) {
    return prisma.user.create({ data });
  },
  
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },
};
```

### 3. Create Service

```typescript
// src/services/user.service.ts
import { userRepository } from '../repositories/user.repository.js';
import { CreateUserInput } from '../validators/user.validator.js';
import { NotFoundError, ConflictError } from '../errors/index.js';

export const userService = {
  async createUser(input: CreateUserInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('User already exists');
    }
    return userRepository.create(input);
  },
};
```

### 4. Create Controller

```typescript
// src/controllers/user.controller.ts
import { Request, Response } from 'express';
import { userService } from '../services/user.service.js';
import { createSuccessResponse } from '../types/api.js';

export const userController = {
  async create(req: Request, res: Response) {
    const user = await userService.createUser(req.body);
    res.status(201).json(createSuccessResponse(user, 'User created'));
  },
};
```

### 5. Create Route

```typescript
// src/routes/user.routes.ts
import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { validateBody } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { createUserSchema } from '../validators/user.validator.js';

const router = Router();

router.post('/',
  authenticate,
  validateBody(createUserSchema),
  userController.create
);

export default router;
```

### 6. Register Route

```typescript
// src/app.ts
import userRoutes from './routes/user.routes.js';

// In createApp():
app.use(`${apiPrefix}/users`, userRoutes);
```

## Migration Strategy

We are migrating from Next.js API routes to Express. The strategy is:

1. **Phase 1**: Set up Express backend structure ✅
2. **Phase 2**: Migrate routes one module at a time
3. **Phase 3**: Update Next.js frontend to use new backend
4. **Phase 4**: Remove Next.js API routes
5. **Phase 5**: Production deployment

### Migration Checklist

- [x] Core infrastructure (config, errors, logger)
- [x] Middleware (auth, validation, error handling)
- [x] Database connection (Prisma)
- [x] Health check routes
- [ ] User routes
- [ ] Auth routes
- [ ] Transaction routes
- [ ] IDRX routes
- [ ] KYC routes
- [ ] ... (see full list in `/app/api`)

## Environment Variables

See `.env.example` for all required and optional environment variables.

## License

MIT
