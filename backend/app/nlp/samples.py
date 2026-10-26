"""Bundled demo contracts (synthetic, for evaluation of the risk engine)."""

SAMPLE_CONTRACTS = [
    {
        "id": "saas-msa",
        "title": "SaaS Master Services Agreement (heavily one-sided)",
        "description": "A vendor-drafted SaaS MSA full of unilateral control, lock-in and uncapped exposure — ideal for stress-testing the risk engine.",
        "filename": "sample-saas-msa.txt",
        "text": """MASTER SERVICES AGREEMENT

This Master Services Agreement (the "Agreement") is entered into as of March 15, 2025 (the "Effective Date") by and between NexaCloud Systems Inc., a Delaware corporation ("Provider") and Meridian Retail Private Limited, a company incorporated under the laws of India ("Customer").

1. Definitions
"Services" means the hosted software platform and any related deliverables provided by Provider. "Confidential Information" means all information disclosed by either party.

2. Scope of Services
Provider shall provide access to its subscription platform. Customer is responsible for all user accounts and agrees to ensure compliance by its employees.

3. Payment & Fees
Customer shall pay all fees within fifteen (15) days of invoice date. All fees are non-refundable. Provider may increase fees at any time upon notice. Late payments shall accrue interest at 2% per month. All amounts shall become immediately due upon any breach.

4. Term & Renewal
The initial term is three (3) years. This Agreement shall renew automatically for successive renewal terms of one (1) year each without notice.

5. Termination
Provider may terminate this Agreement immediately at any time without cause upon written notice. Provider may suspend access at any time at its sole discretion without notice. Customer may not terminate for convenience.

6. Confidentiality
Each party shall protect the other party's Confidential Information. The obligations of confidentiality shall survive in perpetuity.

7. Intellectual Property
Customer assigns to Provider all right, title and interest in any feedback, suggestions and usage data. Provider grants Customer a limited, non-exclusive license during the term.

8. Warranties & Disclaimers
THE SERVICES ARE PROVIDED AS IS, WHERE IS, AND PROVIDER DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.

9. Limitation of Liability
IN NO EVENT SHALL PROVIDER BE LIABLE FOR ANY INDIRECT DAMAGES. PROVIDER'S ENTIRE LIABILITY SHALL BE LIMITED TO THE FEES PAID IN THE ONE MONTH PRECEDING THE CLAIM. CUSTOMER'S LIABILITY SHALL BE WITHOUT LIMITATION OF LIABILITY.

10. Indemnification
Customer shall indemnify, defend and hold harmless Provider from any and all claims, damages and losses, including all attorney's fees, without limitation, arising from Customer's use of the Services.

11. Data Protection
Customer agrees that Provider may transfer, share and disclose personal data to any third party and affiliates worldwide without prior consent, and may retain such data indefinitely.

12. Governing Law & Jurisdiction
This Agreement is governed by the laws of the State of Delaware. The parties submit to the exclusive jurisdiction of courts located in Wilmington, Delaware. Each party waives trial by jury and waives any right to participate in a class action.

13. Audit Rights
Provider may audit Customer's records and premises at any time upon 24 hours' notice.

14. Assignment
Customer shall not assign this Agreement without prior written consent, while Provider may assign this Agreement without Customer's consent.

15. General
This Agreement constitutes the entire agreement. Any amendment may be made by Provider at any time at its sole discretion without notice. Time is of the essence for all payment obligations. Notices shall be deemed received when sent.
""",
    },
    {
        "id": "mutual-nda",
        "title": "Mutual Non-Disclosure Agreement (balanced)",
        "description": "A clean, mutual NDA with standard carve-outs — mostly low-risk, with a few review points.",
        "filename": "sample-mutual-nda.txt",
        "text": """MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement (the "Agreement") is made as of June 1, 2025 between Atlas Analytics Private Limited, a company incorporated under the laws of India, Karnataka ("Atlas") and BrightPath Consulting LLC, a Delaware limited liability company ("BrightPath").

1. Purpose
The parties wish to explore a potential commercial collaboration (the "Purpose") and may disclose Confidential Information to each other.

2. Confidential Information
"Confidential Information" means non-commercially sensitive information disclosed in any form that is marked confidential or that a reasonable person would understand to be confidential.

3. Obligations
Each party shall protect the other party's Confidential Information using at least reasonable care, shall use it solely for the Purpose, and shall not disclose it to third parties except to employees and advisors under equivalent obligations.

4. Exclusions
Confidential Information does not include information that (a) is or becomes publicly available through no breach; (b) was rightfully known before disclosure; (c) is rightfully received from a third party; or (d) is independently developed without use of the Confidential Information.

5. Term
This Agreement commences on the Effective Date and continues for two (2) years. Confidentiality obligations survive for three (3) years after termination, except trade secrets protected for so long as they remain trade secrets under applicable law.

6. Return of Information
On written request, each party shall return or destroy the other party's Confidential Information within thirty (30) days.

7. No License
Nothing in this Agreement grants any license under any intellectual property rights. No feedback is assigned; feedback may be used royalty-free.

8. Governing Law
This Agreement is governed by the laws of India, and the courts at Bengaluru shall have jurisdiction.

9. General
This Agreement is the entire agreement regarding its subject matter. Amendments must be in writing and signed by both parties. Neither party may assign this Agreement without prior written consent, except to an affiliate or in connection with a merger.
""",
    },
    {
        "id": "freelance-sow",
        "title": "Freelance Services Agreement (moderate risk)",
        "description": "A services agreement with aggressive IP assignment, short claim windows and payment traps — moderate risk profile.",
        "filename": "sample-freelance-sow.txt",
        "text": """FREELANCE SERVICES AGREEMENT

This Freelance Services Agreement (the "Agreement") is entered into on September 10, 2025 by and between Helio Design Studio ("Consultant") and Vantage Fintech Corp., a corporation organized under the laws of the State of California ("Company").

1. Scope of Services
Consultant shall provide product design and front-end development services as described in each Statement of Work. Deliverables shall be accepted at Company's sole discretion.

2. Compensation
Company shall pay Consultant a fee of USD 12,000 per Statement of Work, payable within forty-five (45) days of invoice. Expenses shall be reimbursed only with Company's prior written consent. Amounts invoiced late shall bear interest at 1.5% per month.

3. Intellectual Property; Work Made for Hire
All work product is a work made for hire. Consultant hereby assigns to Company all right, title and interest in all deliverables and all intellectual property therein, including all moral rights, worldwide and in perpetuity. Consultant retains no rights whatsoever.

4. Independent Contractor
Consultant is an independent contractor and is responsible for all taxes. Consultant shall not engage in any business competing with Company during the term and for a period of two (2) years thereafter in any capacity worldwide.

5. Confidentiality
Consultant shall keep all Company information confidential and shall not use Company name, logo or trademarks in any advertising, promotion or publicity without Company's prior written consent.

6. Warranties
Consultant warrants that deliverables will conform to the applicable Statement of Work for a period of thirty (30) days.

7. Termination
Company may terminate this Agreement or any Statement of Work immediately without cause on ten (10) days' notice. Company may terminate immediately upon material breach without any cure period.

8. Limitation of Liability
Consultant's aggregate liability shall not exceed the fees paid under the applicable Statement of Work. NEITHER PARTY SHALL BE LIABLE FOR CONSEQUENTIAL DAMAGES.

9. Indemnification
Consultant shall indemnify and hold harmless Company from all claims arising out of the deliverables or Consultant's breach, including reasonable attorney's fees.

10. Claims
Any claim or action under this Agreement must be brought within thirty (30) days after the cause of action arises, after which the claim is irrevocably waived.

11. Governing Law
This Agreement is governed by the laws of the State of California. The parties consent to the exclusive jurisdiction of courts located in San Francisco, California. Any dispute shall be resolved by binding arbitration, which shall be final and without appeal, and each party waives trial by jury.

12. Assignment
Consultant shall not assign this Agreement without Company's prior written consent. Company may assign this Agreement without Consultant's consent.

13. General
This Agreement is the entire agreement between the parties. Company may amend this Agreement at any time at its sole discretion. Time is of the essence. Notices shall be deemed received when sent by email.
        """,
    },
    {
        "id": "data-processing-addendum",
        "title": "Data Processing Addendum (privacy & security)",
        "description": "A processor addendum with concrete security, breach, subprocessor, transfer, retention, and audit terms to review.",
        "filename": "sample-data-processing-addendum.txt",
        "text": """DATA PROCESSING ADDENDUM

This Data Processing Addendum (the \"DPA\") forms part of the Services Agreement between Northstar Commerce Private Limited (\"Customer\") and Cedarline Cloud Services LLC (\"Processor\"). It applies when Processor handles Personal Data on Customer's behalf.

1. Definitions and roles
Customer acts as controller and Processor acts as processor, or the equivalent roles under applicable Data Protection Laws. Personal Data, Processing, Data Subject, and Personal Data Breach have the meanings assigned by those laws.

2. Documented instructions
Processor shall process Personal Data only on Customer's documented instructions and only to provide the Services. Processor shall notify Customer if an instruction appears to violate applicable data protection law, unless prohibited by law.

3. Security measures
Processor shall maintain appropriate technical and organizational measures, including access controls, encryption in transit, workforce confidentiality, and a documented incident response process. Processor shall review these measures periodically and provide a summary on reasonable request.

4. Personnel
Processor shall ensure that personnel authorized to access Personal Data are bound by confidentiality obligations and receive role-appropriate privacy and security training.

5. Subprocessors
Processor may use the subprocessors listed in its current online register. Processor shall provide at least thirty (30) days' advance notice of a material subprocessor change. Customer may object in writing during that period on reasonable data-protection grounds; the parties will discuss a practical resolution.

6. Personal Data Breach
Processor shall notify Customer without undue delay and, where reasonably practicable, within seventy-two (72) hours after confirming a Personal Data Breach affecting Customer Personal Data. The notice shall include information reasonably available to help Customer assess and respond to the incident.

7. Assistance
Taking into account the nature of Processing, Processor shall reasonably assist Customer with Data Subject requests, security assessments, and regulatory consultations relating to the Services. Customer remains responsible for its own legal assessments and notices.

8. International transfers
Processor shall not transfer Personal Data outside the agreed processing regions unless an applicable transfer mechanism is in place and the transfer is otherwise permitted by Data Protection Laws.

9. Audit and information
Processor shall make available information reasonably necessary to demonstrate compliance with this DPA. Customer may request an audit no more than once per year, on reasonable notice, subject to confidentiality, security, and business-continuity safeguards.

10. Return and deletion
At Customer's choice, Processor shall return or delete Customer Personal Data after the Services end, unless retention is required by law. Back-up copies may be retained for the normal back-up cycle and remain protected under this DPA.

11. Liability and precedence
The liability limitations in the Services Agreement apply to this DPA unless the parties expressly agree otherwise in writing. If this DPA conflicts with the Services Agreement on Processing, this DPA controls for that subject.
""",
    },
    {
        "id": "employment-agreement",
        "title": "Employment Agreement (restrictive terms review)",
        "description": "A fictional employment contract with compensation, IP, post-employment restrictions, termination, and dispute terms.",
        "filename": "sample-employment-agreement.txt",
        "text": """EMPLOYMENT AGREEMENT

This Employment Agreement is entered into on February 1, 2026 between Meridian Robotics India Private Limited (\"Company\") and Asha Raman (\"Employee\"). The Employee will serve as Senior Product Designer, reporting to the Head of Product.

1. Employment and duties
Employment begins on March 1, 2026. Employee shall perform the responsibilities reasonably associated with the role and comply with written workplace policies provided by Company. Material changes to the role will be discussed in good faith.

2. Compensation and expenses
Company shall pay an annual base salary of INR 2,400,000, subject to applicable deductions, in twelve monthly installments. Any bonus is discretionary and is not earned until approved in writing. Reasonable business expenses will be reimbursed under the expense policy.

3. Working time and leave
The role is full-time. Working hours and leave entitlements are governed by Company policy and applicable law. Employee shall receive at least the statutory holidays and leave required in the place of employment.

4. Confidentiality
Employee shall protect Company confidential information during and after employment. This obligation does not cover information that becomes public without breach, was lawfully known, or must be disclosed by law after reasonable notice where permitted.

5. Intellectual property
Employee assigns to Company work product created within the scope of employment using Company resources or confidential information. Employee retains ownership of pre-existing materials identified in writing, while granting Company a limited license to any such material incorporated into a deliverable.

6. Conflicts and outside work
Employee shall disclose material conflicts of interest. Outside work requires prior written approval only where it creates a direct conflict, uses Company confidential information, or materially interferes with assigned duties.

7. Post-employment restrictions
For twelve (12) months after employment ends, Employee shall not solicit a Company employee with whom Employee worked directly to leave Company. This clause does not restrict general advertising or unsolicited approaches. Any restriction is subject to applicable law.

8. Termination and notice
Either party may terminate employment by giving sixty (60) days' written notice, subject to any mandatory legal requirements. Company may terminate for material misconduct after a reasonable opportunity to respond, except where immediate action is legally permitted. Accrued salary and statutory entitlements remain payable.

9. Company property and records
On termination, Employee shall return Company property and delete Company confidential information from personal devices, except copies required to be retained by law.

10. Governing law and disputes
This Agreement is governed by the laws applicable at the place of employment. The parties will first attempt to resolve a dispute through good-faith discussion. Nothing in this clause prevents either party from using a statutory forum or remedy that cannot legally be waived.

11. Entire agreement and amendments
This Agreement and its written schedules form the entire agreement about employment terms. Amendments must be in writing and signed by both parties. If a provision is unenforceable, the remaining provisions continue to apply to the extent permitted by law.
""",
    },
]


def get_samples():
    return [
        {"id": s["id"], "title": s["title"], "description": s["description"], "filename": s["filename"],
         "word_count": len(s["text"].split())}
        for s in SAMPLE_CONTRACTS
    ]


def get_sample_text(sample_id: str):
    for s in SAMPLE_CONTRACTS:
        if s["id"] == sample_id:
            return s
    return None
