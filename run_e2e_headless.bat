@echo off
cd /d D:\Dev\repos\google-ai-mcp\webapp
powershell -ExecutionPolicy Bypass -Command "npx playwright test --reporter=list" > D:\Dev\repos\google-ai-mcp\e2e_results.txt 2>&1
echo DONE >> D:\Dev\repos\google-ai-mcp\e2e_results.txt
