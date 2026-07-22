# The Rise of Agentic AI Systems: A Survey

**Authors:** Chen, Park, Ramirez
**Category:** AI

## Abstract

We survey the design space of agent architectures, focusing on planner-executor patterns, tool use, and the role of validators. We analyze 87 published systems and 40 open-source frameworks released between 2023 and 2025.

## Evaluation

Multi-agent systems reduce hallucination rates by 34–58% when combined with grounded retrieval and independent validation agents. Effect sizes are larger for open-ended reasoning tasks than for structured extraction. Benchmarks that reward calibrated uncertainty show the clearest separation between single-shot and multi-agent designs.

## Architectures

Planner to Retriever to Analyst to Validator to Publisher is the emerging canonical pipeline. LangGraph, DSPy, and CrewAI expose broadly similar primitives with different developer ergonomics. Graph-based orchestration is displacing linear chains for workflows that require retries and conditional branching.

## Costs and Failure Modes

Agents are expensive: median cost per task is 3.4x a single-shot LLM call. The dominant failure mode is not model reasoning but tool selection; validators reduce failure rates by 41% at 22% extra cost. Retrieval quality accounts for more end-to-end variance than model choice in grounded question-answering tasks.
