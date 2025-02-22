#Requires -Version 7.0
#Requires -Modules @{ModuleName='Az.Monitor';ModuleVersion='4.0.0'}, @{ModuleName='Az.ApplicationInsights';ModuleVersion='2.1.0'}

[CmdletBinding()]
param (
    [Parameter(Mandatory = $true)]
    [string]$ResourceGroupName,

    [Parameter(Mandatory = $true)]
    [string]$Location,

    [Parameter(Mandatory = $true)]
    [ValidateSet('Development', 'Staging', 'Production')]
    [string]$Environment,

    [Parameter(Mandatory = $false)]
    [hashtable]$Tags = @{}
)

# Global error handling and preferences
$ErrorActionPreference = 'Stop'
$VerbosePreference = 'Continue'
$MaxRetryAttempts = 3
$RetryDelaySeconds = 30

# Import required modules with version check
function Test-RequiredModules {
    try {
        $requiredModules = @(
            @{Name = 'Az.Monitor'; Version = '4.0.0'},
            @{Name = 'Az.ApplicationInsights'; Version = '2.1.0'}
        )

        foreach ($module in $requiredModules) {
            $installedModule = Get-Module -Name $module.Name -ListAvailable | 
                Sort-Object Version -Descending | 
                Select-Object -First 1

            if (-not $installedModule -or $installedModule.Version -lt $module.Version) {
                throw "Required module $($module.Name) version $($module.Version) or higher is not installed"
            }
        }
    }
    catch {
        Write-Error "Module validation failed: $_"
        throw
    }
}

function New-ApplicationInsights {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string]$ResourceGroupName,

        [Parameter(Mandatory = $true)]
        [string]$Location,

        [Parameter(Mandatory = $true)]
        [hashtable]$SecuritySettings
    )

    try {
        # Load parameters from JSON file
        $parametersPath = Join-Path $PSScriptRoot '..\templates\app-insights-parameters.json'
        $parameters = Get-Content $parametersPath | ConvertFrom-Json

        # Load ARM template
        $templatePath = Join-Path $PSScriptRoot '..\arm\app-insights.json'
        $template = Get-Content $templatePath | ConvertFrom-Json

        # Prepare deployment parameters
        $deploymentParams = @{
            appInsightsName = $Name
            location = $Location
            workspaceResourceId = $SecuritySettings.WorkspaceId
            dailyQuota = $parameters.parameters.dailyQuota.value
            retentionInDays = $parameters.parameters.retentionInDays.value
            tags = $Tags
        }

        # Deploy Application Insights
        $deployment = New-AzResourceGroupDeployment -ResourceGroupName $ResourceGroupName `
            -TemplateFile $templatePath `
            -TemplateParameterObject $deploymentParams `
            -Name "AppInsights-$(Get-Date -Format 'yyyyMMdd-HHmmss')" `
            -Mode Incremental

        return $deployment
    }
    catch {
        Write-Error "Failed to create Application Insights: $_"
        throw
    }
}

function Set-AlertRules {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$AppInsightsName,

        [Parameter(Mandatory = $true)]
        [string]$ResourceGroupName,

        [Parameter(Mandatory = $true)]
        [hashtable]$AlertSettings
    )

    try {
        # Response time alert
        $responseTimeAlert = @{
            Name = "$AppInsightsName-ResponseTime"
            ResourceGroupName = $ResourceGroupName
            WindowSize = New-TimeSpan -Minutes 5
            Frequency = New-TimeSpan -Minutes 1
            Threshold = 2000 # 2 seconds
            Operator = 'GreaterThan'
            MetricName = 'requests/duration'
            Severity = 2
        }

        New-AzMetricAlertRuleV2 @responseTimeAlert

        # Error rate alert
        $errorRateAlert = @{
            Name = "$AppInsightsName-ErrorRate"
            ResourceGroupName = $ResourceGroupName
            WindowSize = New-TimeSpan -Minutes 5
            Frequency = New-TimeSpan -Minutes 1
            Threshold = 5 # 5% error rate
            Operator = 'GreaterThan'
            MetricName = 'requests/failed'
            Severity = 1
        }

        New-AzMetricAlertRuleV2 @errorRateAlert

        # Request rate alert with dynamic thresholds
        $requestRateAlert = @{
            Name = "$AppInsightsName-RequestRate"
            ResourceGroupName = $ResourceGroupName
            WindowSize = New-TimeSpan -Minutes 10
            Frequency = New-TimeSpan -Minutes 5
            DynamicThreshold = $true
            DynamicThresholdSensitivity = 'Medium'
            MetricName = 'requests/count'
            Severity = 3
        }

        New-AzMetricAlertRuleV2 @requestRateAlert
    }
    catch {
        Write-Error "Failed to create alert rules: $_"
        throw
    }
}

function Set-DiagnosticSettings {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$ResourceId,

        [Parameter(Mandatory = $true)]
        [string]$WorkspaceId,

        [Parameter(Mandatory = $true)]
        [hashtable]$RetentionSettings
    )

    try {
        $diagnosticSettings = @{
            Name = "AppInsightsDiagnostics"
            ResourceId = $ResourceId
            WorkspaceId = $WorkspaceId
            Enabled = $true
            Categories = @(
                'AppAvailabilityResults'
                'AppBrowserTimings'
                'AppEvents'
                'AppMetrics'
                'AppDependencies'
                'AppExceptions'
                'AppPageViews'
                'AppPerformanceCounters'
                'AppRequests'
                'AppSystemEvents'
                'AppTraces'
            )
            RetentionEnabled = $true
            RetentionInDays = $RetentionSettings.RetentionDays
        }

        Set-AzDiagnosticSetting @diagnosticSettings
    }
    catch {
        Write-Error "Failed to configure diagnostic settings: $_"
        throw
    }
}

function Set-MonitoringInfrastructure {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$ResourceGroupName,

        [Parameter(Mandatory = $true)]
        [string]$Location,

        [Parameter(Mandatory = $true)]
        [string]$Environment,

        [Parameter(Mandatory = $true)]
        [hashtable]$Tags
    )

    try {
        # Validate required modules
        Test-RequiredModules

        # Create Application Insights
        $appInsightsName = "spms-$Environment-ai"
        $securitySettings = @{
            WorkspaceId = "/subscriptions/$((Get-AzContext).Subscription.Id)/resourceGroups/$ResourceGroupName/providers/Microsoft.OperationalInsights/workspaces/spms-$Environment-law"
            PublicNetworkAccess = 'Enabled'
            IpRestrictions = @()
        }

        $appInsights = New-ApplicationInsights -Name $appInsightsName `
            -ResourceGroupName $ResourceGroupName `
            -Location $Location `
            -SecuritySettings $securitySettings

        # Configure alert rules
        $alertSettings = @{
            ActionGroupId = "/subscriptions/$((Get-AzContext).Subscription.Id)/resourceGroups/$ResourceGroupName/providers/Microsoft.Insights/actionGroups/spms-$Environment-ag"
            DynamicThresholdSensitivity = 'Medium'
            EvaluationFrequency = 5
            WindowSize = 10
        }

        Set-AlertRules -AppInsightsName $appInsightsName `
            -ResourceGroupName $ResourceGroupName `
            -AlertSettings $alertSettings

        # Configure diagnostic settings
        $retentionSettings = @{
            RetentionDays = 90
            WorkspaceRetentionDays = 365
        }

        Set-DiagnosticSettings -ResourceId $appInsights.ResourceId `
            -WorkspaceId $securitySettings.WorkspaceId `
            -RetentionSettings $retentionSettings

        Write-Verbose "Monitoring infrastructure setup completed successfully"
    }
    catch {
        Write-Error "Failed to set up monitoring infrastructure: $_"
        throw
    }
}

# Execute the main function
try {
    Set-MonitoringInfrastructure -ResourceGroupName $ResourceGroupName `
        -Location $Location `
        -Environment $Environment `
        -Tags $Tags
}
catch {
    Write-Error "Script execution failed: $_"
    exit 1
}