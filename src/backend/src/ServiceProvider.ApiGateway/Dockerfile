# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
LABEL stage=builder

WORKDIR /src

# Copy project files first to leverage Docker layer caching for package restore
COPY ["Directory.Build.props", "/"]
COPY ["Directory.Packages.props", "/"]
COPY ["src/backend/src/ServiceProvider.ApiGateway/ServiceProvider.ApiGateway.csproj", "src/backend/src/ServiceProvider.ApiGateway/"]
COPY ["src/backend/src/ServiceProvider.Core/ServiceProvider.Core.csproj", "src/backend/src/ServiceProvider.Core/"]
COPY ["src/backend/src/ServiceProvider.Infrastructure/ServiceProvider.Infrastructure.csproj", "src/backend/src/ServiceProvider.Infrastructure/"]

# Restore NuGet packages
RUN dotnet restore "src/backend/src/ServiceProvider.ApiGateway/ServiceProvider.ApiGateway.csproj"

# Copy the remaining source code
COPY . .

# Build and publish the application
RUN dotnet build "src/backend/src/ServiceProvider.ApiGateway/ServiceProvider.ApiGateway.csproj" -c Release -o /app/build
RUN dotnet publish "src/backend/src/ServiceProvider.ApiGateway/ServiceProvider.ApiGateway.csproj" -c Release -o /app/publish

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:6.0 AS runtime

# Add labels for container metadata
LABEL maintainer="Service Provider Team" \
      version="1.0" \
      description="API Gateway service container" \
      environment="production"

# Create non-root user for security
RUN adduser --disabled-password --gecos "" appuser

WORKDIR /app

# Copy published artifacts from build stage
COPY --from=build /app/publish .

# Set ownership to non-root user
RUN chown -R appuser:appuser /app

# Use non-root user
USER appuser

# Set environment variables
ENV ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true \
    ASPNETCORE_URLS=http://+:80

# Expose port 80
EXPOSE 80

# Set the entry point
ENTRYPOINT ["dotnet", "ServiceProvider.ApiGateway.dll"]

# Configure health check
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1