# Build Log

## 2026-10-06 - NSIS rebuild after dead-spawn-path fix

Result: `dist/Google AI MCP_0.1.0_x64-setup.exe` (57.5 MiB). Frozen backend smoke test on the
operator port: listens on 11242, `GET /health` and `GET /api/health` return 200, no red flags in stderr.
Not run: CUA install/launch/uninstall smoke test.

Fixed before building:

| Problem | Fix |
|---------|-----|
| `main.rs` had its own `start_backend` (spawned with `--http --port 11014`, no port freeing, no health poll); `backend.rs::spawn_backend` was dead code. `main.rs` also lacked `CommandExt`. | `start_backend` calls `spawn_backend`; child killed on `Exit` and `ExitRequested`. |
| `backend.rs` `BACKEND_PORT` was 11015, the frontend port. | Operator port 11242 (claimed as `google-ai-mcp-native`), never the dev ports 11014/11015. |
| `free_port` was one `taskkill` by port plus a 500 ms sleep. | Multi-layer kill, self-PID excluded, polls up to 240 s. |
| Webapp `API_BASE` hardcoded to the dev backend port. | `VITE_API_BASE`-driven; `native/build.ps1` bakes `http://127.0.0.1:11242`. |

Known leftovers: no `.env.example` at the repo root (the build writes an empty stub); `native/resources/`
is untracked.

## Build Failure - 2026-08-26 14:39:54

### Build FAILED (exit 1)
```njust.exe : Set-Location 'D:\Dev\repos\google-ai-mcp\native'
At C:\Users\sandr\.gemini\antigravity\brain\be84629a-7705-4f3a-898a-e5f3e12f7306\scratch\build_15_repos.ps1:127 char:20
+     $buildOutput = & just build-native 2>&1
+                    ~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (Set-Location 'D...-ai-mcp\native':String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
 
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
.\build.ps1
.\build.ps1 : The term '.\build.ps1' is not recognized as the name of a cmdlet, function, script file, or operable 
program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
At line:1 char:1
+ .\build.ps1
+ ~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (.\build.ps1:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException
 
error: Recipe `build-native` failed on line 64 with exit code 1

```

## Build Failure - 2026-08-26 14:58:14

### Build FAILED
exit 1

