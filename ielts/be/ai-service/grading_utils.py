"""
grading_utils.py
----------------
Answer normalization and comparison utilities for IELTS grading.

Handles:
  • Optional plural suffixes  → word(s), word(es)
  • OR / slash cases          → bus/train, TRUE/FALSE
  • Article stripping         → a, an, the
  • Punctuation removal
  • Case-insensitive comparison
"""

import re
import string

_ARTICLES = frozenset({"a", "an", "the"})
_PUNCT_TABLE = str.maketrans("", "", string.punctuation)


def expand_optional(text: str) -> list[str]:
    """
    Expand optional suffix patterns.

    Examples:
        expand_optional("tree(s)")    → ["tree", "trees"]
        expand_optional("bus(es)")    → ["bus", "buses"]
        expand_optional("match(ing)") → ["match", "matching"]
        expand_optional("no parens")  → ["no parens"]
    """
    # Match e.g. "tree(s)", "bus(es)", "match(ing)"
    pattern = re.compile(r"\b(\w+)\(([a-z]+)\)", re.IGNORECASE)
    match = pattern.search(text)
    if not match:
        return [text]

    base = match.group(1)
    suffix = match.group(2)
    without = pattern.sub(base, text, count=1)
    with_suffix = pattern.sub(base + suffix, text, count=1)
    return [without, with_suffix]


def expand_or(text: str) -> list[str]:
    """
    Expand slash-separated OR alternatives.

    Examples:
        expand_or("bus/train")     → ["bus", "train"]
        expand_or("TRUE / FALSE")  → ["TRUE", "FALSE"]
        expand_or("4th century")   → ["4th century"]
    """
    if "/" in text:
        return [part.strip() for part in text.split("/") if part.strip()]
    return [text]


def normalize(text: str) -> str:
    """
    Normalize an answer string for comparison:
      1. Lowercase
      2. Remove all punctuation
      3. Strip leading/trailing whitespace
      4. Remove articles (a, an, the)
      5. Collapse multiple spaces

    Examples:
        normalize("THE bus") → "bus"
        normalize("a 4th-century")  → "4th century"
        normalize("True.")  → "true"
    """
    text = text.lower().strip()
    text = text.translate(_PUNCT_TABLE)
    words = [w for w in text.split() if w not in _ARTICLES]
    return " ".join(words)


def _all_variants(answer: str) -> list[str]:
    """
    Return all normalized variants of `answer` after expanding
    optional suffixes and slash-OR cases.
    """
    step1 = expand_optional(answer.strip())
    variants: list[str] = []
    for v in step1:
        variants.extend(expand_or(v))
    return [normalize(v) for v in variants]


def is_correct(user_answer: str, correct_answer: str) -> bool:
    """
    Compare user_answer against correct_answer after full normalization
    and variant expansion.

    Returns True if user_answer matches any expanded, normalized variant.

    Examples:
        is_correct("trees",   "tree(s)")    → True
        is_correct("tree",    "tree(s)")    → True
        is_correct("train",   "bus/train")  → True
        is_correct("THE bus", "bus")        → True
        is_correct("TRUE",    "true")       → True
        is_correct("C",       "A")          → False
    """
    user_norm = normalize(user_answer.strip())
    return user_norm in _all_variants(correct_answer)


def normalize_answer_key(raw: str) -> str:
    """
    Light normalization for storage: strip outer whitespace and collapse
    internal spaces. Does NOT remove articles or punctuation — preserves
    the canonical form (e.g., "word(s)", "bus/train") for display.
    """
    return " ".join(raw.strip().split())
