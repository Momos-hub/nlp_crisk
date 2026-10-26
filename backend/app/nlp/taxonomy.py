"""Clause taxonomy — the label space for clause classification.

Used by BOTH engines:
  * Fast engine  -> keyword/taxonomy scorer
  * Deep engine  -> Hugging Face zero-shot candidate labels
"""

CLAUSE_TYPES = {
    "definitions": {
        "label": "Definitions",
        "base_risk": 0,
        "keywords": ["means", "shall mean", "defined", "definition", "capitalized terms", "interpretation"],
    },
    "scope": {
        "label": "Scope of Services",
        "base_risk": 2,
        "keywords": ["services", "scope", "deliverables", "statement of work", "perform", "obligations", "provide"],
    },
    "payment": {
        "label": "Payment & Fees",
        "base_risk": 4,
        "keywords": ["fees", "payment", "invoice", "charges", "compensation", "pay", "pricing", "remuneration", "reimburse"],
    },
    "term_renewal": {
        "label": "Term & Renewal",
        "base_risk": 4,
        "keywords": ["term", "renew", "renewal", "effective date", "expire", "extension", "initial term"],
    },
    "termination": {
        "label": "Termination",
        "base_risk": 6,
        "keywords": ["terminate", "termination", "cure", "suspend", "suspend", "breach", "dissolution", "wind-down"],
    },
    "confidentiality": {
        "label": "Confidentiality",
        "base_risk": 4,
        "keywords": ["confidential", "proprietary", "non-disclosure", "disclose", "trade secret", "nda"],
    },
    "ip": {
        "label": "Intellectual Property",
        "base_risk": 7,
        "keywords": ["intellectual property", "copyright", "trademark", "patent", "license", "ownership", "work product", "moral rights", "invention"],
    },
    "warranties": {
        "label": "Warranties & Representations",
        "base_risk": 5,
        "keywords": ["warrant", "warranty", "represent", "as is", "disclaim", "merchantability", "fitness for"],
    },
    "liability": {
        "label": "Limitation of Liability",
        "base_risk": 5,
        "keywords": ["liable", "liability", "damages", "consequential", "indirect", "cap", "limitation of liability", "aggregate"],
    },
    "indemnification": {
        "label": "Indemnification",
        "base_risk": 8,
        "keywords": ["indemnify", "indemnification", "hold harmless", "defend", "indemnitor", "indemnitee", "claims"],
    },
    "force_majeure": {
        "label": "Force Majeure",
        "base_risk": 2,
        "keywords": ["force majeure", "act of god", "pandemic", "epidemic", "unforeseeable", "beyond reasonable control"],
    },
    "governing_law": {
        "label": "Governing Law & Jurisdiction",
        "base_risk": 4,
        "keywords": ["governing law", "jurisdiction", "venue", "courts", "governed by", "laws of", "conflict of laws"],
    },
    "disputes": {
        "label": "Dispute Resolution",
        "base_risk": 5,
        "keywords": ["dispute", "arbitration", "arbitrator", "mediation", "tribunal", "litigation", "jury", "class action"],
    },
    "assignment": {
        "label": "Assignment",
        "base_risk": 3,
        "keywords": ["assign", "assignment", "transfer", "successors", "novate", "merger"],
    },
    "non_compete": {
        "label": "Non-Compete & Non-Solicit",
        "base_risk": 6,
        "keywords": ["non-compete", "noncompete", "non-solicit", "solicit", "compet", "exclusiv", "restraint"],
    },
    "data_protection": {
        "label": "Data Protection & Privacy",
        "base_risk": 6,
        "keywords": ["personal data", "privacy", "gdpr", "data protection", "data subject", "processing", "controller", "dpa"],
    },
    "audit": {
        "label": "Audit Rights",
        "base_risk": 3,
        "keywords": ["audit", "inspect", "records", "books", "accounting", "verification", "compliance review"],
    },
    "general": {
        "label": "General / Miscellaneous",
        "base_risk": 1,
        "keywords": ["notices", "entire agreement", "counterparts", "severability", "waiver", "amendment", "miscellaneous", "general"],
    },
}

TYPE_KEYS = list(CLAUSE_TYPES.keys())
TYPE_LABELS = [CLAUSE_TYPES[k]["label"] for k in TYPE_KEYS]

# Clause types whose ABSENCE is itself a risk (gap analysis).
PROTECTIVE_CLAUSES = {
    "force_majeure": ("Force Majeure", "No relief mechanism for events beyond either party's control (pandemics, war, outages)."),
    "liability": ("Limitation of Liability", "Unlimited financial exposure for both parties on any claim."),
    "termination": ("Termination", "No clean exit path — the contract may run indefinitely regardless of performance."),
    "confidentiality": ("Confidentiality", "No contractual protection for shared sensitive information."),
    "governing_law": ("Governing Law & Jurisdiction", "Uncertainty over which law applies and where disputes are fought."),
    "indemnification": ("Indemnification", "No allocation of third-party claim risk between the parties."),
}

# Hypothesis template for HF zero-shot classification.
ZEROSHOT_TEMPLATE = "This contract clause is about {}."
