import json
from pathlib import Path
from src.services.gemini_service import GeminiService
import logging
logger = logging.getLogger(__name__)
from datetime import datetime

# Utility to convert all datetimes in a dict/list to ISO strings
def convert_datetimes(obj):
    if isinstance(obj, dict):
        return {k: convert_datetimes(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_datetimes(i) for i in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat()
    else:
        return obj

class RecommendationService:
    def __init__(self):
        self.gemini = GeminiService()
        # Use backend/src/resources as base
        BASE_DIR = Path(__file__).resolve().parent.parent
        self.fields_of_study = self.load_fields_of_study(BASE_DIR)

    def load_fields_of_study(self, base_dir):
        path = base_dir / "resources" / "field_of_study.txt"
        fields = []
        current_field = None
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                if line.startswith("Field of Study: "):
                    current_field = line.replace("Field of Study: ", "")
                elif ":" in line and current_field:
                    course, desc = line.split(":", 1)
                    fields.append({
                        "field": current_field,
                        "course": course.strip(),
                        "description": desc.strip()
                    })
        return fields

    def fields_text(self):
        return "\n".join([
            f"- {f['course']}: {f['description']}" for f in self.fields_of_study
        ])

    async def recommend_courses(self, user_profile: dict) -> list:
        """
        Calls Gemini to recommend the 10 best-matching fields of study for the user profile.
        Only sends the traits list from the profile document.
        Returns a JSON array of objects with course, course_fit (1, 2, or 3), matched_traits, and reason.
        """
        import asyncio
        traits = user_profile.get("traits", [])
        traits = convert_datetimes(traits)
        logger.info(f"Generating recommendations for user with {len(traits)} traits")

        prompt = (
            "You are an educational advisor. Here is a list of courses and their descriptions:\n"
            f"{self.fields_text()}\n"
            "Given the following user's traits, recommend the 10 most relevant courses.\n"
            "For each course, assign a relative fit category:\n"
            "- course_fit: 1 (best fit, top group), 2 (medium fit, middle group), or 3 (lower fit, bottom group).\n"
            "- There should be at least 2-3 courses in each fit group.\n"
            "- The assignment should be relative: compare all 10 courses you recommend and distribute them into these three groups based on how well they fit the user's traits compared to each other.\n"
            "For each course, return a JSON object with these fields:\n"
            "- course (the course name)\n"
            "- course_fit (1, 2, or 3)\n"
            "- matched_traits (a list of the user's trait labels from the 'label' field in the traits that are relevant to this course)\n"
            "- reason (1-2 sentences explaining why it's a good match)\n"
            "Return ONLY a JSON array of 10 objects, with NO extra text, explanation, or formatting.\n"
            "Example:\n"
            "[\n"
            "  {\n"
            "    \"course\": \"Computer Science\",\n"
            "    \"course_fit\": 1,\n"
            "    \"matched_traits\": [\"analytical thinking\", \"problem solving\"],\n"
            "    \"reason\": \"The user's traits indicate strong analytical skills, which are essential for Computer Science.\"\n"
            "  },\n"
            "  ...\n"
            "]\n"
            f"User traits: {json.dumps(traits)}"
        )
        # Log the first 3-4 lines of the prompt for debugging
        # prompt_lines = prompt.split("\n")
        # logger.info("Prompt preview: %s", "\n".join(prompt_lines[:4]))

        try:
            logger.info("Calling Gemini API for course recommendations")
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.gemini.client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json",
                    },
                )
            )
            result = response.parsed
            if result is None or not isinstance(result, list):
                import json as _json
                try:
                    result = _json.loads(response.text)
                except Exception:
                    result = []

            logger.debug(f"Recommendations: {result}")
            return result
        except Exception as e:
            logger.error("RecommendationService error: %s", e)
            return [] 