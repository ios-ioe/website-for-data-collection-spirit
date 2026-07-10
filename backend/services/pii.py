"""PII detection: phone, email, and common Nepali names."""

import regex as re

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")

PHONE_RE = re.compile(
    r"(?:\+?977[\s\-]?)?"
    r"(?:9[678]\d{8}"
    r"|0\d{1,2}[\s\-]?\d{6,7}"
    r"|[\u0966-\u096F]{7,10})"
)

NEPALI_NAME_TOKENS = {
    "राम",
    "श्याम",
    "हरि",
    "गोपाल",
    "कृष्ण",
    "सीता",
    "गीता",
    "राधा",
    "सरिता",
    "सुनिता",
    "अनिता",
    "बिनिता",
    "प्रकाश",
    "दिपक",
    "दीपक",
    "राजु",
    "राजेश",
    "सुरेश",
    "रमेश",
    "महेश",
    "गणेश",
    "बिनोद",
    "मनोज",
    "सन्तोष",
    "अनिल",
    "सुनिल",
    "सुशील",
    "कमल",
    "बिमला",
    "सरस्वती",
    "लक्ष्मी",
    "पार्वती",
    "मीना",
    "रीता",
    "पूजा",
    "निर्मला",
    "सुमन",
    "प्रदीप",
    "अशोक",
    "अर्जुन",
    "बिष्णु",
    "श्रेष्ठ",
    "शर्मा",
    "अधिकारी",
    "पौडेल",
    "भट्टराई",
    "गुरुङ",
    "तामाङ",
    "मगर",
    "राई",
    "लिम्बु",
    "थापा",
    "कार्की",
    "बस्नेत",
    "खड्का",
    "ओली",
    "देउवा",
    "कोइराला",
    "दाहाल",
    "नेपाल",
    "पोखरेल",
    "रेग्मी",
    "आचार्य",
    "उपाध्याय",
    "जोशी",
    "महर्जन",
    "डंगोल",
    "बज्राचार्य",
    "ram",
    "shyam",
    "hari",
    "gopal",
    "krishna",
    "sita",
    "gita",
    "radha",
    "sarita",
    "sunita",
    "anita",
    "binita",
    "prakash",
    "deepak",
    "dipak",
    "raju",
    "rajesh",
    "suresh",
    "ramesh",
    "mahesh",
    "ganesh",
    "binod",
    "manoj",
    "santosh",
    "anil",
    "sunil",
    "sushil",
    "kamal",
    "bimala",
    "shrestha",
    "sharma",
    "adhikari",
    "poudel",
    "paudel",
    "bhattarai",
    "gurung",
    "tamang",
    "magar",
    "rai",
    "limbu",
    "thapa",
    "karki",
    "basnet",
    "khadka",
    "oli",
    "deuba",
    "koirala",
    "dahal",
    "nepal",
    "pokharel",
    "regmi",
    "acharya",
    "upadhyay",
    "joshi",
    "maharjan",
    "dangol",
}

_ROMAN_NAMES = sorted(
    [name for name in NEPALI_NAME_TOKENS if name.isascii()],
    key=len,
    reverse=True,
)
ROMAN_NAME_RE = (
    re.compile(
        r"(?<![A-Za-z])("
        + "|".join(re.escape(name) for name in _ROMAN_NAMES)
        + r")(?![A-Za-z])",
        re.IGNORECASE,
    )
    if _ROMAN_NAMES
    else None
)
_DEVA_NAMES = {name for name in NEPALI_NAME_TOKENS if not name.isascii()}
DEVA_TOKEN_RE = re.compile(r"[\p{Devanagari}\u200d]+")


def scan_pii(text: str) -> tuple[bool, list[str]]:
    """Return (flag, matched_terms) for a single piece of text."""
    matched: list[str] = []

    matched.extend(EMAIL_RE.findall(text))

    for match in PHONE_RE.findall(text):
        value = match if isinstance(match, str) else "".join(match)
        if value.strip():
            matched.append(value.strip())

    if ROMAN_NAME_RE:
        matched.extend(ROMAN_NAME_RE.findall(text))

    for token in DEVA_TOKEN_RE.findall(text):
        if token in _DEVA_NAMES:
            matched.append(token)

    seen: set[str] = set()
    unique: list[str] = []
    for term in matched:
        if term not in seen:
            seen.add(term)
            unique.append(term)

    return len(unique) > 0, unique
