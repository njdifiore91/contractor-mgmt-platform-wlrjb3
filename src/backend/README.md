# Service Provider Management System - Backend

Enterprise-grade backend implementation for the Service Provider Management System built with ASP.NET Core 6.0.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Development Guide](#development-guide)
- [Security](#security)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Operations](#operations)

## Overview

The Service Provider Management System backend implements a layered architecture providing REST APIs for managing service providers, equipment, and related business processes. Built using ASP.NET Core 6.0, it provides enterprise features including:

- Role-based access control with Azure AD B2C integration
- Comprehensive data validation and business rules enforcement
- Distributed caching with Redis
- Geographic search capabilities
- Document management with OneDrive integration
- Automated email notifications
- Extensive logging and monitoring

## Architecture

### Solution Structure

```
src/
├── ServiceProvider.Core/           # Domain entities and interfaces
├── ServiceProvider.Infrastructure/ # Data access and external services
├── ServiceProvider.Services/       # Business logic and CQRS implementation
├── ServiceProvider.WebApi/         # REST API endpoints and controllers
└── ServiceProvider.Common/         # Shared utilities and helpers
```

### Technology Stack

- **Framework**: ASP.NET Core 6.0
- **ORM**: Entity Framework Core 6.0
- **Database**: SQL Server 2019
- **Caching**: Redis
- **Authentication**: Azure AD B2C
- **Documentation**: OpenAPI/Swagger
- **Testing**: xUnit, Moq
- **Monitoring**: Application Insights

## Getting Started

### Prerequisites

- .NET 6.0 SDK
- SQL Server 2019 Developer Edition
- Redis Cache
- Azure AD B2C tenant
- Docker (optional)
- Visual Studio 2022 or VS Code

### Local Development Setup

1. Clone the repository
```bash
git clone https://github.com/company/service-provider-management
cd service-provider-management/src/backend
```

2. Configure user secrets
```bash
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=.;Database=ServiceProvider;Trusted_Connection=True;MultipleActiveResultSets=true"
dotnet user-secrets set "AzureAd:TenantId" "your-tenant-id"
dotnet user-secrets set "AzureAd:ClientId" "your-client-id"
```

3. Apply database migrations
```bash
dotnet ef database update --project src/ServiceProvider.Infrastructure --startup-project src/ServiceProvider.WebApi
```

4. Run the application
```bash
dotnet run --project src/ServiceProvider.WebApi
```

## Development Guide

### Project Dependencies

- ServiceProvider.Core (v1.0.0)
  - Microsoft.EntityFrameworkCore.Abstractions (v6.0.0)
  - NetTopologySuite (v2.5.0)

- ServiceProvider.Infrastructure (v1.0.0)
  - Entity Framework Core SQL Server (v6.0.0)
  - Microsoft.Identity.Web (v1.25.0)
  - StackExchangeRedis (v6.0.0)

- ServiceProvider.WebApi (v1.0.0)
  - Swashbuckle.AspNetCore (v6.0.0)
  - Serilog.AspNetCore (v6.0.0)

### Code Style

- Follow .NET coding conventions
- Use nullable reference types
- Implement comprehensive XML documentation
- Follow SOLID principles
- Implement unit tests for business logic

## Security

### Authentication

- Azure AD B2C integration
- JWT bearer token authentication
- Configurable token lifetime
- Multi-factor authentication support

### Authorization

- Role-based access control
- Policy-based authorization
- Resource-based authorization
- Claims-based identity

### Data Protection

- TLS 1.3 for transport security
- Column-level encryption for sensitive data
- Azure Key Vault integration
- SQL TDE encryption

## Deployment

### Environment Configuration

- Development: Local development environment
- Testing: Integration testing environment
- Staging: Pre-production validation
- Production: Live system environment

### Deployment Process

1. Build and test
```bash
dotnet build
dotnet test
```

2. Publish application
```bash
dotnet publish -c Release -o ./publish
```

3. Deploy to Azure App Service
```bash
az webapp up --name service-provider-api --resource-group rg-service-provider --plan plan-service-provider
```

## API Documentation

- OpenAPI documentation available at `/swagger`
- API versioning supported
- Comprehensive request/response examples
- Authentication requirements documented
- Rate limiting information included

## Operations

### Health Monitoring

- Health check endpoint: `/health`
- Application Insights integration
- Custom metrics tracking
- Performance counters

### Logging

- Structured logging with Serilog
- Log levels: Debug, Info, Warning, Error
- Application Insights integration
- Correlation ID tracking

### Caching Strategy

- Distributed caching with Redis
- Memory caching for frequently accessed data
- Cache invalidation patterns
- Cache-aside implementation

### Error Handling

- Global exception handling
- Custom error responses
- Validation error formatting
- Problem Details format (RFC 7807)

## License

Copyright © 2023 Service Provider Management System. All rights reserved.