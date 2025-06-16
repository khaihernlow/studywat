import os
import json
import re
import string

# --- Keyword sets ---------------------------------------------------------
FOUNDATION_KEYWORDS = [
    "foundation", "pre-university", "pre-u", "fnd", "fndn", "international year one", "bridge program", "pathway program", "nitrodegree"
]
PREU_KEYWORDS = [
    "a-level", "a level", "a levels", "cambridge a-level", "edexcel", "ausmat", "cimp",
    "matriculation", "uec", "stpm", "hsc", "hnd", "skm", "international baccalaureate", "ib"
]
DIPLOMA_KEYWORDS = ["diploma", "dip."]
CERTIFICATE_KEYWORDS = ["certificate", "certification", "cert.", "cert", "certhe"]
BACHELOR_KEYWORDS = [
    "bachelor", "honours", "hons", "degree", "bsc", "ba", "beng", "llb", "bit",
    "bba", "bcom", "bfin", "bbi", "bict", "mbbs", "md", "mbc", "doctor of medicine", "doktor"
]
MASTERS_KEYWORDS = [
    "master", "masters", "msc", "m.sc.", "m sc", "ma", "m.a", "m a", "me", "m.arch", "m arch", "march", "meng", "mba", "mmus", "mres", "mhsc", "mch", "msci", "meconsc", "mapplsc"
]
PHD_KEYWORDS = [
    "phd", "dphil", "doctorate", "doctor of philosophy", "doctor in", "ed.d",
    "doctor of education", "dba", "drresdent"
]
POSTGRAD_DIP_KEYWORDS = [
    "pg dip", "pg cert", "pgrad", "hdip", "pdip", "postgrad", "postgraduate", "hdipa", "hdipappsc", "pgcert"
]
PROFESSIONAL_KEYWORDS = [
    "acca", "cfa", "actuarial", "clp", "llm", "icaew", "bar exam", "professional"
]
VOCATIONAL_KEYWORDS = [
    "sijil kemahiran", "skm", "noss", "vocational", "level 2", "level 3", "level 4"
]
LANG_PREP_KEYWORDS = [
    "english language", "intensive english", "pre-sessional", "language preparation"
]
SHORT_COURSE_KEYWORDS = ["short course", "bootcamp", "microcredential", "training"]

# Combine for priority
TAG_RULES = [
    ("foundation", FOUNDATION_KEYWORDS),
    ("preuniversity", PREU_KEYWORDS),
    ("diploma", DIPLOMA_KEYWORDS),
    ("certificate", CERTIFICATE_KEYWORDS),
    ("bachelor", BACHELOR_KEYWORDS),
    ("masters", MASTERS_KEYWORDS),
    ("phd", PHD_KEYWORDS),
    ("postgrad_diploma", POSTGRAD_DIP_KEYWORDS),
    ("professional", PROFESSIONAL_KEYWORDS),
    ("vocational", VOCATIONAL_KEYWORDS),
    ("language_prep", LANG_PREP_KEYWORDS),
    ("short_course", SHORT_COURSE_KEYWORDS),
]

# --- Helper functions -----------------------------------------------------
def normalize(text: str) -> str:
    # lowercase, remove punctuation, collapse spaces
    txt = text.lower()
    txt = re.sub(f"[{re.escape(string.punctuation)}]", " ", txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt

def infer_program_type(name: str, filename: str = "") -> str:
    # 1) strip brackets + normalize
    raw = name
    n = re.sub(r"\[.*?\]", "", name)
    n = normalize(n)
    
    # Also normalize the original text for keyword checking
    n_original = normalize(name)

    # 2) quick wins
    if re.search(r"\bdoctor of medicine\b", n):
        return "bachelor"
    if re.search(r"\bdoctor of\b", n):
        return "phd"
    if re.search(r"sarjana muda", n) or "年制" in raw:
        return "bachelor"

    # 3) rule-based tags - check both stripped and original text
    for tag, kws in TAG_RULES:
        for kw in kws:
            if re.search(rf"\b{re.escape(kw)}\b", n) or re.search(rf"\b{re.escape(kw)}\b", n_original):
                return tag

    # --- Custom fallback rules for known troublesome entries ---
    fn = filename.lower()

    # Dongseo University: all listed programs are bachelor-level majors
    if "dongseo_university" in fn:
        return "bachelor"

    # INTI American Program = part of US bachelor pathway
    if "american university program" in n:
        return "bachelor"

    # Shanghai TCM programs
    if "program of chinese language" in n:
        return "language_prep"
    if "traditional chinese medicine" in n or "acupuncture" in n:
        return "bachelor"

    # Swinburne UniLink = pre-university/foundation
    if "unilink" in n:
        return "foundation"

    # Galway - Interventional Cardiovascular Medicine = postgrad specialization
    if "interventional cardiovascular medicine" in n:
        return "postgrad_diploma"

    # UNSW - Transition Program = foundation
    if "transition program" in n:
        return "foundation"

    # University of Reading - Pre-Sessional English
    if "pre sessional english" in n:
        return "language_prep"

    return "unknown"

# --- Main tagging + logging ----------------------------------------------
def tag_and_log_unknowns(
    data_folder="institution_profile",
    output_log="untagged_programs.txt"
):
    unknowns = []

    for fn in os.listdir(data_folder):
        if not fn.endswith(".json"):
            continue
        path = os.path.join(data_folder, fn)
        with open(path, encoding="utf-8") as f:
            uni = json.load(f)

        progs = uni.get("programs", [])
        for p in progs:
            p_name = p.get("program_name", "")
            p_type = infer_program_type(p_name, fn)
            p["program_type"] = p_type
            if p_type == "unknown":
                unknowns.append(f"{fn} | {p_name}")

        # overwrite
        with open(path, "w", encoding="utf-8") as f:
            json.dump(uni, f, indent=4, ensure_ascii=False)

    # write log
    if unknowns:
        with open(output_log, "w", encoding="utf-8") as f:
            f.write("UNRECOGNIZED PROGRAM TYPES\n===========================\n")
            f.write("\n".join(unknowns))
        print(f"[!] {len(unknowns)} untagged programs logged to {output_log}")
    else:
        print("[✓] All programs successfully tagged.")

# --- Run it ---------------------------------------------------------------
if __name__ == "__main__":
    tag_and_log_unknowns()
