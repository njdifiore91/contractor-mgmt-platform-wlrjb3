#Requires -Version 7.0
#Requires -Modules @{ModuleName='Az.KeyVault';ModuleVersion='9.3.0'},@{ModuleName='Az.Security';ModuleVersion='9.3.0'},@{ModuleName='Az.Resources';ModuleVersion='9.3.0'}

<#
.SYNOPSIS
    Configures comprehensive security settings and policies for the Service Provider Management System in Azure.
.DESCRIPTION
    Implements enterprise-grade security configurations including:
    - Azure Key Vault setup with RBAC and access policies
    - Security standards compliance (ISO 27001, SOC 2, GDPR)
    - Automated key rotation and secret management
    - Security monitoring and threat protection
.NOTES
    Version: 1.0.0
    Author: Service Provider Management System Team
#>

# Script configuration
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$VerbosePreference = 'Continue'
$ProgressPreference = 'Continue'

# Import Key Vault parameters
$keyVaultParams = Get-Content -Path "$PSScriptRoot/../templates/key-vault-parameters.json" | ConvertFrom-Json

function Set-KeyVaultAccess {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory)]
        [string]$keyVaultName,
        
        [Parameter(Mandatory)]
        [string]$principalId,
        
        [Parameter(Mandatory)]
        [string]$roleDefinition
    )
    
    try {
        Write-Verbose "Configuring access for Key Vault: $keyVaultName"
        
        # Verify Key Vault exists
        $keyVault = Get-AzKeyVault -VaultName $keyVaultName -ErrorAction Stop
        
        # Enable RBAC authorization if not already enabled
        if (-not $keyVault.EnableRbacAuthorization) {
            Update-AzKeyVault -VaultName $keyVaultName -EnableRbacAuthorization $true
            Write-Verbose "Enabled RBAC authorization for Key Vault"
        }
        
        # Assign role to principal
        $roleAssignment = New-AzRoleAssignment `
            -ObjectId $principalId `
            -RoleDefinitionName $roleDefinition `
            -Scope $keyVault.ResourceId
        Write-Verbose "Assigned role '$roleDefinition' to principal ID: $principalId"
        
        # Configure network rules
        $networkRule = @{
            DefaultAction = "Deny"
            Bypass = "AzureServices"
            IpRules = @()
            VirtualNetworkRules = @()
        }
        Update-AzKeyVaultNetworkRuleSet `
            -VaultName $keyVaultName `
            -DefaultAction $networkRule.DefaultAction `
            -Bypass $networkRule.Bypass
        Write-Verbose "Configured network security rules"
        
        # Enable diagnostic logging
        $diagnosticSettings = @{
            Name = "$keyVaultName-diagnostics"
            WorkspaceId = "/subscriptions/$((Get-AzContext).Subscription.Id)/resourceGroups/monitoring/providers/Microsoft.OperationalInsights/workspaces/security-logs"
            Category = @("AuditEvent", "AzurePolicyEvaluationDetails")
            RetentionEnabled = $true
            RetentionInDays = 365
        }
        Set-AzDiagnosticSetting @diagnosticSettings -ResourceId $keyVault.ResourceId
        Write-Verbose "Enabled diagnostic logging"
        
    }
    catch {
        Write-Error "Failed to configure Key Vault access: $_"
        throw
    }
}

function Set-SecurityPolicies {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory)]
        [string]$subscriptionId,
        
        [Parameter(Mandatory)]
        [string]$resourceGroupName
    )
    
    try {
        Write-Verbose "Configuring security policies for subscription: $subscriptionId"
        
        # Enable Security Center
        Set-AzSecurityContact `
            -Name "Security Team" `
            -Email "security@company.com" `
            -Phone "+1-555-555-5555" `
            -AlertNotifications "On" `
            -AlertsToAdmins "On"
        Write-Verbose "Configured Security Center contacts"
        
        # Configure compliance policies
        $policyParams = @{
            Name = "Security-Baseline"
            DisplayName = "Security Baseline Policy"
            Description = "Enforces security baseline requirements"
            Metadata = @{
                category = "Security"
                version = "1.0.0"
            }
            Mode = "All"
            PolicyRule = @{
                if = @{
                    allOf = @(
                        @{
                            field = "type"
                            equals = "Microsoft.KeyVault/vaults"
                        }
                    )
                }
                then = @{
                    effect = "audit"
                }
            }
        }
        New-AzPolicyDefinition @policyParams
        Write-Verbose "Created security baseline policy"
        
        # Enable advanced threat protection
        $resources = Get-AzResource -ResourceGroupName $resourceGroupName
        foreach ($resource in $resources) {
            if ($resource.Type -in @("Microsoft.KeyVault/vaults", "Microsoft.Sql/servers")) {
                Set-AzSecurityAdvancedThreatProtection `
                    -ResourceId $resource.ResourceId `
                    -IsEnabled $true
            }
        }
        Write-Verbose "Enabled advanced threat protection"
        
        # Configure security alerts
        $alertParams = @{
            Name = "Critical-Security-Alerts"
            Description = "Alerts for critical security events"
            Severity = "High"
            Enabled = $true
            Query = "SecurityEvent | where Level == 1"
            Frequency = 5
            TimeWindow = 60
            ThrottleMinutes = 60
        }
        New-AzScheduledQueryRule @alertParams
        Write-Verbose "Configured security alerts"
        
    }
    catch {
        Write-Error "Failed to configure security policies: $_"
        throw
    }
}

function Initialize-KeyVaultSecrets {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory)]
        [string]$keyVaultName,
        
        [Parameter(Mandatory)]
        [hashtable]$secrets
    )
    
    try {
        Write-Verbose "Initializing secrets for Key Vault: $keyVaultName"
        
        foreach ($secretName in $secrets.Keys) {
            # Create or update secret with metadata
            $secretParams = @{
                VaultName = $keyVaultName
                Name = $secretName
                SecretValue = (ConvertTo-SecureString -String $secrets[$secretName] -AsPlainText -Force)
                ContentType = "text/plain"
                Tag = @{
                    Environment = $keyVaultParams.parameters.tags.value.environment
                    Application = "ServiceProviderSystem"
                    Classification = "Confidential"
                }
                NotBefore = (Get-Date)
                ExpiresOn = (Get-Date).AddDays(90)
            }
            Set-AzKeyVaultSecret @secretParams
            Write-Verbose "Created/updated secret: $secretName"
            
            # Configure rotation policy
            $rotationPolicy = @{
                LifetimeActions = @(
                    @{
                        TriggerType = "TimeAfterCreate"
                        DaysAfterCreation = 80
                        Action = "Notify"
                    },
                    @{
                        TriggerType = "TimeAfterCreate"
                        DaysAfterCreation = 90
                        Action = "AutoRenew"
                    }
                )
            }
            Set-AzKeyVaultSecretRotationPolicy `
                -VaultName $keyVaultName `
                -SecretName $secretName `
                -RotationPolicy $rotationPolicy
            Write-Verbose "Configured rotation policy for: $secretName"
        }
        
        # Enable backup
        $backupParams = @{
            VaultName = $keyVaultName
            StorageAccountName = "securitybackups"
            StorageContainerName = "keyvault"
            RetentionDays = 90
        }
        Enable-AzKeyVaultBackup @backupParams
        Write-Verbose "Enabled automated backup"
        
    }
    catch {
        Write-Error "Failed to initialize Key Vault secrets: $_"
        throw
    }
}

# Export functions
Export-ModuleMember -Function Set-KeyVaultAccess, Set-SecurityPolicies, Initialize-KeyVaultSecrets