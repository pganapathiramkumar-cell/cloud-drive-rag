"""PII detection using Microsoft Presidio with spaCy en_core_web_sm (~12 MB)."""
from functools import lru_cache

from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_anonymizer import AnonymizerEngine


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


def scrub(text: str) -> tuple[str, bool]:
    """Return (anonymised_text, pii_found). Detected entities replaced with <TYPE>."""
    analyzer, anonymizer = get_pii_engines()
    results = analyzer.analyze(text=text, language="en")
    if not results:
        return text, False
    return anonymizer.anonymize(text=text, analyzer_results=results).text, True
