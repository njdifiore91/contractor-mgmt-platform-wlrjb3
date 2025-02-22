#Requires -Version 7.0
#Requires -Modules @{ModuleName='Az.KeyVault';ModuleVersion='4.0.0'},@{ModuleName='Az.Resources';ModuleVersion='6.0.0'},@{ModuleName='Az.Monitor';ModuleVersion='3.0.0'},@{ModuleName='Az.Network';ModuleVersion='4.0.0'}

[CmdletBinding()]
param (
    [Parameter(Mandatory = $true)]
    [string]$ResourceGroupName,

    [Parameter(Mandatory = $true)]
    [string]$Location,

    [Parameter(Mandatory = $false)]
    [string]$TemplateFile = "$PSScriptRoot/../arm/key-vault.json",

    [Parameter(Mandatory = $false)]
    [string]$ParameterFile = "$PSScriptRoot/../templates/key-vault-parameters.json"
)

# Set strict error handling
$ErrorActionPreference = 'Stop'
$VerbosePreference = 'Continue'
$WarningPreference = 'Continue'

# Configure default parameter values
$PSDefaultParameterValues = @{
    "*:Verbose" = $true
    "*:ErrorAction" = "Stop"
}

function New-KeyVaultDeployment {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$ResourceGroupName,
        
        [Parameter(Mandatory = $true)]
        [string]$Location,
        
        [Parameter(Mandatory = $true)]
        [string]$KeyVaultName,
        
        [Parameter(Mandatory = $true)]
        [object]$NetworkConfiguration,
        
        [Parameter(Mandatory = $true)]
        [object]$ComplianceSettings
    )

    try {
        Write-Verbose "Starting Key Vault deployment validation..."

        # Validate Key Vault name globally
        $existingVault = Get-AzKeyVault -VaultName $KeyVaultName -ErrorAction SilentlyContinue
        if ($existingVault) {
            throw "Key Vault name '$KeyVaultName' is already in use"
        }

        # Load and validate deployment parameters
        $deploymentParams = @{
            ResourceGroupName = $ResourceGroupName
            TemplateFile = $TemplateFile
            TemplateParameterFile = $ParameterFile
            keyVaultName = $KeyVaultName
            location = $Location
            skuName = "Premium"
            enableRbacAuthorization = $true
            softDeleteRetentionInDays = 90
            enablePurgeProtection = $true
            networkAcls = $NetworkConfiguration
        }

        # Deploy Key Vault with retry logic
        $maxRetries = 3
        $retryCount = 0
        $success = $false

        while (-not $success -and $retryCount -lt $maxRetries) {
            try {
                $deployment = New-AzResourceGroupDeployment @deploymentParams
                $success = $true
            }
            catch {
                $retryCount++
                if ($retryCount -eq $maxRetries) {
                    throw
                }
                Write-Warning "Deployment attempt $retryCount failed. Retrying in 30 seconds..."
                Start-Sleep -Seconds 30
            }
        }

        # Configure advanced threat protection
        Set-AzKeyVaultAdvancedSecuritySettings -VaultName $KeyVaultName

        # Enable diagnostics settings
        $diagnosticSettings = @{
            Name = "$KeyVaultName-diagnostics"
            ResourceId = $deployment.Outputs.keyVaultResourceId.Value
            WorkspaceId = $ComplianceSettings.LogAnalyticsWorkspaceId
            Category = @("AuditEvent", "AzurePolicyEvaluationDetails")
            RetentionEnabled = $true
            RetentionInDays = 365
        }
        Set-AzDiagnosticSetting @diagnosticSettings

        return $deployment
    }
    catch {
        Write-Error "Failed to deploy Key Vault: $_"
        throw
    }
}

function Set-KeyVaultAccess {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$KeyVaultName,
        
        [Parameter(Mandatory = $true)]
        [array]$ServicePrincipals,
        
        [Parameter(Mandatory = $true)]
        [object]$ComplianceRequirements,
        
        [Parameter(Mandatory = true)]
        [object]$AuditSettings
    )

    try {
        Write-Verbose "Configuring Key Vault access policies..."

        # Configure RBAC roles
        foreach ($sp in $ServicePrincipals) {
            $roleAssignment = @{
                ObjectId = $sp.ObjectId
                RoleDefinitionName = $sp.Role
                Scope = (Get-AzKeyVault -VaultName $KeyVaultName).ResourceId
            }
            New-AzRoleAssignment @roleAssignment
        }

        # Configure key rotation policies
        $rotationPolicy = @{
            VaultName = $KeyVaultName
            KeyName = "*"
            RotationDays = 90
            NotificationDays = @(30, 15, 7)
        }
        Set-AzKeyVaultKeyRotationPolicy @rotationPolicy

        # Configure compliance-related settings
        Set-AzKeyVaultCompliancePolicy -VaultName $KeyVaultName -Settings $ComplianceRequirements

        # Set up audit logging
        Enable-AzKeyVaultAuditLogging -VaultName $KeyVaultName -Settings $AuditSettings
    }
    catch {
        Write-Error "Failed to configure Key Vault access: $_"
        throw
    }
}

function Add-InitialSecrets {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$KeyVaultName,
        
        [Parameter(Mandatory = $true)]
        [hashtable]$Secrets,
        
        [Parameter(Mandatory = true)]
        [object]$RotationPolicy,
        
        [Parameter(Mandatory = true)]
        [object]$BackupSettings
    )

    try {
        Write-Verbose "Adding initial secrets to Key Vault..."

        foreach ($secret in $Secrets.GetEnumerator()) {
            # Add secret with metadata
            $secretParams = @{
                VaultName = $KeyVaultName
                Name = $secret.Key
                SecretValue = (ConvertTo-SecureString -String $secret.Value -AsPlainText -Force)
                ContentType = "text/plain"
                Tag = @{
                    Environment = $env:ENVIRONMENT
                    Application = "ServiceProviderSystem"
                    Classification = "Confidential"
                    RotationRequired = "True"
                }
                NotBefore = (Get-Date)
                ExpiresOn = (Get-Date).AddDays($RotationPolicy.ExpiryDays)
            }
            $newSecret = Set-AzKeyVaultSecret @secretParams

            # Configure backup for the secret
            if ($BackupSettings.EnableBackup) {
                Backup-AzKeyVaultSecret -VaultName $KeyVaultName -Name $secret.Key
            }
        }
    }
    catch {
        Write-Error "Failed to add initial secrets: $_"
        throw
    }
}

# Main execution block
try {
    Write-Verbose "Starting Key Vault setup script..."

    # Load network configuration
    $networkConfig = @{
        defaultAction = "Deny"
        bypass = "AzureServices"
        ipRules = @()
        virtualNetworkRules = @()
    }

    # Load compliance settings
    $complianceSettings = @{
        LogAnalyticsWorkspaceId = "/subscriptions/$env:SUBSCRIPTION_ID/resourceGroups/$ResourceGroupName/providers/Microsoft.OperationalInsights/workspaces/$env:LOG_ANALYTICS_WORKSPACE"
        RequireInfrastructureEncryption = $true
        EnablePurgeProtection = $true
        EnableSoftDelete = $true
    }

    # Deploy Key Vault
    $keyVaultDeployment = New-KeyVaultDeployment `
        -ResourceGroupName $ResourceGroupName `
        -Location $Location `
        -KeyVaultName "$env:SYSTEM_PREFIX-kv-$env:ENVIRONMENT" `
        -NetworkConfiguration $networkConfig `
        -ComplianceSettings $complianceSettings

    # Configure access policies
    $servicePrincipals = @(
        @{
            ObjectId = $env:APP_IDENTITY_OBJECT_ID
            Role = "Key Vault Secrets Officer"
        },
        @{
            ObjectId = $env:DEPLOYMENT_IDENTITY_OBJECT_ID
            Role = "Key Vault Administrator"
        }
    )

    Set-KeyVaultAccess `
        -KeyVaultName $keyVaultDeployment.Outputs.keyVaultName.Value `
        -ServicePrincipals $servicePrincipals `
        -ComplianceRequirements @{
            RequireCmk = $true
            RequireHsm = $true
            AuditRetentionDays = 365
        } `
        -AuditSettings @{
            EnabledForDeployment = $true
            EnabledForTemplateDeployment = $true
            EnabledForDiskEncryption = $true
        }

    # Add initial secrets
    $initialSecrets = @{
        "AppSecret" = $env:APP_SECRET
        "DbConnectionString" = $env:DB_CONNECTION_STRING
        "ApiKey" = $env:API_KEY
    }

    Add-InitialSecrets `
        -KeyVaultName $keyVaultDeployment.Outputs.keyVaultName.Value `
        -Secrets $initialSecrets `
        -RotationPolicy @{
            ExpiryDays = 90
            NotificationDays = @(30, 15, 7)
        } `
        -BackupSettings @{
            EnableBackup = $true
            RetentionDays = 90
        }

    # Export Key Vault information
    $Global:KeyVaultName = $keyVaultDeployment.Outputs.keyVaultName.Value
    $Global:KeyVaultResourceId = $keyVaultDeployment.Outputs.keyVaultResourceId.Value
    $Global:KeyVaultConfiguration = @{
        SecuritySettings = $complianceSettings
        ComplianceStatus = "Compliant"
        NetworkConfiguration = $networkConfig
    }

    Write-Verbose "Key Vault setup completed successfully"
}
catch {
    Write-Error "Key Vault setup failed: $_"
    throw
}