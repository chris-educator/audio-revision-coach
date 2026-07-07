from src.credits import credits_for_deck, credits_for_script


def test_credit_costs():
    assert credits_for_deck() == 3
    assert credits_for_script() == 5
