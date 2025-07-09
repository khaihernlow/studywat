from src.services.gemini_service import GeminiService
import asyncio
import json
from pathlib import Path

class ConversationService:
    def __init__(self):
        self.gemini = GeminiService()
        # Removed default_turns and get_next_turn, as only LLM streaming is used now
        self.trait_manifest = self.load_trait_manifest()
        self.probes_manifest = self.load_probes_manifest()
        self.enhancements_manifest = self.load_enhancements_manifest()
        self.confidence_threshold = 0.8

    def load_trait_manifest(self):
        manifest_path = Path(__file__).parent.parent / "manifests" / "traits.json"
        with open(manifest_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def load_probes_manifest(self):
        manifest_path = Path(__file__).parent.parent / "manifests" / "probes.json"
        with open(manifest_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def load_enhancements_manifest(self):
        manifest_path = Path(__file__).parent.parent / "manifests" / "enhancements.json"
        with open(manifest_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def format_probes_for_prompt(self):
        lines = [
            "Here are some example probes you can use to engage the user and elicit information about a trait:"
        ]
        for p in self.probes_manifest:
            lines.append(f"- {p['strategy']}: {p['description']}")
        lines.append("You are not limited to these probes—use whichever approach you think will best engage the user and elicit the needed information.")
        return "\n".join(lines)

    def format_enhancements_for_prompt(self):
        lines = [
            "Here are some conversational enhancements you can use to make the chat more engaging and supportive (use them when it feels natural, not every turn):"
        ]
        for e in self.enhancements_manifest:
            lines.append(f"- {e['name']}: {e['instruction']}")
        return "\n".join(lines)

    def get_required_traits(self):
        return [t["trait"] for t in self.trait_manifest]

    def get_state(self, user_profile):
        """
        Returns one of: 'exploration', 'consolidation', 'recommendation'
        """
        required_traits = set(self.get_required_traits())
        profile_traits = {t.trait: t for t in user_profile.traits}
        missing_traits = required_traits - set(profile_traits.keys())
        if missing_traits:
            return "exploration"
        low_confidence = [t for t in profile_traits.values() if t.confidence < self.confidence_threshold]
        if low_confidence:
            return "consolidation"
        return "recommendation"

    async def stream_next_turn(self, user_profile, conversation_history):
        """
        Stream Gemini's response for the next turn as chunks (for FastAPI streaming).
        The prompt is tailored based on the current state (exploration, consolidation, recommendation).
        """
        state = self.get_state(user_profile)
        if state == "recommendation":
            yield "Thank you for sharing! We now have enough information to make recommendations."
            return
        elif state == "consolidation":
            low_conf_traits = [t for t in user_profile.traits if t.confidence < self.confidence_threshold]
            if low_conf_traits:
                trait = low_conf_traits[0]
                desc = next((d["description"] for d in self.trait_manifest if d["trait"] == trait.trait), trait.trait)
                prompt = (
                    f"The user profile shows low confidence for the trait '{trait.trait.replace('_', ' ')}'. "
                    f"Description: {desc}\n"
                    f"Ask a clarifying or follow-up question to help better understand this trait. "
                    f"Be specific and conversational."
                )
            else:
                prompt = "Ask a follow-up question to clarify the user's profile."
        elif state == "exploration":
            required_traits = self.get_required_traits()
            profile_traits = {t.trait for t in user_profile.traits}
            missing_traits = [t for t in required_traits if t not in profile_traits]
            if missing_traits:
                # Prepare missing traits with descriptions
                missing_traits_with_desc = [
                    f"- {t['trait']}: {t['description']}" for t in self.trait_manifest if t['trait'] in missing_traits
                ]
                missing_traits_section = "\n".join(missing_traits_with_desc)
                prompt = (
                    f"Here are the traits we still need to learn about:\n{missing_traits_section}\n"
                    "Based on the conversation so far, select the trait that is most natural or relevant to ask about next. "
                    "Then, use the best probe to elicit information about that trait."
                )
            else:
                prompt = "Ask a question to learn more about the user."
        else:
            prompt = "Ask a question to learn more about the user."

        # Compose the full prompt with enhancements, probes, profile, and conversation context
        enhancements_section = self.format_enhancements_for_prompt()
        probes_section = self.format_probes_for_prompt()
        full_prompt = (
            f"{enhancements_section}\n\n"
            f"{probes_section}\n\n"
            "You are a study advisor. Given the user's profile and the conversation so far, "
            f"here is your task: {prompt}\n"
            f"Profile: {user_profile.dict()}\n"
            f"Conversation: {conversation_history}\n"
            "Next turn: \n"
            "Important: Only output the final message or question you would say to the user. Do not include your reasoning, trait selection, or probe selection in your response."
        )
        async for chunk in self.gemini.stream_response([full_prompt]):
            yield chunk