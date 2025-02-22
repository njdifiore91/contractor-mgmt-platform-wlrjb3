# Build stage
FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /src

# Copy project files and restore dependencies with layer caching
COPY ["Directory.Build.props", "./"]
COPY ["Directory.Packages.props", "./"]
COPY ["src/ServiceProvider.WebApi/ServiceProvider.WebApi.csproj", "src/ServiceProvider.WebApi/"]
COPY ["src/ServiceProvider.Core/ServiceProvider.Core.csproj", "src/ServiceProvider.Core/"]
COPY ["src/ServiceProvider.Infrastructure/ServiceProvider.Infrastructure.csproj", "src/ServiceProvider.Infrastructure/"]
COPY ["src/ServiceProvider.Services/ServiceProvider.Services.csproj", "src/ServiceProvider.Services/"]
COPY ["src/ServiceProvider.Common/ServiceProvider.Common.csproj", "src/ServiceProvider.Common/"]

# Restore NuGet packages
RUN dotnet restore "src/ServiceProvider.WebApi/ServiceProvider.WebApi.csproj" --disable-parallel

# Copy remaining source code
COPY . .

# Build and publish with optimizations
RUN dotnet build "src/ServiceProvider.WebApi/ServiceProvider.WebApi.csproj" -c Release --no-restore
RUN dotnet publish "src/ServiceProvider.WebApi/ServiceProvider.WebApi.csproj" -c Release -o /app/publish --no-restore

# Final runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:6.0 AS final

# Add non-root user for security
RUN addgroup --system --gid 1000 appgroup && \
    adduser --system --uid 1000 --ingroup appgroup --shell /bin/false appuser

# Set working directory
WORKDIR /app

# Copy published output from build stage
COPY --from=build /app/publish .

# Set file ownership and permissions
RUN chown -R appuser:appgroup /app && \
    chmod -R 755 /app

# Configure environment variables
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:80
ENV DOTNET_RUNNING_IN_CONTAINER=true
ENV DOTNET_EnableDiagnostics=0

# Configure health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Expose port
EXPOSE 80

# Set user context
USER appuser

# Set entry point
ENTRYPOINT ["dotnet", "ServiceProvider.WebApi.dll"]