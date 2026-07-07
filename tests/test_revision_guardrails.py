from src.revision_guardrails import validate_deck, validate_script


def test_validate_deck_accepts_sample():
    payload = {
        "topic_title": "Linear graphs",
        "deck_intro": "These cards cover gradient, intercept, and plotting linear relationships for Year 10 revision.",
        "cards": [
            {"front": f"Question {index}?", "back": f"Explanation {index} with enough detail for revision."}
            for index in range(8)
        ],
        "study_tip": "Shuffle cards and say answers aloud before flipping.",
        "integrity_note": "Use for learning — do not copy card text into submitted assessments.",
    }
    validated, err = validate_deck(payload)
    assert err is None
    assert validated is not None


def test_validate_script_accepts_sample():
    payload = {
        "topic_title": "Ecosystems",
        "estimated_minutes": 6,
        "sections": [
            {"heading": "Energy flow", "script": "Energy moves from the sun to producers and then to consumers in food chains."},
            {"heading": "Food webs", "script": "Real ecosystems have overlapping food webs rather than single chains."},
            {"heading": "Human impact", "script": "Pollution and habitat loss can disrupt energy flow and biodiversity."},
        ],
        "recap_questions": ["What is a producer?", "Why do food webs matter?"],
        "integrity_note": "Listen and revise — do not paste script text into homework.",
    }
    validated, err = validate_script(payload)
    assert err is None
    assert validated is not None
