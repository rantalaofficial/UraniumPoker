import random
from collections import Counter

# ----- PAYOUT TABLE -----
PAYOUTS = {
    'Royal Flush': 800,
    'Straight Flush': 500,
    'Four of a Kind': 250,
    'Full House': 150,
    'Flush': 100,
    'Straight': 60,
    'Three of a Kind': 30,
    'Two Pair': 20,
    'Jacks or Better': 10,
    'None': 0
}

# ----- DECK SETUP -----
rank_map = {
    '2':  2, '3':  3, '4':  4, '5':  5, '6':  6,
    '7':  7, '8':  8, '9':  9, 'T': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
}
suits = ['♥', '♦', '♣', '♠']
BASE_DECK = [(rank_map[r], s) for r in rank_map for s in suits]

# Face cards deck subset (J, Q, K, A => ranks 11,12,13,14)
FACE_CARDS_DECK = [(rank_map[r], s) 
                   for r in ['J','Q','K','A'] 
                   for s in suits]
# This has 4 ranks * 4 suits = 16 cards total.

def is_consecutive(sorted_ranks):
    return all(sorted_ranks[i] == sorted_ranks[i-1] + 1 for i in range(1, len(sorted_ranks)))

def evaluate_hand(cards):
    """
    Return the payout (int) for a final 5-card hand, based on our pay table.
    cards: list of (rank_value, suit).
    """
    ranks_sorted = sorted([c[0] for c in cards])
    suits_list = [c[1] for c in cards]
    rank_counts = Counter(ranks_sorted)
    count_values = sorted(rank_counts.values(), reverse=True)

    is_flush = (len(set(suits_list)) == 1)
    is_straight = is_consecutive(ranks_sorted)

    # Royal Flush (10,J,Q,K,A all same suit => ranks [10,11,12,13,14])
    if is_flush and ranks_sorted == [10, 11, 12, 13, 14]:
        return PAYOUTS['Royal Flush']

    # Straight Flush
    if is_flush and is_straight:
        return PAYOUTS['Straight Flush']

    # Four of a Kind ([4,1])
    if count_values == [4, 1]:
        return PAYOUTS['Four of a Kind']

    # Full House ([3,2])
    if count_values == [3, 2]:
        return PAYOUTS['Full House']

    # Flush
    if is_flush:
        return PAYOUTS['Flush']

    # Straight
    if is_straight:
        return PAYOUTS['Straight']

    # Three of a Kind ([3,1,1])
    if count_values == [3, 1, 1]:
        return PAYOUTS['Three of a Kind']

    # Two Pair ([2,2,1])
    if count_values == [2, 2, 1]:
        return PAYOUTS['Two Pair']

    # Jacks or Better (pair >= rank 11)
    if count_values == [2, 1, 1, 1]:
        for rank, c in rank_counts.items():
            if c == 2 and rank >= 11:
                return PAYOUTS['Jacks or Better']

    return PAYOUTS['None']

def lock_combo_indices(cards):
    """
    Return a list of indices in 'cards' to keep if there's any
    made combo (pair or better). Discard all if no combo found.
    """
    ranks = [c[0] for c in cards]
    rank_counts = Counter(ranks)
    count_values = sorted(rank_counts.values(), reverse=True)

    # 4 of a kind
    if count_values == [4, 1]:
        quads_rank = [r for r, cnt in rank_counts.items() if cnt == 4][0]
        return [i for i, c in enumerate(cards) if c[0] == quads_rank]

    # Full house => keep all
    if count_values == [3, 2]:
        return [0,1,2,3,4]

    # 3 of a kind
    if count_values == [3, 1, 1]:
        triple_rank = [r for r, cnt in rank_counts.items() if cnt == 3][0]
        return [i for i, c in enumerate(cards) if c[0] == triple_rank]

    # Two pair
    if count_values == [2, 2, 1]:
        pairs_ranks = [r for r, cnt in rank_counts.items() if cnt == 2]
        return [i for i, c in enumerate(cards) if c[0] in pairs_ranks]

    # Single pair
    if count_values == [2, 1, 1, 1]:
        pair_rank = [r for r, cnt in rank_counts.items() if cnt == 2][0]
        return [i for i, c in enumerate(cards) if c[0] == pair_rank]

    # No combos => discard all
    return []

def simulate_video_poker(num_hands, bet_size, hold_combos=False):
    """
    Scenario 1 or 2:
    - If hold_combos = False, no second draw (No Holds).
    - If hold_combos = True, lock combos and redraw.
    Returns (final_balance, return_percentage).
    """
    balance = 1000
    total_payout = 0

    for _ in range(num_hands):
        # Standard deck each deal
        deck = BASE_DECK[:]
        random.shuffle(deck)

        # Draw 5
        draw = deck[:5]
        deck = deck[5:]

        if hold_combos:
            keep_idx = lock_combo_indices(draw)
            num_to_draw = 5 - len(keep_idx)
            new_cards = deck[:num_to_draw]
            final_hand = [draw[i] for i in keep_idx] + new_cards
        else:
            final_hand = draw

        # Evaluate
        payout = evaluate_hand(final_hand)

        # Track money
        balance += (payout - bet_size)
        total_payout += payout

    total_bet = num_hands * bet_size
    return_percentage = (total_payout / total_bet) * 100
    return balance, return_percentage

def simulate_video_poker_10th_face_cards(num_hands, bet_size):
    """
    Scenario 3: 
    - Exactly like 'Lock Combos' scenario, BUT
    - Every 10th hand is dealt only from face cards (J,Q,K,A).
    Returns (final_balance, return_percentage).
    """
    balance = 1000
    total_payout = 0

    for hand_idx in range(1, num_hands + 1):
        # If it's the 10th hand, 20th hand, etc. => Only face cards
        if hand_idx % 10 == 0:
            deck = FACE_CARDS_DECK[:]
            random.shuffle(deck)
        else:
            deck = BASE_DECK[:]
            random.shuffle(deck)

        draw = deck[:5]
        deck = deck[5:]

        # Still do the "lock combos" logic
        keep_idx = lock_combo_indices(draw)
        num_to_draw = 5 - len(keep_idx)
        new_cards = deck[:num_to_draw]
        final_hand = [draw[i] for i in keep_idx] + new_cards

        # Evaluate
        payout = evaluate_hand(final_hand)

        # Track money
        balance += (payout - bet_size)
        total_payout += payout

    total_bet = num_hands * bet_size
    return_percentage = (total_payout / total_bet) * 100
    return balance, return_percentage

if __name__ == "__main__":
    num_deals = 50_000  # You can adjust as desired
    print(f"Simulating {num_deals:,} deals per scenario, for bet sizes 1 to 20...\n")

    # Print a table with 3 columns:
    # 1) No Holds Return%
    # 2) Lock Combos Return%
    # 3) Lock Combos (Royal Round) Return% (i.e., forced face cards every 10th hand)
    print("Bet Size |  No-Holds(%)   |  Lock-Combos(%)  |  Lock-Combos (Royal Round)(%)")
    print("---------|----------------|------------------|--------------------------------")

    for bet in range(1, 21):
        # Scenario 1: No Holds
        _, rtp_no_hold = simulate_video_poker(num_deals, bet_size=bet, hold_combos=False)

        # Scenario 2: Lock Combos
        _, rtp_lock = simulate_video_poker(num_deals, bet_size=bet, hold_combos=True)

        # Scenario 3: Lock Combos + "Royal Round"
        _, rtp_royal_round = simulate_video_poker_10th_face_cards(num_deals, bet)

        print(f"{bet:>8} |  {rtp_no_hold:>10.2f}%  |      {rtp_lock:>10.2f}%   |             {rtp_royal_round:>10.2f}%")