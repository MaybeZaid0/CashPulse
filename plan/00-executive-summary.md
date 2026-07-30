# CashPulse — Executive Summary

**What it is:** A web-based Lending Intelligence Engine that helps UBL Relationship
Managers (RMs) assess an SME's financial health from verified UBL transaction history
in minutes instead of days. It is a *decision-support* tool, not an auto-approval engine.

**Problem:** SME loan assessment is manual and slow (several days per file). RMs review
transactions, estimate repayment ability, judge stability, and prepare a recommendation
by hand.

**Solution:** CashPulse ingests verified UBL transaction history, engineers financial
features, runs transparent business-rule scoring across 5 banking questions, and produces
an explainable Readiness Score, Eligibility Score, and a recommendation (Approve /
Counter-offer / Manual Review) — every number backed by visible evidence.

**Positioning:** "The intelligence is not in the math, it's in the explanation." No
black boxes. Every score answers Why? / How? / Based on what?

**Why it can win (hackathon):** Realistic scope (UBL data only), defensible design
choices, and a dashboard an RM can read in ~2 minutes. Authentic UBL branding.

**Tech stack:** Next.js (App Router, React, responsive) frontend · FastAPI (Python)
backend · MongoDB data store.

**Doc map:**
- 01-domain-catalog.md — features & scoring inventory
- 02-ux-principles.md — design rules, responsiveness, accessibility
- 03-business-model.md — internal bank tool context
- 05-mvp-roadmap.md — build order
- PRD.md — the build contract
- architecture.md — system design + stack table
- security.md — threat model & data handling
- api.md — REST contracts
- design-system.md — canonical visual language
- mockups/ — clickable interactive prototype
