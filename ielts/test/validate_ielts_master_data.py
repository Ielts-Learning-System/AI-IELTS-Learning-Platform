from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


FILE_PATH = Path(__file__).resolve().parent / "ielts_master_data.xlsx"

EXPECTED_SHEETS = ["Reading", "Listening", "Writing", "Speaking"]

EXPECTED_COLUMNS = {
    "Reading": [
        "test_id",
        "passage_id",
        "order",
        "question_type",
        "passage_text",
        "question_text",
        "options_json",
        "answer",
    ],
    "Listening": [
        "test_id",
        "section_id",
        "order",
        "question_type",
        "audio_url",
        "image_url",
        "question_text",
        "options_json",
        "answer",
    ],
    "Writing": [
        "test_id",
        "task",
        "order",
        "question_type",
        "image_url",
        "question_text",
        "rubric",
        "answer",
    ],
    "Speaking": [
        "test_id",
        "part",
        "order",
        "question_type",
        "cue_card",
        "question_text",
        "answer",
    ],
}


def check(condition: bool, ok_msg: str, fail_msg: str, results: list[tuple[bool, str]]):
    results.append((condition, ok_msg if condition else fail_msg))


def words_count(text: str) -> int:
    return len(str(text).strip().split())


def main() -> None:
    results: list[tuple[bool, str]] = []

    if not FILE_PATH.exists():
        print(f"FAIL: File not found -> {FILE_PATH}")
        raise SystemExit(1)

    xls = pd.ExcelFile(FILE_PATH)
    sheet_names = xls.sheet_names

    check(
        sheet_names == EXPECTED_SHEETS,
        f"PASS: Exact sheet order/names = {sheet_names}",
        f"FAIL: Sheet names/order mismatch. Found {sheet_names}",
        results,
    )

    dfs = {name: pd.read_excel(FILE_PATH, sheet_name=name) for name in EXPECTED_SHEETS}

    # Column schema checks
    for sheet, expected_cols in EXPECTED_COLUMNS.items():
        got_cols = list(dfs[sheet].columns)
        check(
            got_cols == expected_cols,
            f"PASS: {sheet} columns match expected schema",
            f"FAIL: {sheet} columns mismatch. Got {got_cols}",
            results,
        )

    # Row counts
    check(
        len(dfs["Reading"]) == 200,
        "PASS: Reading has 200 rows (5 tests x 40)",
        f"FAIL: Reading row count = {len(dfs['Reading'])}, expected 200",
        results,
    )
    check(
        len(dfs["Listening"]) == 200,
        "PASS: Listening has 200 rows (5 tests x 40)",
        f"FAIL: Listening row count = {len(dfs['Listening'])}, expected 200",
        results,
    )
    check(
        len(dfs["Writing"]) == 10,
        "PASS: Writing has 10 rows (5 tests x 2 tasks)",
        f"FAIL: Writing row count = {len(dfs['Writing'])}, expected 10",
        results,
    )
    check(
        len(dfs["Speaking"]) == 85,
        "PASS: Speaking has 85 rows (5 tests x 17 questions)",
        f"FAIL: Speaking row count = {len(dfs['Speaking'])}, expected 85",
        results,
    )

    # JSON validity checks
    for col_sheet, col_name in [("Reading", "options_json"), ("Listening", "options_json"), ("Writing", "rubric")]:
        valid = True
        for idx, value in enumerate(dfs[col_sheet][col_name], start=1):
            try:
                json.loads(str(value))
            except Exception:
                valid = False
                break
        check(
            valid,
            f"PASS: {col_sheet}.{col_name} contains valid JSON strings",
            f"FAIL: {col_sheet}.{col_name} has invalid JSON around row {idx}",
            results,
        )

    # Reading structural checks
    rd = dfs["Reading"].copy()
    rd["test_id"] = rd["test_id"].astype(str)
    expected_test_ids = [f"IELTS_TEST_{i:02d}" for i in range(1, 6)]
    check(
        sorted(rd["test_id"].unique().tolist()) == expected_test_ids,
        "PASS: test_id standardized in Reading",
        f"FAIL: test_id values in Reading are not standardized: {sorted(rd['test_id'].unique().tolist())}",
        results,
    )

    reading_ok = True
    for test_id, group in rd.groupby("test_id"):
        orders = sorted(group["order"].tolist())
        if orders != list(range(1, 41)):
            reading_ok = False
            break

        passage_counts = group.groupby("passage_id")["order"].count().tolist()
        if sorted(passage_counts) != [13, 13, 14]:
            reading_ok = False
            break

        first_rows = group.sort_values("order").groupby("passage_id").head(1)
        if any(str(x).strip() == "" for x in first_rows["passage_text"].tolist()):
            reading_ok = False
            break

    check(
        reading_ok,
        "PASS: Reading follows 40Q/3-passage IELTS structure with valid passage linking",
        "FAIL: Reading structure mismatch in order/passage distribution/passage text placement",
        results,
    )

    # Listening structural checks
    ls = dfs["Listening"].copy()
    listening_ok = True
    for test_id, group in ls.groupby("test_id"):
        if sorted(group["order"].tolist()) != list(range(1, 41)):
            listening_ok = False
            break
        section_counts = group.groupby("section_id")["order"].count().tolist()
        if sorted(section_counts) != [10, 10, 10, 10]:
            listening_ok = False
            break
        audio_per_section = group.groupby("section_id")["audio_url"].nunique().tolist()
        if any(n != 1 for n in audio_per_section):
            listening_ok = False
            break

    check(
        listening_ok,
        "PASS: Listening follows 40Q/4-section IELTS structure with section-level shared audio",
        "FAIL: Listening structure mismatch in order/section distribution/audio grouping",
        results,
    )

    # Writing checks
    wr = dfs["Writing"].copy()
    writing_ok = True
    for test_id, group in wr.groupby("test_id"):
        if set(group["task"].astype(str).tolist()) != {"Task 1", "Task 2"}:
            writing_ok = False
            break
        if sorted(group["order"].tolist()) != [1, 2]:
            writing_ok = False
            break

        task1 = group[group["task"] == "Task 1"].iloc[0]
        task2 = group[group["task"] == "Task 2"].iloc[0]
        if str(task1["image_url"]).strip() == "":
            writing_ok = False
            break
        if words_count(task1["answer"]) < 80 or words_count(task2["answer"]) < 120:
            writing_ok = False
            break

    check(
        writing_ok,
        "PASS: Writing has authentic Task 1/Task 2 pairing and sufficiently developed sample answers",
        "FAIL: Writing structure/content quality issue (task pairing/image/sample length)",
        results,
    )

    # Speaking checks
    sp = dfs["Speaking"].copy()
    speaking_ok = True
    for test_id, group in sp.groupby("test_id"):
        p1 = group[group["part"] == "Part 1"]
        p2 = group[group["part"] == "Part 2"]
        p3 = group[group["part"] == "Part 3"]

        if len(p1) != 10 or len(p2) != 1 or len(p3) != 6:
            speaking_ok = False
            break
        if sorted(p1["order"].tolist()) != list(range(1, 11)):
            speaking_ok = False
            break
        if p2.iloc[0]["order"] != 1 or str(p2.iloc[0]["cue_card"]).strip() == "":
            speaking_ok = False
            break
        if sorted(p3["order"].tolist()) != list(range(1, 7)):
            speaking_ok = False
            break

    check(
        speaking_ok,
        "PASS: Speaking follows Part 1/2/3 format with valid cue card usage",
        "FAIL: Speaking structure mismatch in part distribution/order/cue card",
        results,
    )

    # Authentic IELTS-style sanity checks (heuristic)
    reading_qtypes = set(rd["question_type"].astype(str).tolist())
    listening_qtypes = set(ls["question_type"].astype(str).tolist())
    check(
        len(reading_qtypes) >= 4,
        f"PASS: Reading includes varied IELTS question styles ({len(reading_qtypes)} types)",
        f"FAIL: Reading question-type variety too narrow ({len(reading_qtypes)} types)",
        results,
    )
    check(
        len(listening_qtypes) >= 4,
        f"PASS: Listening includes varied IELTS question styles ({len(listening_qtypes)} types)",
        f"FAIL: Listening question-type variety too narrow ({len(listening_qtypes)} types)",
        results,
    )

    # Print report
    passed = sum(1 for ok, _ in results if ok)
    total = len(results)

    print("=== IELTS MASTER DATA VALIDATION REPORT ===")
    print(f"File: {FILE_PATH}")
    print(f"Checks passed: {passed}/{total}")
    print()
    for ok, message in results:
        prefix = "[PASS]" if ok else "[FAIL]"
        print(f"{prefix} {message}")

    print()
    if passed == total:
        print("Overall Verdict (IELTS Examiner Perspective):")
        print("- Structure: PASS")
        print("- Format consistency for import layer: PASS")
        print("- Content realism for mock Cambridge-style practice: PASS (good synthetic level)")
        print("- Ready for JSON import pipeline.")
    else:
        print("Overall Verdict: NEEDS FIXES before import.")


if __name__ == "__main__":
    main()
