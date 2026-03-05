# ARIS Server

The backend server for the ARIS platform, built with Express, Prisma, and PostgreSQL.

## Architecture

The server follows a layered architecture:
- **Controllers** (`src/controllers`): Handle HTTP requests and responses.
- **Services** (`src/services`): Contain business logic.
- **Routes** (`src/routes`): Define API endpoints.
- **Middlewares** (`src/middlewares`): Handle cross-cutting concerns (auth, error handling).
- **Utils** (`src/utils`): Helper functions.

## Getting Started

### Prerequisites
- Bun (or Node.js)
- PostgreSQL
- Firebase Admin credentials (for phone auth)

### Installation
1. Install dependencies:
   ```bash
   bun install
   ```
2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
3. Run database migrations:
   ```bash
   bun prisma migrate dev
   ```

### Running the Server
- **Development**:
  ```bash
  bun run dev
  ```
- **Production**:
  ```bash
  bun run build
  bun start
  ```

## API Documentation

Base URL: `/api`

### General
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/` | API Information and version | No |
| `GET` | `/health` | Health check (DB connection status) | No |

### Authentication (`/auth`)
| Method | Endpoint | Description | Auth Required | Body/Params |
|--------|----------|-------------|---------------|-------------|
| `GET` | `/nonce` | Get a nonce for wallet signature | No | Query: `address` (Ethereum address) |
| `POST` | `/login` | Authenticate with wallet signature | No | Body: `address`, `signature`, `message`, `nonce` |
| `POST` | `/logout` | Invalidate current session | Yes | - |
| `POST` | `/verify` | Verify a signature (Testing utility) | No | Body: `address`, `signature`, `message` |

### User Management (`/users`)
| Method | Endpoint | Description | Auth Required | Body/Params |
|--------|----------|-------------|---------------|-------------|
| `GET` | `/me` | Get current authenticated user profile | Yes | - |
| `GET` | `/` | Get list of users (paginated) | No | - |
| `GET` | `/:id` | Get public profile of a specific user | No | Param: `id` (User ID) |
| `GET` | `/check-username` | Check if a username is available | No | Query: `username` |
| `POST` | `/` | Create or update user (Upsert) | Yes | Body: `email`, `displayName`, `avatarUrl`, etc. |
| `PUT` | `/` | Create or update user (Upsert) | Yes | Body: `email`, `displayName`, `avatarUrl`, etc. |
| `PATCH` | `/profile` | Update user profile fields | Yes | Body: `username`, `bio`, `socialLinks`, etc. |
| `POST` | `/email/send-otp` | Send verification OTP to email | Yes | Body: `email` |
| `POST` | `/email/verify-otp` | Verify email OTP | Yes | Body: `email`, `otp` |

### Phone Verification (`/phone`)
| Method | Endpoint | Description | Auth Required | Body/Params |
|--------|----------|-------------|---------------|-------------|
| `GET` | `/check-availability` | Check if phone number is available | Yes | Query: `phoneNumber` |
| `POST` | `/verify-firebase` | Verify Firebase ID token & link phone | Yes | Body: `idToken` |

## Error Handling
All endpoints return standard error responses:
```json
{
  "error": "Error message description",
  "message": "Detailed error (dev mode only)"
}
```

## Authentication
Authentication is handled via JWT tokens in the `Authorization` header:
```
Authorization: Bearer <token>
```
Tokens are issued upon successful login via `/api/auth/login`.
