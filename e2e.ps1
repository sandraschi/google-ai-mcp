$out = "D:\Dev\repos\google-ai-mcp\e2e_results.txt"
"" > $out
"=== Starting servers ===" >> $out

npx --yes kill-port 11014 2>$null; npx --yes kill-port 11015 2>$null; Start-Sleep 1
"ports cleared" >> $out

# backend
$bj = Start-Job -ScriptBlock { param($d,$uv) Set-Location $d; & $uv run uvicorn google_ai_mcp.server:app --host 127.0.0.1 --port 11014 --log-level warning } -ArgumentList "D:\Dev\repos\google-ai-mcp","C:\Users\sandr\.local\bin\uv.exe"
"backend job $($bj.Id)" >> $out
for($i=0;$i-lt 90;$i++){try{$r=Invoke-WebRequest -Uri "http://127.0.0.1:11014/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue;if($r.StatusCode-eq200){break}}catch{};Start-Sleep 1}
"backend ready after ${i}s" >> $out

# frontend
$fj = Start-Job -ScriptBlock { param($d) Set-Location $d; npx vite --port 11015 --host } -ArgumentList "D:\Dev\repos\google-ai-mcp\webapp"
"frontend job $($fj.Id)" >> $out
for($i=0;$i-lt 30;$i++){try{$r=Invoke-WebRequest -Uri "http://127.0.0.1:11015" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue;if($r.StatusCode-eq200){break}}catch{};Start-Sleep 1}
"frontend ready after ${i}s" >> $out

"=== Running playwright ===" >> $out
Set-Location "D:\Dev\repos\google-ai-mcp\webapp"
npx playwright test --reporter=list >> $out 2>&1
"exit code: $LASTEXITCODE" >> $out

Stop-Job $bj,$fj -ErrorAction SilentlyContinue; Remove-Job $bj,$fj -ErrorAction SilentlyContinue
npx --yes kill-port 11014 2>$null; npx --yes kill-port 11015 2>$null
"=== done ===" >> $out
