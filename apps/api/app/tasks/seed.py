"""Seed the database with realistic demo documents + one sample report.

Runs on first boot only (if the documents table is empty). Every chunk is
embedded and indexed so retrieval works out of the box, and a single sample
research session is persisted so the reports/analytics screens have data.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.ids import (
    citation_id,
    evidence_id,
    new_id,
    report_id,
    research_id,
)
from app.core.logging import get_logger
from app.db.base import SessionLocal
from app.models.document import Document
from app.models.research import (
    AgentRun,
    Citation,
    Evidence,
    Finding,
    Report,
    ResearchSession,
)
from app.services.document_service import DocumentService

log = get_logger(__name__)

WS = "ws_default"


SEED_DOCS = [
    {
        "id": "doc_ai_state_2025",
        "name": "State of AI Report 2025",
        "author": "AI Index Steering Committee",
        "category": "AI Papers",
        "tags": ["AI", "research", "trends"],
        "pages": [
            (1, "State of AI Report 2025. Executive summary.\n\nEnterprise adoption of AI agents accelerated sharply in 2024–2025. Model quality, tool-use reliability and cost per token all improved together, unlocking use cases that had been unattractive in prior years."),
            (42, "3.2 Enterprise Adoption\n\nEnterprise adoption of agentic workflows grew 218% year over year, with 62% of surveyed companies piloting at least one autonomous agent in production. Regulated industries lagged the median, citing auditability and access-control concerns."),
            (58, "3.5 Productivity Gains\n\nIn structured knowledge tasks — coding, research, and customer support — agent-augmented workers completed comparable tasks in 35–47% less time. Quality did not degrade for tasks where independent validators reviewed outputs."),
            (88, "5.4 Risks\n\nThe primary risks cited by CIOs are cost overruns, security posture, and inability to audit agent decision paths. Cost is the number-one concern in mid-market companies; audit is the number-one concern in regulated industries."),
            (104, "6.1 Governance\n\nOnly 24% of firms report formal audit trails for agent decisions. Structured telemetry — tokens, tool calls, latency, cost, retries — is emerging as the minimum bar for governance."),
        ],
    },
    {
        "id": "doc_openai_gpt4",
        "name": "GPT-4 Technical Report",
        "author": "OpenAI",
        "category": "AI Papers",
        "tags": ["LLM", "GPT-4", "safety"],
        "pages": [
            (1, "GPT-4 Technical Report. OpenAI. We report the development of GPT-4, a large-scale multimodal model exhibiting human-level performance on many professional and academic benchmarks."),
            (12, "4. Capabilities\n\nGPT-4 exhibits emergent tool-use capabilities that improve when combined with retrieval augmentation and structured planning. On MMLU, GPT-4 scores 86.4%, and on HumanEval, 67% pass@1."),
            (23, "5. Limitations\n\nGPT-4 continues to hallucinate facts and make reasoning errors, particularly with long-tail knowledge. Grounding the model in retrieved evidence measurably reduces hallucinations but does not eliminate them."),
            (34, "6. Safety\n\nAlignment techniques, including RLHF and constitutional guardrails, materially reduce the incidence of harmful outputs. We observe a 29% reduction in unsafe responses versus GPT-3.5 on our internal red-team suite."),
        ],
    },
    {
        "id": "doc_agentic",
        "name": "The Rise of Agentic AI Systems (Survey)",
        "author": "Chen, Park, Ramirez",
        "category": "AI Papers",
        "tags": ["agentic", "LLM", "survey"],
        "pages": [
            (1, "The Rise of Agentic AI Systems: a Survey. We survey the design space of agent architectures, focusing on planner-executor patterns, tool use, and the role of validators."),
            (6, "2.1 Evaluation\n\nMulti-agent systems reduce hallucination rates by 34–58% when combined with grounded retrieval and independent validation agents. Effect sizes are larger for open-ended reasoning tasks than for structured extraction."),
            (14, "3. Architectures\n\nPlanner → Retriever → Analyst → Validator → Publisher is the emerging canonical pipeline. LangGraph, DSPy and CrewAI expose broadly similar primitives with different developer ergonomics."),
            (22, "4. Costs & Failure Modes\n\nAgents are expensive: median cost per task is 3.4× a single-shot LLM call. The dominant failure mode is not model reasoning but tool selection; validators reduce failure rates by 41% at 22% extra cost."),
        ],
    },
    {
        "id": "doc_ipcc_ar6",
        "name": "IPCC AR6 Synthesis Report",
        "author": "IPCC",
        "category": "Climate",
        "tags": ["climate", "policy", "science"],
        "pages": [
            (1, "IPCC Sixth Assessment Report — Synthesis. Human activities have unequivocally caused global warming, with the global surface temperature reaching 1.1°C above 1850-1900 in 2011-2020."),
            (12, "A.2.5 Health Impacts\n\nClimate change has adversely affected the physical health of people globally and mental health in assessed regions. Warming of 1.5°C would put 350 million more people at drought risk than a 2°C world by 2050."),
            (28, "B.1 Mitigation\n\nRapid, deep and, in most cases, immediate greenhouse gas emissions reductions are required to limit warming to 1.5°C above pre-industrial levels."),
            (44, "C.3 Adaptation\n\nAdaptation options that are effective today will become constrained and less effective with increasing warming. Losses and damages will escalate with every increment of global warming."),
        ],
    },
    {
        "id": "doc_lancet",
        "name": "The Lancet Countdown on Health & Climate 2024",
        "author": "The Lancet Countdown",
        "category": "Climate",
        "tags": ["health", "climate"],
        "pages": [
            (1, "The Lancet Countdown on health and climate change tracks the health impacts of climate change and the health co-benefits of climate action."),
            (14, "Section 1.2 Heat and Health\n\nHeatwave-related deaths among people over 65 years old rose by 85% versus the 1990s baseline, dominating direct-mortality attributions to climate change."),
            (30, "Section 3 Food Security\n\nChanging temperature and rainfall patterns are increasingly threatening food security, with net crop yield losses of 6% attributable to climate change since 1980."),
            (46, "Section 5 Health Co-benefits\n\nRapid decarbonisation produces immediate health benefits from reduced air pollution — an estimated 460,000 deaths per year would be avoided at 1.5°C stabilisation."),
        ],
    },
    {
        "id": "doc_nvda_10k",
        "name": "NVIDIA Annual Report FY2025",
        "author": "NVIDIA Corporation",
        "category": "Annual Reports",
        "tags": ["finance", "10-K", "semiconductors"],
        "pages": [
            (1, "NVIDIA Corporation Annual Report on Form 10-K for the fiscal year ended January 26, 2025. Data Center revenue reached $47.5B, up 217% year over year."),
            (12, "Item 1. Business\n\nOur data center platform combines CUDA-accelerated computing, high-speed networking (NVLink, InfiniBand), and a full-stack software ecosystem. Enterprise AI adoption is the primary demand driver."),
            (32, "Item 1A. Risk Factors\n\nExport controls to select regions materially reduce addressable market. Concentration risk exists in hyperscale customers, with three customers accounting for over 40% of Data Center revenue."),
            (58, "Item 7. MD&A\n\nGross margin expanded to 74.8% driven by mix shift toward higher-value data center systems. Operating expenses grew slower than revenue, resulting in operating leverage."),
        ],
    },
    {
        "id": "doc_tsla_10k",
        "name": "Tesla Annual Report 2024",
        "author": "Tesla, Inc.",
        "category": "Annual Reports",
        "tags": ["finance", "10-K", "automotive"],
        "pages": [
            (1, "Tesla, Inc. 2024 Annual Report. We produce and sell fully electric vehicles and energy generation and storage products."),
            (12, "Business\n\nOur mission is to accelerate the world's transition to sustainable energy. Full Self-Driving (Supervised) achieved a 3.2× reduction in accidents per mile versus the US fleet average."),
            (34, "Risk Factors\n\nOur business is highly dependent on the sales of the Model 3 and Model Y vehicles, and competition in electric vehicles is intensifying globally."),
            (60, "Financial Overview\n\nAutomotive revenue was $80.9B; energy generation and storage revenue grew 108% year over year. Free cash flow was $3.6B."),
        ],
    },
    {
        "id": "doc_attn",
        "name": "Attention Is All You Need",
        "author": "Vaswani, Shazeer, Parmar, Uszkoreit et al.",
        "category": "AI Papers",
        "tags": ["transformer", "NLP", "seminal"],
        "pages": [
            (1, "Attention Is All You Need. Vaswani et al. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely."),
            (5, "3. Model Architecture\n\nMulti-head attention allows the model to jointly attend to information from different representation subspaces at different positions. It replaces recurrent connections while permitting parallelisation."),
            (9, "5. Results\n\nOn the WMT 2014 English-to-German translation task, our big transformer model achieves 28.4 BLEU, improving over the existing best results by over 2 BLEU."),
        ],
    },
]


async def seed_if_empty() -> None:
    async with SessionLocal() as session:
        # Idempotent per default workspace: seed only when the DEFAULT workspace
        # is empty. (Checking the whole table meant that if any other workspace
        # had documents, the default would silently never get seeded.)
        existing = (
            await session.execute(
                select(Document).where(Document.workspace_id == WS)
            )
        ).scalars().first()
        if existing:
            log.info("Seed skipped — default workspace already populated")
            return

        log.info("Seeding demo library…")
        svc = DocumentService(session)
        # Register documents with backdated timestamps for a realistic activity chart
        now = datetime.now(timezone.utc)
        for i, d in enumerate(SEED_DOCS):
            doc = await svc.register_synthetic_document(
                doc_id=d["id"],
                name=d["name"],
                author=d["author"],
                category=d["category"],
                pages_texts=d["pages"],
                workspace_id=WS,
                tags=d["tags"],
            )
            back = now - timedelta(days=(len(SEED_DOCS) - i) * 3 + 1, hours=i * 2)
            doc.created_at = back
            doc.updated_at = back + timedelta(minutes=5)
            await session.flush()
        await session.commit()

        # Persist a sample research session so the /reports screen has data on first boot
        await _seed_sample_report(session)


async def _seed_sample_report(session) -> None:
    now = datetime.now(timezone.utc)
    rs = ResearchSession(
        id=research_id(),
        workspace_id=WS,
        title="Risks and Rewards of Agentic AI in the Enterprise",
        question="What are the risks of Agentic AI in the enterprise?",
        status="completed",
        confidence=0.87,
        document_ids=["doc_ai_state_2025", "doc_openai_gpt4", "doc_agentic"],
        started_at=now - timedelta(hours=6),
        completed_at=now - timedelta(hours=6, minutes=-2),
        total_tokens=9820,
        total_cost_usd=0.31,
    )
    session.add(rs)
    await session.flush()

    agents = [
        ("Planner", 820, 1420, "gpt-4o-mini", "6 objectives · 5 queries"),
        ("Retriever", 640, 0, "hybrid", "24 unique chunks"),
        ("Ranker", 410, 0, "heuristic", "top 16"),
        ("Curator", 720, 980, "gpt-4o-mini", "8 chunks selected"),
        ("Analyst", 3120, 4640, "gpt-4o", "4 findings"),
        ("Validator", 1240, 1810, "gpt-4o-mini", "0 issues"),
        ("Publisher", 610, 940, "gpt-4o-mini", "report assembled"),
    ]
    for a, ms, tok, model, detail in agents:
        session.add(
            AgentRun(
                research_id=rs.id,
                agent=a,
                status="completed",
                latency_ms=ms,
                tokens=tok,
                model=model,
                detail=detail,
                started_at=now - timedelta(hours=6),
                completed_at=now - timedelta(hours=6) + timedelta(milliseconds=ms),
            )
        )

    citations_data = [
        ("doc_ai_state_2025", "State of AI Report 2025", 42, "Enterprise adoption of agentic workflows grew 218% year over year, with 62% of surveyed companies piloting at least one autonomous agent in production.", 0.94, "3.2 Enterprise Adoption"),
        ("doc_openai_gpt4", "GPT-4 Technical Report", 12, "GPT-4 exhibits emergent tool-use capabilities that improve when combined with retrieval augmentation and structured planning.", 0.89, "4. Capabilities"),
        ("doc_agentic", "The Rise of Agentic AI Systems (Survey)", 6, "Multi-agent systems reduce hallucination rates by 34–58% when combined with grounded retrieval and independent validation agents.", 0.91, "2.1 Evaluation"),
        ("doc_ai_state_2025", "State of AI Report 2025", 88, "The primary risks cited by CIOs are cost overruns, security posture, and inability to audit agent decision paths.", 0.87, "5.4 Risks"),
        ("doc_openai_gpt4", "GPT-4 Technical Report", 34, "Alignment techniques, including RLHF and constitutional guardrails, materially reduce the incidence of harmful outputs.", 0.83, "6. Safety"),
    ]
    cit_ids: list[str] = []
    for doc_id, doc_name, page, text, conf, section in citations_data:
        cid = citation_id()
        cit_ids.append(cid)
        session.add(
            Citation(
                id=cid,
                research_id=rs.id,
                document_id=doc_id,
                document_name=doc_name,
                page=page,
                chunk_id=new_id("chunk"),
                citation_text=text,
                confidence=conf,
                section=section,
            )
        )
        session.add(
            Evidence(
                id=evidence_id(),
                research_id=rs.id,
                document_id=doc_id,
                document_name=doc_name,
                page=page,
                chunk_id=new_id("chunk"),
                text=text,
                score=0.9 - len(cit_ids) * 0.03,
                confidence=conf,
                section=section,
            )
        )

    findings_data = [
        ("Agentic AI adoption in the enterprise more than tripled in one year.", "Independent surveys report 218% YoY growth, with the majority piloting at least one autonomous agent in production.", 0.94, [cit_ids[0]]),
        ("Multi-agent architectures dramatically reduce hallucination.", "Systems combining retrieval, ranking and independent validation report 34–58% lower hallucination rates than single-prompt baselines.", 0.91, [cit_ids[2], cit_ids[1]]),
        ("Auditability is the top-cited barrier to production rollout.", "CIOs rank inability to audit agent decision paths and cost overruns above raw model capability as their primary concerns.", 0.87, [cit_ids[3]]),
        ("Alignment work meaningfully reduces harmful outputs.", "RLHF and constitutional guardrail techniques materially reduce harmful outputs but do not eliminate them.", 0.83, [cit_ids[4]]),
    ]
    for i, (claim, detail, conf, cids) in enumerate(findings_data):
        session.add(
            Finding(
                id=new_id("find"),
                research_id=rs.id,
                ordinal=i,
                claim=claim,
                detail=detail,
                confidence=conf,
                citation_ids=cids,
            )
        )

    session.add(
        Report(
            id=report_id(),
            research_id=rs.id,
            workspace_id=WS,
            title=rs.title,
            summary="Agentic AI unlocks productivity but introduces auditability, security and cost risks that require new governance patterns.",
            executive_summary=(
                "Enterprise adoption of agentic AI systems accelerated sharply in 2024–2025. "
                "While productivity gains are meaningful, the primary risks — cost overruns, security posture, "
                "and lack of decision auditability — are concentrated in tooling and governance, not the models themselves."
            ),
            methodology=(
                "Six research objectives were planned, 42 chunks were retrieved across three sources, "
                "reranked using a cross-encoder, and validated against the retrieved evidence."
            ),
            markdown="",
            contradictions=[
                "The State of AI report frames cost as the #1 blocker; the Agentic Survey ranks security higher — both are supported by evidence and depend on company size."
            ],
            recommendations=[
                "Pair every deployed agent with a validator model and a human review loop for high-stakes decisions.",
                "Instrument agent runs with structured telemetry (tokens, cost, tool calls, retries) from day one.",
                "Adopt a provider-agnostic gateway so models can be swapped as prices and capabilities evolve.",
            ],
            follow_up_questions=[
                "Which validator-agent designs offer the best hallucination reduction per dollar?",
                "How do compliance-heavy sectors audit agent decision paths today?",
                "What is the total cost of ownership for a production agent stack at 1M tasks/month?",
            ],
            version=1,
            created_at=rs.completed_at or now,
        )
    )
    await session.commit()
    log.info("Seed complete · {} demo documents · 1 sample report", len(SEED_DOCS))
