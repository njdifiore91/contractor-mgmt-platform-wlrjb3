#Requires -Version 7.0
#Requires -Modules @{ModuleName='Az.Accounts';ModuleVersion='2.12.1'},
                  @{ModuleName='Az.Resources';ModuleVersion='6.5.2'},
                  @{ModuleName='Az.KeyVault';ModuleVersion='4.9.2'},
                  @{ModuleName='Az.Monitor';ModuleVersion='4.0.0'},
                  @{ModuleName='Az.Network';ModuleVersion='5.0.0'},
                  @{ModuleName='Az.ApplicationInsights';ModuleVersion='3.0.0'}

[CmdletBinding()]
param (
    [Parameter(Mandatory = $true)]
    [string]$SubscriptionId,

    [Parameter(Mandatory = $true)]
    [string]$Location,

    [Parameter(Mandatory = $true)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment,

    [Parameter(Mandatory = $false)]
    [hashtable]$Tags = @{
        project = 'SPMS'
        environment = $Environment
        owner = 'operations'
        costCenter = 'it-ops'
    }
)

# Global settings
$ErrorActionPreference = 'Stop'
$VerbosePreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

# Initialize deployment context
function Initialize-Deployment {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$SubscriptionId,
        [Parameter(Mandatory = $true)]
        [string]$Location,
        [Parameter(Mandatory = $true)]
        [string]$Environment,
        [Parameter(Mandatory = $true)]
        [hashtable]$Tags
    )

    try {
        Write-Verbose "Initializing deployment for environment: $Environment"

        # Verify PowerShell version
        if ($PSVersionTable.PSVersion.Major -lt 7) {
            throw "PowerShell 7.0 or higher is required"
        }

        # Connect to Azure
        Write-Verbose "Connecting to Azure subscription: $SubscriptionId"
        Connect-AzAccount -Subscription $SubscriptionId -ErrorAction Stop

        # Validate location
        $validLocation = Get-AzLocation | Where-Object { $_.Location -eq $Location }
        if (-not $validLocation) {
            throw "Invalid Azure location: $Location"
        }

        # Create or get resource group
        $resourceGroupName = "spms-$Environment-rg"
        $resourceGroup = Get-AzResourceGroup -Name $resourceGroupName -Location $Location -ErrorAction SilentlyContinue
        if (-not $resourceGroup) {
            Write-Verbose "Creating resource group: $resourceGroupName"
            $resourceGroup = New-AzResourceGroup -Name $resourceGroupName -Location $Location -Tag $Tags
        }

        # Initialize deployment context
        $deploymentContext = @{
            subscriptionId = $SubscriptionId
            environment = $Environment
            location = $Location
            resourceGroupName = $resourceGroupName
            timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
            tags = $Tags
        }

        # Verify required resource providers
        $requiredProviders = @('Microsoft.KeyVault', 'Microsoft.Network', 'Microsoft.Sql', 'Microsoft.Insights')
        foreach ($provider in $requiredProviders) {
            $registered = Get-AzResourceProvider -ProviderNamespace $provider
            if ($registered.RegistrationState -ne 'Registered') {
                Write-Verbose "Registering resource provider: $provider"
                Register-AzResourceProvider -ProviderNamespace $provider
            }
        }

        return $deploymentContext
    }
    catch {
        Write-Error "Deployment initialization failed: $_"
        throw
    }
}

# Deploy Bicep template
function Deploy-BicepTemplate {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$ResourceGroupName,
        [Parameter(Mandatory = $true)]
        [string]$Location,
        [Parameter(Mandatory = $true)]
        [string]$Environment,
        [Parameter(Mandatory = $true)]
        [hashtable]$Parameters,
        [Parameter(Mandatory = $true)]
        [object]$DeploymentContext
    )

    try {
        Write-Verbose "Starting Bicep template deployment"

        # Validate Bicep template
        $templateFile = Join-Path $PSScriptRoot "..\bicep\main.bicep"
        if (-not (Test-Path $templateFile)) {
            throw "Bicep template not found: $templateFile"
        }

        # Create deployment name
        $deploymentName = "spms-$($DeploymentContext.timestamp)"

        # Build deployment parameters
        $deploymentParams = @{
            ResourceGroupName = $ResourceGroupName
            Name = $deploymentName
            TemplateFile = $templateFile
            environmentName = $Environment
            location = $Location
            baseName = "spms"
            tags = $DeploymentContext.tags
        }

        # Merge additional parameters
        foreach ($param in $Parameters.GetEnumerator()) {
            $deploymentParams[$param.Key] = $param.Value
        }

        # Deploy with retry logic
        $maxRetries = 3
        $retryCount = 0
        $success = $false

        while (-not $success -and $retryCount -lt $maxRetries) {
            try {
                Write-Verbose "Deployment attempt $($retryCount + 1) of $maxRetries"
                $deployment = New-AzResourceGroupDeployment @deploymentParams -ErrorAction Stop
                $success = $true

                # Validate deployment
                if ($deployment.ProvisioningState -ne 'Succeeded') {
                    throw "Deployment failed with state: $($deployment.ProvisioningState)"
                }

                # Configure additional services
                . "$PSScriptRoot\setup-keyvault.ps1"
                Set-KeyVaultAccess -KeyVaultName $deployment.Outputs.keyVaultName.Value `
                    -ServicePrincipals @(
                        @{ObjectId = $deployment.Outputs.appServicePrincipalId.Value; Role = 'Key Vault Secrets User'}
                    ) `
                    -ComplianceRequirements @{RequireCmk = $true; RequireHsm = $true} `
                    -AuditSettings @{EnabledForDeployment = $true}

                . "$PSScriptRoot\setup-monitoring.ps1"
                Set-ApplicationInsights -ResourceGroupName $ResourceGroupName `
                    -Name $deployment.Outputs.appInsightsKey.Value `
                    -WorkspaceId $deployment.Outputs.logAnalyticsWorkspaceId.Value

                return $deployment
            }
            catch {
                $retryCount++
                if ($retryCount -eq $maxRetries) {
                    throw "Deployment failed after $maxRetries attempts: $_"
                }
                Write-Warning "Deployment attempt failed. Retrying in 30 seconds..."
                Start-Sleep -Seconds 30
            }
        }
    }
    catch {
        Write-Error "Template deployment failed: $_"
        throw
    }
}

# Main execution block
try {
    # Initialize deployment
    $deploymentContext = Initialize-Deployment -SubscriptionId $SubscriptionId `
        -Location $Location `
        -Environment $Environment `
        -Tags $Tags

    # Prepare deployment parameters
    $deploymentParams = @{
        administratorLogin = "spmsadmin"
        administratorLoginPassword = (New-Guid).ToString()
    }

    # Deploy infrastructure
    $deployment = Deploy-BicepTemplate -ResourceGroupName $deploymentContext.resourceGroupName `
        -Location $Location `
        -Environment $Environment `
        -Parameters $deploymentParams `
        -DeploymentContext $deploymentContext

    # Export deployment outputs
    $deploymentOutputs = @{
        apiGatewayUrl = $deployment.Outputs.apiGatewayUrl.Value
        webAppHostName = $deployment.Outputs.webAppHostName.Value
        apiAppHostName = $deployment.Outputs.apiAppHostName.Value
        sqlServerFqdn = $deployment.Outputs.sqlServerFqdn.Value
        keyVaultName = $deployment.Outputs.keyVaultName.Value
        appInsightsKey = $deployment.Outputs.appInsightsKey.Value
        deploymentMetrics = @{
            startTime = $deploymentContext.timestamp
            endTime = Get-Date -Format "yyyyMMdd-HHmmss"
            environment = $Environment
            status = $deployment.ProvisioningState
        }
        resourceIds = @{
            resourceGroup = $deploymentContext.resourceGroupName
            keyVault = $deployment.Outputs.keyVaultResourceId.Value
            appInsights = $deployment.Outputs.appInsightsId.Value
        }
        deploymentLogs = Get-AzResourceGroupDeploymentOperation -ResourceGroupName $deploymentContext.resourceGroupName -DeploymentName $deployment.DeploymentName
    }

    return $deploymentOutputs
}
catch {
    Write-Error "Infrastructure deployment failed: $_"
    throw
}