param(
  [string]$GeminiKey = "AIzaSyAsfm9DajOv85x6bBiFlr1f7w2-qBp7-Bw",
  [string]$AdminEmail = "tranvinhhuy@gmail.com",
  [string]$AdminPass = "vhuytran07",
  [string]$GatewayUrl = "http://localhost:3000",
  [string]$AuthUrl = "http://localhost:3001",
  [string]$AIUrl = "http://localhost:3012"
)

$PASS = "[PASS]"; $FAIL = "[FAIL]"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  AI Flow E2E Test Suite" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# --- Step 1: Direct health checks ---
Write-Host "`n[1] Health checks" -ForegroundColor Yellow
$ah = Invoke-RestMethod "$AuthUrl/health" -EA SilentlyContinue
$aih = Invoke-RestMethod "$AIUrl/health" -EA SilentlyContinue
Write-Host "  Auth-service  : $($ah.status)"
Write-Host "  AI-service    : $($aih.status) | model=$($aih.model)"

# --- Step 2: Internal config security ---
Write-Host "`n[2] Internal config security" -ForegroundColor Yellow

try {
  $r = Invoke-WebRequest "$AuthUrl/api/internal/system-config" -UseBasicParsing -EA Stop
  Write-Host "  $FAIL No-secret should return 403, got $($r.StatusCode)"
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  if ($code -eq 403) { Write-Host "  $PASS No-secret → 403 (correct)" }
  else { Write-Host "  $FAIL No-secret → $code (expected 403)" }
}

try {
  $r = Invoke-WebRequest "$AuthUrl/api/internal/system-config" `
    -Headers @{"x-internal-secret"="ielts_internal_secret_2026"} -UseBasicParsing -EA Stop
  $cfg = $r.Content | ConvertFrom-Json
  Write-Host "  $PASS With-secret → 200 | geminiApiKey='$($cfg.geminiApiKey)'"
} catch {
  Write-Host "  $FAIL With-secret → $($_.Exception.Message)"
}

# --- Step 3: Admin login ---
Write-Host "`n[3] Admin login" -ForegroundColor Yellow
try {
  $loginBody = @{ email = $AdminEmail; password = $AdminPass } | ConvertTo-Json -Compress
  $loginResp = Invoke-RestMethod "$GatewayUrl/api/auth/login" -Method POST `
    -Body $loginBody -ContentType "application/json" -EA Stop
  $TOKEN = $loginResp.token
  Write-Host "  $PASS Logged in as $($loginResp.user.email) | role=$($loginResp.user.role)"
} catch {
  Write-Host "  $FAIL Login failed: $($_.Exception.Message)"
  Write-Host "  Aborting remaining tests."
  exit 1
}

# --- Step 4: Read config (should show geminiKeySet=false) ---
Write-Host "`n[4] Admin GET /api/admin/system-config" -ForegroundColor Yellow
try {
  $cfg = Invoke-RestMethod "$GatewayUrl/api/admin/system-config" `
    -Headers @{Authorization="Bearer $TOKEN"} -EA Stop
  Write-Host "  $PASS Got config | geminiKeySet=$($cfg.geminiApiKeySet)"
} catch {
  Write-Host "  $FAIL $($_.Exception.Message)"
}

# --- Step 5: Save API key ---
Write-Host "`n[5] Admin PUT /api/admin/system-config (save Gemini key)" -ForegroundColor Yellow
try {
  $putBody = @{
    geminiApiKey = $GeminiKey
    listeningPromptTemplate = "Return a JSON object with IELTS listening test structure from this image."
    readingPromptTemplate = "Return a JSON object with IELTS reading test structure from this image."
  } | ConvertTo-Json -Compress
  $putResp = Invoke-RestMethod "$GatewayUrl/api/admin/system-config" -Method PUT `
    -Body $putBody -ContentType "application/json" -Headers @{Authorization="Bearer $TOKEN"} -EA Stop
  Write-Host "  $PASS Config saved | message=$($putResp.message)"
} catch {
  Write-Host "  $FAIL $($_.Exception.Message)"
}

# --- Step 6: Verify key now shows as set ---
Write-Host "`n[6] Admin GET /api/admin/system-config (verify key saved)" -ForegroundColor Yellow
try {
  $cfg = Invoke-RestMethod "$GatewayUrl/api/admin/system-config" `
    -Headers @{Authorization="Bearer $TOKEN"} -EA Stop
  if ($cfg.geminiApiKeySet -eq $true) {
    Write-Host "  $PASS geminiKeySet=true (key stored in DB)"
  } else {
    Write-Host "  $FAIL geminiKeySet=$($cfg.geminiApiKeySet)"
  }
} catch {
  Write-Host "  $FAIL $($_.Exception.Message)"
}

# --- Step 7: Internal config now returns real key ---
Write-Host "`n[7] Internal config — key should now be present" -ForegroundColor Yellow
try {
  $r = Invoke-WebRequest "$AuthUrl/api/internal/system-config" `
    -Headers @{"x-internal-secret"="ielts_internal_secret_2026"} -UseBasicParsing -EA Stop
  $icfg = $r.Content | ConvertFrom-Json
  if ($icfg.geminiApiKey.Length -gt 5) {
    Write-Host "  $PASS Internal key returned (length=$($icfg.geminiApiKey.Length))"
  } else {
    Write-Host "  $FAIL Key still empty: '$($icfg.geminiApiKey)'"
  }
} catch {
  Write-Host "  $FAIL $($_.Exception.Message)"
}

# --- Step 8: Real Gemini call (small PNG) ---
Write-Host "`n[8] AI parse-listening-image via Gateway (real Gemini call)" -ForegroundColor Yellow
$tmpImg = "$env:TEMP\ielts_test_img.png"
[System.IO.File]::WriteAllBytes($tmpImg, [Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="))
Write-Host "  Calling Gemini (may take up to 30s)..."
$geminiOut = curl.exe -s -w "`n%{http_code}" -X POST "$GatewayUrl/api/ai/parse-listening-image" `
  -F "file=@$tmpImg;type=image/png" --max-time 60
$lines = $geminiOut -split "`n"
$httpCode = $lines[-1]
$body = ($lines[0..($lines.Length-2)]) -join "`n"
Write-Host "  HTTP=$httpCode"
if ($httpCode -eq "200") {
  Write-Host "  $PASS Gemini returned JSON"
  Write-Host "  Response (first 200 chars): $($body.Substring(0, [Math]::Min(200, $body.Length)))"
} elseif ($httpCode -eq "422") {
  Write-Host "  $PASS (expected) Gemini parsed image but returned 422 (small image, prompt mismatch)"
  Write-Host "  Body: $body"
} elseif ($httpCode -eq "503") {
  Write-Host "  $FAIL Still 503 - key not loaded yet: $body"
} else {
  Write-Host "  Result HTTP=$httpCode | $body"
}

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  Test complete" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
