from src.credits import credits_for_deck, credits_for_script
from src.revision.catalog import list_topics


def test_credit_costs():
    assert credits_for_deck() == 3
    assert credits_for_script() == 5


def test_topic_catalog():
    topics = list_topics()
    assert len(topics) >= 5
