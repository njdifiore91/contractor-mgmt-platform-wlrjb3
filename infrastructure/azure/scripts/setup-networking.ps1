#Requires -Version 7.0
#Requires -Modules @{ModuleName='Az.Network'; ModuleVersion='9.3.0'}
#Requires -Modules @{ModuleName='Az.Security'; ModuleVersion='9.3.0'}

[CmdletBinding()]
param (
    [Parameter(Mandatory = $true)]
    [string]$ResourceGroupName,

    [Parameter(Mandatory = $true)]
    [string]$Location,

    [Parameter(Mandatory = $true)]
    [string]$VNetName,

    [Parameter(Mandatory = $true)]
    [string]$VNetAddressPrefix,

    [Parameter(Mandatory = $false)]
    [string]$LogAnalyticsWorkspaceId
)

# Set strict error handling
$ErrorActionPreference = 'Stop'
$VerbosePreference = 'Continue'
$WarningPreference = 'Continue'

# Import required configuration from ARM templates
$apiGatewayConfig = Get-Content -Path "$PSScriptRoot/../arm/api-gateway.json" | ConvertFrom-Json
$appServiceConfig = Get-Content -Path "$PSScriptRoot/../arm/app-service.json" | ConvertFrom-Json

function New-NetworkSecurityGroup {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$ResourceGroupName,
        
        [Parameter(Mandatory = $true)]
        [string]$Location,
        
        [Parameter(Mandatory = $true)]
        [string]$NSGName,
        
        [Parameter(Mandatory = $true)]
        [object]$SecurityRules,
        
        [Parameter(Mandatory = $false)]
        [object]$LogSettings
    )

    Write-Verbose "Creating NSG: $NSGName"
    
    # Create base NSG with default deny rules
    $nsg = New-AzNetworkSecurityGroup -ResourceGroupName $ResourceGroupName `
        -Location $Location `
        -Name $NSGName

    # Add security rules with priorities
    $priority = 100
    foreach ($rule in $SecurityRules) {
        $nsg | Add-AzNetworkSecurityRuleConfig `
            -Name $rule.name `
            -Description $rule.description `
            -Access $rule.access `
            -Protocol $rule.protocol `
            -Direction $rule.direction `
            -Priority $priority `
            -SourceAddressPrefix $rule.sourceAddressPrefix `
            -SourcePortRange $rule.sourcePortRange `
            -DestinationAddressPrefix $rule.destinationAddressPrefix `
            -DestinationPortRange $rule.destinationPortRange
        
        $priority += 100
    }

    # Configure NSG flow logs if workspace ID provided
    if ($LogSettings) {
        Set-AzNetworkWatcherConfigFlowLog -NetworkWatcher $nsg `
            -TargetResourceId $nsg.Id `
            -StorageAccountId $LogSettings.storageAccountId `
            -EnableFlowLog $true `
            -FormatType JSON `
            -FormatVersion 2 `
            -EnableTrafficAnalytics `
            -WorkspaceResourceId $LogSettings.workspaceId `
            -WorkspaceRegion $Location `
            -WorkspaceId $LogSettings.workspaceGuid `
            -TrafficAnalyticsInterval 10
    }

    $nsg | Set-AzNetworkSecurityGroup
    return $nsg
}

function New-VirtualNetwork {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$ResourceGroupName,
        
        [Parameter(Mandatory = $true)]
        [string]$Location,
        
        [Parameter(Mandatory = $true)]
        [string]$VNetName,
        
        [Parameter(Mandatory = $true)]
        [string]$AddressPrefix,
        
        [Parameter(Mandatory = $true)]
        [object]$SubnetConfig,
        
        [Parameter(Mandatory = $false)]
        [object]$ServiceEndpoints
    )

    Write-Verbose "Creating VNet: $VNetName"

    # Create the virtual network
    $vnet = New-AzVirtualNetwork `
        -ResourceGroupName $ResourceGroupName `
        -Location $Location `
        -Name $VNetName `
        -AddressPrefix $AddressPrefix

    # Configure subnets with service endpoints
    foreach ($subnet in $SubnetConfig) {
        $subnetConfig = New-AzVirtualNetworkSubnetConfig `
            -Name $subnet.name `
            -AddressPrefix $subnet.addressPrefix `
            -ServiceEndpoint $ServiceEndpoints

        $vnet.Subnets.Add($subnetConfig)
    }

    # Enable DDoS Protection
    $vnet.EnableDdosProtection = $true
    $vnet.EnableVmProtection = $true

    $vnet | Set-AzVirtualNetwork
    return $vnet
}

function Set-WafPolicy {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$ResourceGroupName,
        
        [Parameter(Mandatory = $true)]
        [string]$PolicyName,
        
        [Parameter(Mandatory = $true)]
        [string]$Mode,
        
        [Parameter(Mandatory = $true)]
        [object]$CustomRules,
        
        [Parameter(Mandatory = $true)]
        [object]$RateLimits
    )

    Write-Verbose "Creating WAF Policy: $PolicyName"

    # Create WAF policy with OWASP 3.2 ruleset
    $wafPolicy = New-AzApplicationGatewayWebApplicationFirewallPolicy `
        -ResourceGroupName $ResourceGroupName `
        -Name $PolicyName `
        -PolicySetting @{
            State = "Enabled"
            Mode = $Mode
            RequestBodyCheck = $true
            MaxRequestBodySizeInKb = 128
            FileUploadLimitInMb = 100
        } `
        -ManagedRule @{
            ManagedRuleSet = @(
                @{
                    RuleSetType = "OWASP"
                    RuleSetVersion = "3.2"
                }
            )
        }

    # Add custom rules
    foreach ($rule in $CustomRules) {
        $wafPolicy.CustomRules.Add($rule)
    }

    # Configure rate limiting
    $wafPolicy.CustomRules.Add([PSCustomObject]@{
        Name = "RateLimitRule"
        Priority = 1
        RuleType = "RateLimitRule"
        MatchConditions = @(
            @{
                MatchVariables = @(@{ VariableName = "RemoteAddr" })
                Operator = "IPMatch"
                MatchValues = @("*")
            }
        )
        Action = "Block"
        RateLimitThreshold = $RateLimits.requestsPerMinute
        RateLimitDurationInMinutes = 1
    })

    $wafPolicy | Set-AzApplicationGatewayWebApplicationFirewallPolicy
    return $wafPolicy
}

function Enable-DDoSProtection {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$ResourceGroupName,
        
        [Parameter(Mandatory = $true)]
        [string]$VNetName,
        
        [Parameter(Mandatory = $true)]
        [object]$ProtectionSettings,
        
        [Parameter(Mandatory = $true)]
        [object]$AlertConfig
    )

    Write-Verbose "Enabling DDoS Protection for VNet: $VNetName"

    # Create DDoS protection plan
    $ddosProtectionPlan = New-AzDdosProtectionPlan `
        -ResourceGroupName $ResourceGroupName `
        -Name "$VNetName-ddos-plan" `
        -Location $Location

    # Configure DDoS protection settings
    $vnet = Get-AzVirtualNetwork -Name $VNetName -ResourceGroupName $ResourceGroupName
    $vnet.DdosProtectionPlan = @{
        Id = $ddosProtectionPlan.Id
    }
    $vnet.EnableDdosProtection = $true

    # Configure alerts
    foreach ($alert in $AlertConfig.Alerts) {
        New-AzMetricAlertRuleV2 `
            -ResourceGroupName $ResourceGroupName `
            -Name $alert.Name `
            -TargetResourceId $vnet.Id `
            -Condition $alert.Condition `
            -Severity $alert.Severity `
            -WindowSize $alert.WindowSize `
            -Frequency $alert.Frequency `
            -ActionGroupId $AlertConfig.ActionGroupId
    }

    $vnet | Set-AzVirtualNetwork
    return $vnet
}

# Main deployment script
try {
    Write-Verbose "Starting network infrastructure setup..."

    # Create NSG with security rules
    $nsgRules = @(
        @{
            name = "AllowHttpsInbound"
            description = "Allow HTTPS inbound traffic"
            access = "Allow"
            protocol = "Tcp"
            direction = "Inbound"
            sourceAddressPrefix = "*"
            sourcePortRange = "*"
            destinationAddressPrefix = "*"
            destinationPortRange = "443"
        }
        # Add more security rules as needed
    )

    $nsg = New-NetworkSecurityGroup `
        -ResourceGroupName $ResourceGroupName `
        -Location $Location `
        -NSGName "$VNetName-nsg" `
        -SecurityRules $nsgRules `
        -LogSettings @{
            storageAccountId = $LogAnalyticsWorkspaceId
            workspaceId = $LogAnalyticsWorkspaceId
        }

    # Create Virtual Network with subnets
    $subnetConfig = @(
        @{
            name = "gateway-subnet"
            addressPrefix = "10.0.0.0/24"
        }
        @{
            name = "app-subnet"
            addressPrefix = "10.0.1.0/24"
        }
    )

    $vnet = New-VirtualNetwork `
        -ResourceGroupName $ResourceGroupName `
        -Location $Location `
        -VNetName $VNetName `
        -AddressPrefix $VNetAddressPrefix `
        -SubnetConfig $subnetConfig `
        -ServiceEndpoints @("Microsoft.Web", "Microsoft.Sql")

    # Configure WAF Policy
    $wafPolicy = Set-WafPolicy `
        -ResourceGroupName $ResourceGroupName `
        -PolicyName "$VNetName-waf-policy" `
        -Mode "Prevention" `
        -CustomRules $apiGatewayConfig.properties.customRules `
        -RateLimits @{ requestsPerMinute = 1000 }

    # Enable DDoS Protection
    $vnet = Enable-DDoSProtection `
        -ResourceGroupName $ResourceGroupName `
        -VNetName $VNetName `
        -ProtectionSettings @{
            EnableProtection = $true
            EnableLogging = $true
        } `
        -AlertConfig @{
            Alerts = @(
                @{
                    Name = "DDoSAttackAlert"
                    Condition = @{
                        MetricName = "UnderDDoSAttack"
                        Operator = "GreaterThan"
                        Threshold = 0
                    }
                    Severity = 0
                    WindowSize = "PT5M"
                    Frequency = "PT1M"
                }
            )
            ActionGroupId = "/subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/microsoft.insights/actionGroups/{action-group}"
        }

    Write-Verbose "Network infrastructure setup completed successfully"

    # Return created resource IDs
    return @{
        vnetName = @{
            name = $vnet.Name
            resourceId = $vnet.Id
        }
        nsgName = @{
            name = $nsg.Name
            resourceId = $nsg.Id
        }
        wafPolicyId = @{
            id = $wafPolicy.Id
        }
    }
}
catch {
    Write-Error "Failed to setup network infrastructure: $_"
    throw
}