# security.md

- No real customer data in MVP — synthetic UBL datasets only (per PDF §14).
- JWT in httpOnly, Secure, SameSite=Strict cookie. CORS locked to FE origin.
- Passwords hashed (bcrypt). Rate-limit /auth/login.
- Data minimization: store only fields needed for scoring. No PDFs/OCR (out of scope).
- Explainability = auditability: every assessment persists its inputs + evidence.
