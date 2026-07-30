# api.md  (REST, JSON, prefix /api)

POST /api/auth/login        -> {token} (cookie)
GET  /api/smes              -> [sme summary + latest readiness]
GET  /api/smes/{id}         -> sme detail + transaction summary
POST /api/assessments       body {smeId, requestedLoan, requestedTenure}
                            -> {features, pillarScores[], readiness, eligibility,
                                recommendation:{type, amount, tenure, reason, evidence[]}}
GET  /api/assessments/{id}  -> full assessment (for dashboard/report)
POST /api/assessments/{id}/decision  body {decision, note} -> updated record
