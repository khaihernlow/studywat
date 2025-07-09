from datetime import datetime
from src.services.gemini_service import GeminiService
from pydantic import BaseModel
from typing import Optional
import json
from pathlib import Path
import logging
logger = logging.getLogger(__name__)

class EvaluationResult(BaseModel):
    label: str
    confidence: float
    evidence: str
    timestamp: Optional[datetime] = None

class EvaluationService:
    def __init__(self):
        self.gemini = GeminiService()
        self.trait_manifest = self.load_trait_manifest()

    def load_trait_manifest(self):
        manifest_path = Path(__file__).parent.parent / "manifests" / "traits.json"
        with open(manifest_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def manifest_traits_text(self):
        return "\n".join([
            f"- {t['trait']}: {t['description']}" for t in self.trait_manifest
        ])

    def get_trait_keys(self):
        return [t["trait"] for t in self.trait_manifest]

    async def evaluate_answer(self, turn: str, user_answer: str) -> dict:
        """
        Use Gemini to evaluate the user's answer to a turn and extract a trait, label, confidence, and evidence.
        Gemini is instructed to select the most relevant trait from the manifest and use the description to guide evaluation.
        """
        from google import genai
        manifest_text = self.manifest_traits_text()
        trait_keys = self.get_trait_keys()
        prompt = (
            "You are an educational psychologist. Here are the traits we are interested in, with their descriptions:\n"
            f"{manifest_text}\n"
            "Given the following turn and user answer, select the most relevant trait (from the list above). "
            "For the selected trait, return a JSON object with these fields: "
            "trait (the trait key from the list), label (the specific characteristic, e.g., 'visual learner'), confidence (float between 0 and 1), and evidence (short text snippet justifying the label). "
            "If the user's answer does not provide any information about a trait, return an empty JSON object {}.\n"
            f"Turn: {turn}\n"
            f"Answer: {user_answer}"
        )
        try:
            response = self.gemini.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                },
            )
            logger.debug("LLM RAW RESPONSE: %s", response.text)
            logger.debug("LLM PARSED RESPONSE: %s", response.parsed)
            result = response.parsed
            if result is None or not isinstance(result, dict):
                import json as _json
                try:
                    result = _json.loads(response.text)
                except Exception:
                    result = {}
            trait = result.get("trait") or "unknown"
            label = result.get("label") or "unknown"
            confidence = result.get("confidence")
            if confidence is None:
                confidence = 0.0
            evidence = result.get("evidence") or "unknown"
            # Only return if trait is in manifest
            if trait in trait_keys:
                result = {
                    "trait": trait,
                    "label": label,
                    "confidence": confidence,
                    "evidence": evidence,
                    "timestamp": datetime.utcnow()
                }
                return result
            else:
                return {}
        except Exception as e:
            logger.error("EvaluationService error: %s", e)
            return {
                "trait": "unknown",
                "label": "unknown",
                "confidence": 0.0,
                "evidence": "Could not parse LLM response.",
                "timestamp": datetime.utcnow()
            }