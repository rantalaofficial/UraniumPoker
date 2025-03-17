/**
 * poker.js - Core poker game logic
 * Contains the game rules, hand evaluation, and deck management
 */

class PokerGame {
    constructor() {
        this.deck = [];
        this.currentHand = [];
        this.basePayouts = {
            'Royal Flush': 800,
            'Straight Flush': 500,
            'Four of a Kind': 250,
            'Full House': 150,
            'Flush': 100,
            'Straight': 60,
            'Three of a Kind': 30,
            'Two Pair': 20,
            'Jacks or Better': 10
        };
        this.valueOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    }

    // Initialize and shuffle the deck
    initializeDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
        
        this.deck = [];
        for (let suit of suits) {
            for (let value of values) {
                this.deck.push({
                    suit: suit,
                    value: value,
                    image: `card_textures/${value}_of_${suit}.png`
                });
            }
        }
        this.shuffleDeck();
        return this.deck;
    }

    // Fisher-Yates shuffle algorithm
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
        return this.deck;
    }

    // Deal a new hand of 5 cards
    dealHand() {
        this.currentHand = this.deck.splice(0, 5);
        return this.currentHand;
    }

    // Replace specific cards in the hand
    replaceCards(indicesToReplace) {
        for (let index of indicesToReplace) {
            if (this.deck.length > 0) {
                this.currentHand[index] = this.deck.splice(0, 1)[0];
            }
        }
        return this.currentHand;
    }

    // Set a specific hand (for debug mode)
    setHand(hand) {
        this.currentHand = hand;
        return this.currentHand;
    }

    // Get the current hand
    getHand() {
        return this.currentHand;
    }

    // Helper function to count occurrences
    getCounts(arr) {
        const counts = {};
        arr.forEach(item => {
            counts[item] = (counts[item] || 0) + 1;
        });
        return counts;
    }

    // Evaluate the current hand and return the result
    evaluateHand(betAmount = 10) {
        const values = this.currentHand.map(card => card.value);
        const suits = this.currentHand.map(card => card.suit);
        
        // Count occurrences of each value
        const valueCounts = this.getCounts(values);
        
        // Check for flush
        const isFlush = suits.every(suit => suit === suits[0]);
        
        // Check for straight
        const sortedValues = [...values].sort((a, b) => 
            this.valueOrder.indexOf(a) - this.valueOrder.indexOf(b));
        
        const isStraight = sortedValues.every((value, index) => {
            if (index === 0) return true;
            return this.valueOrder.indexOf(value) === 
                   this.valueOrder.indexOf(sortedValues[index - 1]) + 1;
        });

        // Check for royal flush (10, J, Q, K, A of same suit)
        const isRoyal = isFlush && 
            sortedValues.includes('10') && 
            sortedValues.includes('jack') && 
            sortedValues.includes('queen') && 
            sortedValues.includes('king') && 
            sortedValues.includes('ace');

        // Helper function to return scaled winnings
        const getWinnings = (type) => {
            const base = this.basePayouts[type];
            return base * (betAmount / 10); // Scale based on 10€ being the base bet
        };

        // Evaluate hand with scaled winnings
        if (isFlush && isRoyal) return { type: 'Royal Flush', winnings: getWinnings('Royal Flush') };
        if (isFlush && isStraight) return { type: 'Straight Flush', winnings: getWinnings('Straight Flush') };
        if (Object.values(valueCounts).includes(4)) return { type: 'Four of a Kind', winnings: getWinnings('Four of a Kind') };
        if (Object.values(valueCounts).includes(3) && Object.values(valueCounts).includes(2)) {
            return { type: 'Full House', winnings: getWinnings('Full House') };
        }
        if (isFlush) return { type: 'Flush', winnings: getWinnings('Flush') };
        if (isStraight) return { type: 'Straight', winnings: getWinnings('Straight') };
        if (Object.values(valueCounts).includes(3)) return { type: 'Three of a Kind', winnings: getWinnings('Three of a Kind') };
        if (Object.values(valueCounts).filter(count => count === 2).length === 2) {
            return { type: 'Two Pair', winnings: getWinnings('Two Pair') };
        }
        
        // Check for Jacks or Better
        const hasPairJacksOrBetter = Object.entries(valueCounts).some(([value, count]) => {
            return count === 2 && ['jack', 'queen', 'king', 'ace'].includes(value);
        });
        
        if (hasPairJacksOrBetter) return { type: 'Jacks or Better', winnings: getWinnings('Jacks or Better') };
        
        return { type: 'No Win', winnings: 0 };
    }

    // Get all possible payouts for a given bet amount
    getPayoutTable(betAmount = 10) {
        const payouts = {};
        for (const [handType, basePayout] of Object.entries(this.basePayouts)) {
            payouts[handType] = basePayout * (betAmount / 10);
        }
        return payouts;
    }
}

// Export the PokerGame class for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PokerGame };
} else {
    // For browser environment
    window.PokerGame = PokerGame;
} 