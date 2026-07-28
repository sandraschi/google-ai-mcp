# Per-repo fleet start config for google-ai-mcp
# Edit ports/backend target here - start.ps1 is fleet-standard.
@{
    Name         = 'google-ai-mcp'
    BackendPort  = 11014
    FrontendPort = 11015
    HealthPath   = '/health'
    WebRoot      = 'D:\Dev\repos\google-ai-mcp\webapp'
    Backend = @{
        Kind          = 'uvicorn'
        UvicornTarget = 'google_ai_mcp.server:app'
        SyncExtras    = @('dev')
        Env           = @{ WEB_PORT = '11014' }
    }
    Frontend = @{
        Kind           = 'vite-npm'
        PackageManager = 'npm'
        PortEnvVar     = 'VITE_PORT'
        ApiTargetEnv   = 'VITE_API_TARGET'
    }
}
