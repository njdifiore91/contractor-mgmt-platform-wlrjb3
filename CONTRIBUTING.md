# Contributing to Service Provider Management System

## Table of Contents
- [Development Environment Setup](#development-environment-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation Standards](#documentation-standards)

## Development Environment Setup

### Required Tools
- Visual Studio 2022+ Enterprise/Professional
  - Required Extensions:
    - Web Essentials
    - TypeScript Tools
    - Azure Tools
- Visual Studio Code Latest
  - Required Extensions:
    - Vue Language Features
    - ESLint
    - Prettier
    - C# Dev Kit
- Git 2.x+
- npm 8.x+
- NuGet 6.x+
- Docker Desktop

### Environment Configuration
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.updateImportsOnFileMove.enabled": "always"
}
```

### Local Development
1. Clone the repository
```bash
git clone https://github.com/organization/service-provider-management.git
cd service-provider-management
```

2. Install dependencies
```bash
# Frontend
cd src/frontend
npm install

# Backend
cd src/backend
dotnet restore
```

3. Configure environment variables
```bash
# Create environment files from templates
cp .env.example .env
cp appsettings.Development.json.example appsettings.Development.json
```

4. Start development servers
```bash
# Frontend (Vue.js)
npm run serve

# Backend (ASP.NET Core)
dotnet run
```

## Code Style Guidelines

### TypeScript Standards
- Use TypeScript strict mode
- Follow ESLint configuration
- Naming conventions:
  - Interfaces: `IUserService`
  - Types: `UserType`
  - Enums: `UserRole`
- File naming: kebab-case (`user-service.ts`)

### C# Standards
- Follow Microsoft's C# Coding Conventions
- Use C# 10.0+ features appropriately
- Naming conventions:
  - Classes: PascalCase
  - Methods: PascalCase
  - Private fields: _camelCase
- File organization:
  - One class per file
  - Namespace matches folder structure

### Vue.js Best Practices
- Component naming: PascalCase
- Props validation required
- Use Composition API
- Follow Vue.js Style Guide Priority A rules
- Component structure:
```vue
<template>
  <!-- Template content -->
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'ComponentName',
  // Component logic
})
</script>

<style scoped lang="scss">
/* Component styles */
</style>
```

### ASP.NET Core Patterns
- Follow SOLID principles
- Use dependency injection
- Implement repository pattern
- Use async/await consistently
- Follow REST API conventions

## Pull Request Process

### Branch Strategy
- Main branches:
  - `main`: Production code
  - `develop`: Development code
- Feature branches:
  - Format: `feature/TICKET-ID-description`
  - Example: `feature/SPMS-123-add-user-authentication`
- Hotfix branches:
  - Format: `hotfix/TICKET-ID-description`

### PR Template
```markdown
## Description
[Describe changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Tests passing
- [ ] PR title follows conventional commits
```

### Review Guidelines
- Two approvals required
- All comments must be resolved
- CI/CD pipeline must pass
- Code coverage requirements met

### CI/CD Requirements
- All builds must pass
- Test coverage >= 80%
- No security vulnerabilities
- SonarQube quality gate passed

## Testing Requirements

### Unit Testing
- Frontend: Jest
  - Coverage >= 80%
  - Test file naming: `*.spec.ts`
- Backend: xUnit
  - Coverage >= 80%
  - Test file naming: `*Tests.cs`

### Integration Testing
- API testing with Postman/Newman
- Database integration tests
- Service integration tests
- Mock external dependencies

### E2E Testing
- Cypress for frontend
- Test critical user flows
- Cross-browser testing
- Performance testing requirements

### Coverage Requirements
- Overall coverage >= 80%
- Critical paths >= 90%
- Business logic >= 85%
- Generate coverage reports

## Documentation Standards

### API Documentation
- OpenAPI 3.0 specification
- Detailed endpoint descriptions
- Request/response examples
- Error handling documentation
- Authentication details

### Code Comments
- Use JSDoc for TypeScript
- Use XML comments for C#
- Document complex algorithms
- Explain business logic
- Update comments with code changes

### README Standards
- Project overview
- Setup instructions
- Environment requirements
- Common issues/solutions
- Contributing guidelines link

### Changelog Guidelines
- Follow Keep a Changelog format
- Version numbers (SemVer)
- Document all changes
- Link to relevant PRs
- Update with each release

## Security Standards

- Follow OWASP guidelines
- Implement security headers
- Use secure authentication
- Protect sensitive data
- Regular security audits

## Support

For questions or issues:
- Create a GitHub issue
- Contact the development team
- Check existing documentation

## License

[Include license information]

---
Last updated: 2023-12-01
Version: 1.0.0
Maintainers: Development Team Lead, Technical Architect