/**
 * gui.js - User interface logic
 * Handles UI interactions, animations, and display updates
 */

class PokerGUI {
    constructor(pokerGame) {
        // Game state
        this.isFirstDeal = true;
        this.balance = 1000;
        this.currentBet = 10;
        this.betOptions = [1, 5, 10, 50, 100];
        this.currentBetIndex = 2; // Start with 10€
        
        // Debug mode state
        this.debugMode = false;
        this.selectedDebugCards = [];
        this.nextDebugHand = [];
        
        // Initialize sound effects
        this.cardFlipSound = new Audio('sounds/card_flip.m4a');
        this.winSound = new Audio('sounds/win_sound.mp3');
        
        // Store the poker game instance
        this.pokerGame = pokerGame;
    }

    // Initialize the GUI
    initialize() {
        // Initialize the deck
        this.pokerGame.initializeDeck();
        
        // Load Auto Lock preference from localStorage
        const autoLockEnabled = localStorage.getItem('autoLockEnabled') === 'true';
        $('#autoLockCheckbox').prop('checked', autoLockEnabled);
        
        // Initialize uranium meter at 0%
        this.uraniumLevel = 0;
        this.updateUraniumMeter(this.uraniumLevel);
        
        this.setupEventListeners();
        this.updateBetDisplay();
        this.showBetButtons();
        $('#dealButton').text('Deal'); // Ensure button shows "Deal" initially
        this.initializeDebugMode();
        $('.debug-popup').hide();
    }

    // Set up all event listeners
    setupEventListeners() {
        // Deal button
        $('#dealButton').click(() => this.dealCards());
        
        // Card selection
        $('.card-slot').click((e) => {
            if (!this.isFirstDeal) {
                const $card = $(e.currentTarget);
                $card.toggleClass('locked');
                console.log(`Card ${$card.data('index')} ${$card.hasClass('locked') ? 'locked' : 'unlocked'}`);
            }
        });
        
        // Bet controls
        $('.increase-bet').on('click', () => this.increaseBet());
        $('.decrease-bet').on('click', () => this.decreaseBet());
        
        // Auto Lock checkbox
        $('#autoLockCheckbox').on('change', (e) => {
            const isChecked = $(e.currentTarget).is(':checked');
            console.log(`Auto Lock ${isChecked ? 'enabled' : 'disabled'}`);
            
            // Save preference to localStorage
            localStorage.setItem('autoLockEnabled', isChecked);
            
            // If enabled and we're in the first deal phase (showing cards), apply auto lock
            if (isChecked && !this.isFirstDeal) {
                this.applyAutoLock();
            }
        });
        
        // Debug mode password
        $('.debug-password').on('input', (e) => {
            if ($(e.currentTarget).val().toLowerCase() === 'admin') {
                $(e.currentTarget).val(''); // Reset the input
                this.toggleDebugMode();
            }
        });
    }

    // Increase bet amount
    increaseBet() {
        if (this.currentBetIndex < this.betOptions.length - 1) {
            const nextBet = this.betOptions[this.currentBetIndex + 1];
            const currentBalance = parseInt($('#balance').text());
            if (nextBet <= currentBalance) {
                this.currentBetIndex++;
                this.currentBet = nextBet;
                this.updateBetDisplay();
            }
        }
    }

    // Decrease bet amount
    decreaseBet() {
        if (this.currentBetIndex > 0) {
            this.currentBetIndex--;
            this.currentBet = this.betOptions[this.currentBetIndex];
            this.updateBetDisplay();
        }
    }

    // Update bet display and payout table
    updateBetDisplay() {
        $('.bet-display').text(`Bet: ${this.currentBet}€`);
        this.updatePayoutTable();
    }

    // Update payout table based on current bet
    updatePayoutTable() {
        const payouts = this.pokerGame.getPayoutTable(this.currentBet);
        
        $('.payout-table tr').each(function() {
            const handText = $(this).find('td:nth-child(2)').text();
            const scaledPayout = payouts[handText];
            if (scaledPayout) {
                $(this).find('td:last-child').text(scaledPayout + '€');
            }
        });
    }

    // Show bet buttons
    showBetButtons() {
        $('.bet-button').removeClass('hidden');
    }

    // Hide bet buttons
    hideBetButtons() {
        $('.bet-button').addClass('hidden');
    }

    // Adjust bet based on balance
    adjustBetToBalance() {
        const currentBalance = parseInt($('#balance').text());
        while (this.currentBet > currentBalance && this.currentBetIndex > 0) {
            this.currentBetIndex--;
            this.currentBet = this.betOptions[this.currentBetIndex];
        }
        this.updateBetDisplay();
    }

    // Animate balance change
    animateBalance(newBalance) {
        // Extract just the number from the balance text
        const currentBalance = parseInt($('#balance').text());
        const difference = newBalance - currentBalance;
        
        // Remove any existing animation classes
        $('.balance-text').removeClass('bounce bounce-small bounce-large');
        
        if (difference !== 0) {
            const isLargeWin = difference > this.currentBet * 10;
            const duration = isLargeWin ? 2000 : 1000; // 2 seconds for large wins, 1 second for small
            const steps = Math.abs(difference);
            const stepDuration = duration / steps;
            let currentStep = 0;
            
            // Clear any existing animation interval
            if (window.balanceAnimation) {
                clearInterval(window.balanceAnimation);
            }
            
            window.balanceAnimation = setInterval(() => {
                currentStep++;
                const progress = currentStep / steps;
                // Accelerating easing function
                const easedProgress = progress < 0.5 
                    ? 4 * progress * progress * progress 
                    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                
                const currentValue = Math.round(currentBalance + (difference * easedProgress));
                $('#balance').text(currentValue);
                
                if (currentStep >= steps) {
                    clearInterval(window.balanceAnimation);
                    $('#balance').text(newBalance);
                    
                    if (newBalance <= 0) {
                        $('.message').addClass('game-over').text('Game over!');
                        $('#dealButton').prop('disabled', true);
                    } else {
                        // Adjust bet if needed after balance change
                        this.adjustBetToBalance();
                    }
                }
            }, stepDuration);

            // Play win sound for positive changes
            if (difference > 0) {
                this.winSound.play();
            }
        }
    }

    // Update balance
    updateBalance(amount) {
        const currentBalance = parseInt($('#balance').text());
        const newBalance = currentBalance + amount;
        this.animateBalance(newBalance);
        this.balance = newBalance;
        localStorage.setItem('playerBalance', newBalance);
        
        // Update uranium meter
        this.updateUraniumMeter(this.uraniumLevel);
    }

    // Update uranium meter level
    updateUraniumMeter(level) {
        // Ensure level is between 0 and 100
        this.uraniumLevel = Math.min(Math.max(level, 0), 100);
        
        // Update the uranium liquid height
        $('.uranium-liquid').css('height', `${this.uraniumLevel}%`);
        
        // Update the percentage text
        $('.uranium-percentage').text(`${Math.round(this.uraniumLevel)}%`);
        
        // Change text color based on whether it's over the liquid or not
        // If the liquid level is above 45%, the text is over the liquid
        if (this.uraniumLevel > 45) {
            $('.uranium-percentage').css({
                'color': 'black',
                'text-shadow': '0 0 3px rgba(255, 255, 255, 1)'
            });
        } else {
            $('.uranium-percentage').css({
                'color': 'white',
                'text-shadow': '0 0 3px rgba(0, 0, 0, 1)'
            });
        }
        
        // Add glow intensity based on level - increased for better visibility
        const glowIntensity = Math.min(this.uraniumLevel / 100 * 25 + 10, 35);
        $('.uranium-liquid').css('box-shadow', `0 0 ${glowIntensity}px ${glowIntensity / 2}px rgba(255, 255, 0, ${this.uraniumLevel / 100 * 0.5 + 0.5})`);
    }
    
    // Fill uranium meter with random amount
    fillUraniumMeter() {
        // Generate random amount between 5-10%
        const randomFill = Math.floor(Math.random() * 10) + 10;
        const newLevel = this.uraniumLevel + randomFill;
        
        // Apply shake animation to the container
        $('.uranium-meter-container').css('animation', 'tankShake 0.5s');
        
        // Remove animation after it completes
        setTimeout(() => {
            $('.uranium-meter-container').css('animation', '');
        }, 500);
        
        // Update the meter with new level
        this.updateUraniumMeter(newLevel);
    }

    // Deal a single card with animation
    dealCardWithAnimation(index, card, delay) {
        return new Promise(resolve => {
            const cardImage = $(`.card-slot[data-index="${index}"] .card-image`);
            
            // Reset card state
            cardImage.removeClass('dealt').attr('src', '');
            
            setTimeout(() => {
                cardImage.attr('src', card.image).addClass('dealt');
                // Play card flip sound
                this.cardFlipSound.play();
                setTimeout(resolve, 200); // Reduced from 500 to 200 for faster animation
            }, delay);
        });
    }

    // Validate debug hand
    validateDebugHand(hand) {
        if (!hand || !Array.isArray(hand) || hand.length !== 5) {
            console.error("Invalid debug hand: not an array of 5 cards", hand);
            return false;
        }
        
        // Check that each card has the required properties
        for (let i = 0; i < hand.length; i++) {
            const card = hand[i];
            if (!card.suit || !card.value || !card.image) {
                console.error(`Invalid card at index ${i}:`, card);
                return false;
            }
        }
        
        return true;
    }

    // Detect card combinations and auto-lock them
    applyAutoLock() {
        const currentHand = this.pokerGame.getHand();
        if (!currentHand || currentHand.length !== 5) return;
        
        // Get value counts to identify pairs, three of a kind, etc.
        const valueCounts = {};
        currentHand.forEach((card, index) => {
            valueCounts[card.value] = valueCounts[card.value] || { count: 0, indices: [] };
            valueCounts[card.value].count++;
            valueCounts[card.value].indices.push(index);
        });
        
        console.log("Card value counts:", valueCounts);
        
        // Check for flush (all same suit)
        const suits = currentHand.map(card => card.suit);
        const isFlush = suits.every(suit => suit === suits[0]);
        
        // Check for straight
        const valueOrder = this.pokerGame.valueOrder;
        const sortedValues = [...currentHand.map(card => card.value)]
            .sort((a, b) => valueOrder.indexOf(a) - valueOrder.indexOf(b));
        
        const isStraight = sortedValues.every((value, index) => {
            if (index === 0) return true;
            return valueOrder.indexOf(value) === valueOrder.indexOf(sortedValues[index - 1]) + 1;
        });
        
        // Determine which cards to lock based on combinations
        let indicesToLock = [];
        
        // Check for royal flush or straight flush (lock all)
        if (isFlush && isStraight) {
            indicesToLock = [0, 1, 2, 3, 4];
        }
        // Check for four of a kind
        else {
            for (const value in valueCounts) {
                if (valueCounts[value].count === 4) {
                    indicesToLock = [...valueCounts[value].indices];
                    break;
                }
            }
        }
        
        // If no four of a kind, check for full house
        if (indicesToLock.length === 0) {
            let hasThreeOfAKind = false;
            let hasPair = false;
            let threeIndices = [];
            let pairIndices = [];
            
            for (const value in valueCounts) {
                if (valueCounts[value].count === 3) {
                    hasThreeOfAKind = true;
                    threeIndices = valueCounts[value].indices;
                } else if (valueCounts[value].count === 2) {
                    hasPair = true;
                    pairIndices = valueCounts[value].indices;
                }
            }
            
            if (hasThreeOfAKind && hasPair) {
                indicesToLock = [...threeIndices, ...pairIndices];
            } else if (hasThreeOfAKind) {
                indicesToLock = [...threeIndices];
            }
        }
        
        // If no full house or three of a kind, check for flush
        if (indicesToLock.length === 0 && isFlush) {
            indicesToLock = [0, 1, 2, 3, 4];
        }
        
        // If no flush, check for straight
        if (indicesToLock.length === 0 && isStraight) {
            indicesToLock = [0, 1, 2, 3, 4];
        }
        
        // If no straight, check for pairs
        if (indicesToLock.length === 0) {
            let pairIndices = [];
            
            for (const value in valueCounts) {
                if (valueCounts[value].count === 2) {
                    // For Jacks or Better, only lock high pairs
                    if (['jack', 'queen', 'king', 'ace'].includes(value)) {
                        pairIndices = [...pairIndices, ...valueCounts[value].indices];
                    } else if (pairIndices.length === 0) {
                        // For low pairs, only lock if we don't have high pairs
                        pairIndices = [...valueCounts[value].indices];
                    }
                }
            }
            
            if (pairIndices.length > 0) {
                indicesToLock = pairIndices;
            }
        }
        
        // Apply locks to the selected cards
        if (indicesToLock.length > 0) {
            console.log("Auto-locking indices:", indicesToLock);
            
            // Remove any existing locks first
            $('.card-slot').removeClass('locked');
            
            // Apply locks to the selected cards
            indicesToLock.forEach(index => {
                $(`.card-slot[data-index="${index}"]`).addClass('locked');
            });
        }
    }

    // Main deal cards function
    async dealCards() {
        // Hide button during animations
        $('#dealButton').addClass('hidden');
        
        if (this.isFirstDeal) {
            this.hideBetButtons(); // Hide bet buttons during round
            // Instantly remove all cards
            $('.card-image').attr('src', '').removeClass('dealt winning');
            $('.payout-table tr').removeClass('highlight');
            $('#message').text('');
            
            if (this.balance < this.currentBet) {
                $('#message').text('Not enough balance to play!');
                $('#dealButton').removeClass('hidden');
                return;
            }
            
            this.balance -= this.currentBet;
            this.animateBalance(this.balance);
            
            // Check if Uranium meter is at max (100%)
            if (this.uraniumLevel >= 100) {
                // Shake violently and empty to 0%
                await this.triggerUraniumMeltdown();
                
                // Deal special hand with only J, Q, K, A
                this.dealUraniumHand();
                $('#message').text('Uranium Meltdown! Special hand dealt!');
            } else {
                // Check if we have a debug hand to use
                if (this.nextDebugHand.length === 5 && this.validateDebugHand(this.nextDebugHand)) {
                    console.log("Using debug hand:", this.nextDebugHand);
                    this.pokerGame.setHand([...this.nextDebugHand]); // Use a copy of the debug hand
                    $('#message').text('Debug hand active');
                    this.nextDebugHand = []; // Clear the debug hand after using it
                } else {
                    // Deal 5 new cards
                    console.log("Dealing new hand from deck");
                    this.pokerGame.dealHand();
                }
            }

            // Get the current hand
            const currentHand = this.pokerGame.getHand();
            console.log("Current hand:", currentHand);

            // Animate dealing the cards
            for (let i = 0; i < currentHand.length; i++) {
                await this.dealCardWithAnimation(i, currentHand[i], i * 100);
            }
            
            this.isFirstDeal = false;
            $('#dealButton').text('Draw').removeClass('hidden');
            
            // Apply auto lock if enabled
            if ($('#autoLockCheckbox').is(':checked')) {
                setTimeout(() => this.applyAutoLock(), 300);
            }
        } else {
            // Get indices of unlocked cards
            const indicesToReplace = [];
            $('.card-slot').each(function(index) {
                if (!$(this).hasClass('locked')) {
                    indicesToReplace.push(index);
                }
            });
            
            console.log("Replacing cards at indices:", indicesToReplace);
            
            // Replace unlocked cards
            this.pokerGame.replaceCards(indicesToReplace);
            const currentHand = this.pokerGame.getHand();
            console.log("Hand after replacement:", currentHand);
            
            // Animate replacing cards
            const promises = [];
            for (let index of indicesToReplace) {
                promises.push(this.dealCardWithAnimation(index, currentHand[index], index * 100));
            }
            
            // Wait for all card animations to complete
            await Promise.all(promises);
            
            // Small delay before showing results
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Evaluate hand and show winnings
            const result = this.pokerGame.evaluateHand(this.currentBet);
            console.log("Hand evaluation result:", result);
            
            if (result.winnings > 0) {
                this.balance += result.winnings;
                this.animateBalance(this.balance);
                $('#message').text(`Won ${result.winnings}€! (${result.type})`);
                this.highlightWinningHand(result);
            } else {
                $('#message').text('No winnings');
                // Remove any previous winning highlights
                $('.card-image').removeClass('winning');
                $('.payout-table tr').removeClass('highlight');
                
                // Fill uranium meter on losing hand
                this.fillUraniumMeter();
            }
            
            // Reset for next game
            this.isFirstDeal = true;
            $('#dealButton').text('Deal').removeClass('hidden');
            $('.card-slot').removeClass('locked');
            
            // Reshuffle if deck is running low
            if (this.pokerGame.deck.length < 10) {
                console.log("Reshuffling deck");
                this.pokerGame.initializeDeck();
            }
            
            this.showBetButtons(); // Show bet buttons between rounds
        }
    }

    // Highlight winning hand in the payout table and cards
    highlightWinningHand(result) {
        // Remove any existing highlights
        $('.card-image').removeClass('winning');
        $('.payout-table tr').removeClass('highlight');

        if (!result.winnings) return;

        // Find the matching payout table row
        const payoutRows = $('.payout-table tr');
        payoutRows.each(function() {
            // Use a more precise check to match only the exact hand type
            const handTypeCell = $(this).find('td:nth-child(2)');
            if (handTypeCell.text() === result.type) {
                $(this).addClass('highlight');
            }
        });

        // Get current hand
        const currentHand = this.pokerGame.getHand();
        const values = currentHand.map(card => card.value);
        const suits = currentHand.map(card => card.suit);

        switch (result.type) {
            case 'Royal Flush':
            case 'Straight Flush':
            case 'Flush':
            case 'Straight':
                // Highlight all cards
                $('.card-image').addClass('winning');
                break;
            case 'Four of a Kind':
                // Find the value that appears 4 times
                const fourValue = Object.entries(this.pokerGame.getCounts(values))
                    .find(([_, count]) => count === 4)[0];
                this.highlightCardsByValue(fourValue);
                break;
            case 'Full House':
                // Find the value that appears 3 times
                const threeValue = Object.entries(this.pokerGame.getCounts(values))
                    .find(([_, count]) => count === 3)[0];
                const twoValue = Object.entries(this.pokerGame.getCounts(values))
                    .find(([_, count]) => count === 2)[0];
                this.highlightCardsByValue(threeValue);
                this.highlightCardsByValue(twoValue);
                break;
            case 'Three of a Kind':
                const tripleValue = Object.entries(this.pokerGame.getCounts(values))
                    .find(([_, count]) => count === 3)[0];
                this.highlightCardsByValue(tripleValue);
                break;
            case 'Two Pair':
                const pairs = Object.entries(this.pokerGame.getCounts(values))
                    .filter(([_, count]) => count === 2)
                    .map(([value, _]) => value);
                pairs.forEach(value => this.highlightCardsByValue(value));
                break;
            case 'Jacks or Better':
                const pairValue = Object.entries(this.pokerGame.getCounts(values))
                    .find(([value, count]) => count === 2 && ['jack', 'queen', 'king', 'ace'].includes(value))[0];
                this.highlightCardsByValue(pairValue);
                break;
        }
    }

    // Helper function to highlight cards by value
    highlightCardsByValue(value) {
        const currentHand = this.pokerGame.getHand();
        currentHand.forEach((card, index) => {
            if (card.value === value) {
                const cardImage = $(`.card-slot[data-index="${index}"] .card-image`);
                // Remove dealt class to prevent animation conflicts
                cardImage.removeClass('dealt').addClass('winning');
            }
        });
    }

    // Toggle debug mode
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        console.log("Debug mode:", this.debugMode ? "ON" : "OFF");
        
        // Only clear selections when opening the popup, not when closing it
        if (this.debugMode) {
            this.selectedDebugCards = [];
            $('.mini-card').removeClass('selected');
            this.updateDebugSelection();
            $('.debug-popup').show();
        } else {
            $('.debug-popup').hide();
        }
    }

    // Update debug selection display
    updateDebugSelection() {
        $('.debug-selected').empty();
        this.selectedDebugCards.forEach(card => {
            $('<div>')
                .addClass('mini-card')
                .addClass(card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black')
                .text(this.getCardSymbol(card.value, card.suit))
                .appendTo('.debug-selected');
        });
    }

    // Get card symbol for display
    getCardSymbol(value, suit) {
        const suitSymbol = {
            'hearts': '♥',
            'diamonds': '♦',
            'clubs': '♣',
            'spades': '♠'
        }[suit];
        
        const displayValue = {
            'jack': 'J',
            'queen': 'Q',
            'king': 'K',
            'ace': 'A'
        }[value] || value;
        
        return displayValue + suitSymbol;
    }

    // Initialize debug mode
    initializeDebugMode() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
        
        // Clear existing cards first
        $('.debug-cards').empty();
        
        // Create the debug cards
        suits.forEach(suit => {
            const container = $(`.debug-cards.${suit}`);
            values.forEach(value => {
                const card = $('<div>')
                    .addClass('mini-card')
                    .addClass(suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black')
                    .attr('data-suit', suit)
                    .attr('data-value', value)
                    .text(this.getCardSymbol(value, suit))
                    .appendTo(container);
                
                // Attach click handler directly to each card
                card.on('click', (e) => {
                    if (!this.debugMode) return;
                    
                    const $card = $(e.currentTarget);
                    const cardSuit = $card.attr('data-suit');
                    const cardValue = $card.attr('data-value');
                    
                    const cardObj = {
                        suit: cardSuit,
                        value: cardValue,
                        image: `card_textures/${cardValue}_of_${cardSuit}.png`
                    };
                    
                    const cardIndex = this.selectedDebugCards.findIndex(c => 
                        c.suit === cardObj.suit && c.value === cardObj.value);
                    
                    if (cardIndex === -1) {
                        if (this.selectedDebugCards.length < 5) {
                            this.selectedDebugCards.push(cardObj);
                            $card.addClass('selected');
                            console.log("Card selected:", cardObj);
                        }
                    } else {
                        this.selectedDebugCards.splice(cardIndex, 1);
                        $card.removeClass('selected');
                        console.log("Card deselected:", cardObj);
                    }
                    
                    this.updateDebugSelection();
                    
                    if (this.selectedDebugCards.length === 5) {
                        this.nextDebugHand = [...this.selectedDebugCards];
                        console.log("Debug hand set:", this.nextDebugHand);
                        setTimeout(() => {
                            this.toggleDebugMode();
                        }, 500);
                    }
                });
            });
        });
    }

    // Trigger uranium meltdown animation
    async triggerUraniumMeltdown() {
        return new Promise(resolve => {
            // Add violent shake animation
            $('.uranium-meter-container').css('animation', 'violentShake 0.2s infinite');
            
            // Add glow effect to the container
            $('.uranium-meter-container').css('box-shadow', '0 0 30px 15px rgba(255, 255, 0, 0.8)');
            
            // Play a sound effect if available
            if (this.winSound) {
                this.winSound.play();
            }
            
            // After 1.5 seconds, stop shaking and empty the meter
            setTimeout(() => {
                // Stop the shaking
                $('.uranium-meter-container').css('animation', '');
                $('.uranium-meter-container').css('box-shadow', '');
                
                // Empty the meter to 0%
                this.uraniumLevel = 0;
                this.updateUraniumMeter(0);
                
                resolve();
            }, 1500);
        });
    }
    
    // Deal a special hand with only face cards (J, Q, K, A)
    dealUraniumHand() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const values = ['jack', 'queen', 'king', 'ace'];
        
        // Create a special hand with random face cards
        const specialHand = [];
        
        for (let i = 0; i < 5; i++) {
            const randomSuit = suits[Math.floor(Math.random() * suits.length)];
            const randomValue = values[Math.floor(Math.random() * values.length)];
            
            specialHand.push({
                suit: randomSuit,
                value: randomValue,
                image: `card_textures/${randomValue}_of_${randomSuit}.png`
            });
        }
        
        // Set the hand
        this.pokerGame.setHand(specialHand);
    }
}

// Export the PokerGUI class for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PokerGUI };
} else {
    // For browser environment
    window.PokerGUI = PokerGUI;
} 