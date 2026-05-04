param(
    [string]$TeacherEmail = "teacher@gmail.com",
    [string]$TeacherPass  = "123456",
    [string]$StudentEmail = "student3@gmail.com",
    [string]$StudentPass  = "123456",
    [string]$Base         = "http://localhost:3000/api"
)
$ErrorActionPreference = "Stop"
$global:PASS = 0 ; $global:FAIL = 0
function cPass([string]$m){ Write-Host "  [PASS] $m" -ForegroundColor Green ; $global:PASS++ }
function cFail([string]$m){ Write-Host "  [FAIL] $m" -ForegroundColor Red   ; $global:FAIL++ }
function cInfo([string]$m){ Write-Host "  [INFO] $m" -ForegroundColor Cyan  }
function Section([string]$t){ Write-Host ""; Write-Host "=== $t ===" -ForegroundColor Yellow }
function Invoke-Api {
    param([string]$Uri,[string]$Method="GET",[hashtable]$Headers=@{},[string]$Body="")
    try {
        if ($Body) { return Invoke-RestMethod -Uri $Uri -Method $Method -Headers $Headers -Body $Body -ContentType "application/json" }
        else       { return Invoke-RestMethod -Uri $Uri -Method $Method -Headers $Headers -ContentType "application/json" }
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        $detail = $_.ErrorDetails.Message
        throw "HTTP $code - $detail"
    }
}
Section "PHASE 0 - AUTH"
cInfo "Login teacher ($TeacherEmail)..."
$tRes = Invoke-Api -Uri "$Base/auth/login" -Method POST -Body (@{email=$TeacherEmail;password=$TeacherPass}|ConvertTo-Json)
$TEACHER_TOKEN = $tRes.data.token ; $TEACHER_ID = $tRes.data._id ; $tRole = $tRes.data.role
if($TEACHER_TOKEN){ cPass "Teacher login OK - role=$tRole id=$TEACHER_ID" } else { cFail "Teacher login failed"; exit 1 }
if($tRole -match "Teacher|Admin"){ cPass "Teacher role OK ($tRole)" } else { cFail "Teacher role is $tRole - need Teacher or Admin" }
cInfo "Login student ($StudentEmail)..."
$sRes = Invoke-Api -Uri "$Base/auth/login" -Method POST -Body (@{email=$StudentEmail;password=$StudentPass}|ConvertTo-Json)
$STUDENT_TOKEN = $sRes.data.token ; $STUDENT_ID = $sRes.data._id
if($STUDENT_TOKEN){ cPass "Student login OK - id=$STUDENT_ID" } else { cFail "Student login failed"; exit 1 }
$tHead = @{ Authorization="Bearer $TEACHER_TOKEN" }
$sHead = @{ Authorization="Bearer $STUDENT_TOKEN" }
Section "PHASE 1A - CREATE LISTENING TEST"
function Build-LQ([int]$offset){
    $qs=@()
    for($i=1;$i-le 10;$i++){ $n=$offset+$i; $qs+=@{questionText="QA L Q$n";type="fill_blank";options=@();correctAnswer="ANS_L$n"} }
    return $qs
}
$lBody = @{
    title="QA Test - Cambridge Listening"; description="UAT auto listening"; isPublished=$true
    parts=@(
        @{partNumber=1;title="Part 1 QA";audioUrl="http://localhost:3000/audio/qa-l1.mp3";description="QA P1";questions=(Build-LQ 0)}
        @{partNumber=2;title="Part 2 QA";audioUrl="http://localhost:3000/audio/qa-l2.mp3";description="QA P2";questions=(Build-LQ 10)}
        @{partNumber=3;title="Part 3 QA";audioUrl="http://localhost:3000/audio/qa-l3.mp3";description="QA P3";questions=(Build-LQ 20)}
        @{partNumber=4;title="Part 4 QA";audioUrl="http://localhost:3000/audio/qa-l4.mp3";description="QA P4";questions=(Build-LQ 30)}
    )
} | ConvertTo-Json -Depth 10
cInfo "Creating Listening test..."
$lTest = Invoke-Api -Uri "$Base/listening" -Method POST -Headers $tHead -Body $lBody
$LID = $lTest._id
if($LID){ cPass "Listening test created - ID=$LID" } else { cFail "Listening test creation failed"; exit 1 }
if($lTest.parts.Count -eq 4){ cPass "Test has 4 parts" } else { cFail "Expected 4 parts got $($lTest.parts.Count)" }
Section "PHASE 1B - CREATE READING TEST"
function Build-RQ([int]$offset){
    $qs=@()
    for($i=1;$i-le 13;$i++){ $n=$offset+$i; $qs+=@{questionNumber=$n;type="FILL_IN_BLANK";text="QA R Q$n";options=@();correctAnswer="ANS_R$n"} }
    return $qs
}
$rBody = @{
    title="QA Test - Cambridge Reading"; description="UAT auto reading"; isPublished=$true; createdBy=$TEACHER_ID
    passages=@(
        @{passageNumber=1;title="Passage 1 QA";content="<p>QA P1</p>";questions=(Build-RQ 0)}
        @{passageNumber=2;title="Passage 2 QA";content="<p>QA P2</p>";questions=(Build-RQ 13)}
        @{passageNumber=3;title="Passage 3 QA";content="<p>QA P3</p>";questions=(Build-RQ 26)}
    )
} | ConvertTo-Json -Depth 10
cInfo "Creating Reading test..."
$rTest = Invoke-Api -Uri "$Base/reading" -Method POST -Headers $tHead -Body $rBody
$RID = if($rTest.data._id){ $rTest.data._id } else { $rTest._id }
if($RID){ cPass "Reading test created - ID=$RID" } else { cFail "Reading test creation failed"; exit 1 }
$rPassCount = if($rTest.data.passages){ $rTest.data.passages.Count } else { $rTest.passages.Count }
if($rPassCount -eq 3){ cPass "Test has 3 passages" } else { cFail "Expected 3 passages got $rPassCount" }
Section "PHASE 2 - VERIFY LIST ENDPOINTS"
cInfo "GET /listening?limit=100 (filter by current run ID=$LID)..."
$allL = Invoke-Api -Uri "$Base/listening?limit=100"
$qaL = $allL.data | Where-Object { $_._id -eq $LID }
if($qaL){ cPass "QA Listening test visible in list" } else { cFail "QA Listening test NOT in list" }
if($qaL -and $qaL.parts.Count -eq 4){ cPass "List returns 4 part summaries" } else { cFail "Part summaries count wrong: $($qaL.parts.Count)" }
$leaked = $qaL.parts | Where-Object { $_.correctAnswer }
if(-not $leaked){ cPass "No correctAnswer leaked in listening list" } else { cFail "correctAnswer exposed in list - data leak!" }
cInfo "GET /reading?limit=100 (filter by current run ID=$RID)..."
$allR = Invoke-Api -Uri "$Base/reading?limit=100"
$qaR = $allR.data | Where-Object { $_._id -eq $RID }
if($qaR){ cPass "QA Reading test visible in list" } else { cFail "QA Reading test NOT in list" }
if($qaR -and $qaR.passages.Count -eq 3){ cPass "List returns 3 passage summaries" } else { cFail "Passage summaries count wrong: $($qaR.passages.Count)" }
$leaked2 = $qaR.passages | Where-Object { $_.correctAnswer -or $_.content }
if(-not $leaked2){ cPass "No correctAnswer/content leaked in reading list" } else { cFail "correctAnswer or content exposed in list - data leak!" }
Section "PHASE 3 - STUDENT SUBMITS LISTENING PART 2"
$p2Ans = @("ANS_L11","ANS_L12","ANS_L13","ANS_L14","ANS_L15","ANS_L16","ANS_L17","WRONG","WRONG","WRONG")
$lSub = @{partNumber=2;studentAnswers=$p2Ans;timeSpent=600} | ConvertTo-Json
cInfo "Submitting Part 2 (7/10 correct)..."
$lAtt = Invoke-Api -Uri "$Base/listening/$LID/submit-part" -Method POST -Headers $sHead -Body $lSub
$lD = $lAtt.data ; $LATT_ID = $lD._id
if($lAtt.success -and $LATT_ID){ cPass "submit-part success - attemptId=$LATT_ID" } else { cFail "submit-part failed: $($lAtt|ConvertTo-Json -Compress)" }
if($lD.partNumber -eq 2){ cPass "partNumber=2 saved correctly" } else { cFail "partNumber=$($lD.partNumber) expected 2" }
if($lD.rawScore -eq 7){ cPass "rawScore=7 correct" } else { cFail "rawScore=$($lD.rawScore) expected 7" }
if($lD.bandScore -eq 3.0){ cPass "bandScore=3.0 correct (rawScore=7 -> band 3.0)" } else { cFail "bandScore=$($lD.bandScore) expected 3.0" }
if($lD.testId){ cPass "testId populated" } else { cFail "testId missing" }
Section "PHASE 4 - STUDENT SUBMITS READING PASSAGE 3"
$p3Ans = @("ANS_R27","ANS_R28","ANS_R29","ANS_R30","ANS_R31","ANS_R32","ANS_R33","ANS_R34","ANS_R35","ANS_R36","WRONG","WRONG","WRONG")
$rSub = @{passageNumber=3;studentAnswers=$p3Ans;timeSpent=900} | ConvertTo-Json
cInfo "Submitting Passage 3 (10/13 correct)..."
$rAtt = Invoke-Api -Uri "$Base/reading/$RID/submit-passage" -Method POST -Headers $sHead -Body $rSub
$rD = $rAtt.data ; $RATT_ID = $rD._id
if($rAtt.success -and $RATT_ID){ cPass "submit-passage success - attemptId=$RATT_ID" } else { cFail "submit-passage failed: $($rAtt|ConvertTo-Json -Compress)" }
if($rD.passageNumber -eq 3){ cPass "passageNumber=3 saved correctly" } else { cFail "passageNumber=$($rD.passageNumber) expected 3" }
if($rD.rawScore -eq 10){ cPass "rawScore=10 correct" } else { cFail "rawScore=$($rD.rawScore) expected 10" }
if($rD.bandScore -eq 4.0){ cPass "bandScore=4.0 correct (rawScore=10 -> band 4.0)" } else { cFail "bandScore=$($rD.bandScore) expected 4.0" }
if($rD.testId){ cPass "testId populated" } else { cFail "testId missing" }
Section "PHASE 5 - VERIFY STATUS BADGES (my-attempts)"
cInfo "GET /listening/my-attempts..."
$myL = Invoke-Api -Uri "$Base/listening/my-attempts" -Headers $sHead
$lAttRec = $myL.data | Where-Object { $_._id -eq $LATT_ID }
if($lAttRec){ cPass "Listening attempt in /my-attempts" } else { cFail "Listening attempt NOT in /my-attempts" }
if($lAttRec.partNumber -eq 2){ cPass "partNumber=2 stored (Part 2 badge=done, others=Chua lam)" } else { cFail "partNumber mismatch" }
$otherParts = $myL.data | Where-Object { $_.testId._id -eq $LID -and $_.partNumber -ne 2 -and $null -ne $_.partNumber }
if(-not $otherParts){ cPass "Parts 1,3,4 have no attempts for this test" } else { cFail "Unexpected attempts for parts: $($otherParts.partNumber -join ',')" }
cInfo "GET /reading/my-attempts..."
$myR = Invoke-Api -Uri "$Base/reading/my-attempts" -Headers $sHead
$rAttRec = $myR.data | Where-Object { $_._id -eq $RATT_ID }
if($rAttRec){ cPass "Reading attempt in /my-attempts" } else { cFail "Reading attempt NOT in /my-attempts" }
if($rAttRec.passageNumber -eq 3){ cPass "passageNumber=3 stored (Passage 3 badge=done, others=Chua lam)" } else { cFail "passageNumber mismatch" }
$otherPassages = $myR.data | Where-Object { $_.testId._id -eq $RID -and $_.passageNumber -ne 3 -and $null -ne $_.passageNumber }
if(-not $otherPassages){ cPass "Passages 1,2 have no attempts for this test" } else { cFail "Unexpected attempts for passages" }
Section "PHASE 6 - REGRESSION: Teacher reads full tests"
cInfo "Teacher GET /listening/$LID..."
$lFull = Invoke-Api -Uri "$Base/listening/$LID" -Headers $tHead
if($lFull.parts.Count -eq 4){ cPass "Listening full test has 4 parts intact" } else { cFail "Listening parts=$($lFull.parts.Count) expected 4" }
$lAudio = ($lFull.parts | Where-Object { $_.audioUrl }).Count
if($lAudio -eq 4){ cPass "All 4 parts have audioUrl" } else { cFail "Only $lAudio/4 parts have audioUrl" }
$lQTotal = ($lFull.parts | ForEach-Object { $_.questions.Count } | Measure-Object -Sum).Sum
if($lQTotal -eq 40){ cPass "Listening: 40 questions total intact" } else { cFail "Listening: $lQTotal questions expected 40" }
cInfo "Teacher GET /reading/$RID..."
$rFull = Invoke-Api -Uri "$Base/reading/$RID" -Headers $tHead
$rFD = if($rFull.data){ $rFull.data } else { $rFull }
if($rFD.passages.Count -eq 3){ cPass "Reading full test has 3 passages intact" } else { cFail "Reading passages=$($rFD.passages.Count) expected 3" }
$rQTotal = ($rFD.passages | ForEach-Object { $_.questions.Count } | Measure-Object -Sum).Sum
if($rQTotal -eq 39){ cPass "Reading: 39 questions total intact (3x13)" } else { cFail "Reading: $rQTotal questions expected 39" }
Section "SUMMARY"
$TOTAL = $global:PASS + $global:FAIL
Write-Host "Total checks : $TOTAL"
Write-Host "Passed       : $($global:PASS)" -ForegroundColor Green
if($global:FAIL -gt 0){ Write-Host "Failed       : $($global:FAIL)" -ForegroundColor Red } else { Write-Host "Failed       : 0" -ForegroundColor Green }
if($global:FAIL -eq 0){ Write-Host "ALL CHECKS PASSED" -ForegroundColor Green } else { Write-Host "$($global:FAIL) CHECKS FAILED" -ForegroundColor Red }
Write-Host ""
Write-Host "Resource IDs:" -ForegroundColor Cyan
Write-Host "  Listening test  : $LID"
Write-Host "  Reading test    : $RID"
Write-Host "  Listening att   : $LATT_ID  (Part 2, raw=7, band=3.0)"
Write-Host "  Reading att     : $RATT_ID  (Passage 3, raw=10, band=4.0)"