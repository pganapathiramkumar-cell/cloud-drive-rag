"""PII detection using Microsoft Presidio with spaCy en_core_web_sm (~12 MB)."""
from functools import lru_cache

from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_anonymizer import AnonymizerEngine

from app.workflow.tracer import traced, add_current_span_metadata


@lru_cache(maxsize=1)
def get_pii_engines() -> tuple[AnalyzerEngine, AnonymizerEngine]:
    # en_core_web_sm (12 MB) instead of en_core_web_lg (560 MB)
    provider = NlpEngineProvider(nlp_configuration={
        "nlp_engine_name": "spacy",
        "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
    })
    analyzer = AnalyzerEngine(
        nlp_engine=provider.create_engine(),
        supported_languages=["en"],
    )
    return analyzer, AnonymizerEngine()


@traced(
    "presidio.scrub",
    file="services/pii.py",
    library="presidio-analyzer + presidio-anonymizer",
    version="2.2.354",
    nlp_model="spaCy en_core_web_sm",
)
def scrub(text: str) -> tuple[str, bool]:
    """Return (anonymised_text, pii_found). Detected entities replaced with <TYPE>."""
    analyzer, anonymizer = get_pii_engines()
    results = analyzer.analyze(text=text, language="en")

    add_current_span_metadata("input_chars",    len(text))
    add_current_span_metadata("entities_found", len(results))
    add_current_span_metadata("entity_types",   list({r.entity_type for r in results}))
    add_current_span_metadata("pii_detected",   bool(results))

    if not results:
        return text, False

    anonymised = anonymizer.anonymize(text=text, analyzer_results=results).text
    add_current_span_metadata("output_chars",   len(anonymised))
    return anonymised, True
