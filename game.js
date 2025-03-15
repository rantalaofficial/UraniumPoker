// Global debug mode variables
let debugMode = false;
let selectedDebugCards = [];
let nextDebugHand = [];

$(document).ready(function() {
    let deck = [];
    let currentHand = [];
    let isFirstDeal = true;
    let balance = 1000;
    const BET_AMOUNT = 10;
    const ANIMATION_DURATION = 2000; // 2 seconds
    let currentBet = 10;
    const betOptions = [1, 5, 10, 50, 100];
    let currentBetIndex = 2; // Start with 10€

    // Initialize sound effects
    const cardFlipSound = new Audio('sounds/card_flip.m4a');
    const winSound = new Audio('sounds/win_sound.mp3');

    // Function to adjust bet based on balance
    function adjustBetToBalance() {
        const currentBalance = parseInt($('#balance').text());
        while (currentBet > currentBalance && currentBetIndex > 0) {
            currentBetIndex--;
            currentBet = betOptions[currentBetIndex];
        }
        updateBetDisplay();
    }

    // Animate balance change
    function animateBalance(newBalance) {
        // Extract just the number from the balance text
        const currentBalance = parseInt($('#balance').text());
        const difference = newBalance - currentBalance;
        
        // Remove any existing animation classes
        $('.balance-text').removeClass('bounce bounce-small bounce-large');
        
        if (difference !== 0) {
            const isLargeWin = difference > currentBet * 10;
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
                        adjustBetToBalance();
                    }
                }
            }, stepDuration);

            // Play win sound for positive changes
            if (difference > 0) {
                winSound.play();
            }
        }
    }

    function updateBetDisplay() {
        $('.bet-display').text(`Bet: ${currentBet}€`);
        updatePayoutTable();
    }

    function updatePayoutTable() {
        const payouts = {
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

        $('.payout-table tr').each(function() {
            const handText = $(this).find('td:nth-child(2)').text();
            const basePayout = payouts[handText];
            if (basePayout) {
                const scaledPayout = basePayout * (currentBet / 10); // Scale based on 10€ being the base bet
                $(this).find('td:last-child').text(scaledPayout + '€');
            }
        });
    }

    function showBetButtons() {
        $('.bet-button').removeClass('hidden');
    }

    function hideBetButtons() {
        $('.bet-button').addClass('hidden');
    }

    $('.increase-bet').on('click', function() {
        if (currentBetIndex < betOptions.length - 1) {
            const nextBet = betOptions[currentBetIndex + 1];
            const currentBalance = parseInt($('#balance').text());
            if (nextBet <= currentBalance) {
                currentBetIndex++;
                currentBet = nextBet;
                updateBetDisplay();
            }
        }
    });

    $('.decrease-bet').on('click', function() {
        if (currentBetIndex > 0) {
            currentBetIndex--;
            currentBet = betOptions[currentBetIndex];
            updateBetDisplay();
        }
    });

    function updateBalance(amount) {
        const currentBalance = parseInt($('#balance').text());
        const newBalance = currentBalance + amount;
        animateBalance(newBalance);
        localStorage.setItem('playerBalance', newBalance);
    }

    // Initialize deck
    function initializeDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
        
        deck = [];
        for (let suit of suits) {
            for (let value of values) {
                deck.push({
                    suit: suit,
                    value: value,
                    image: `card_textures/${value}_of_${suit}.png`
                });
            }
        }
        shuffleDeck();
    }

    // Fisher-Yates shuffle algorithm
    function shuffleDeck() {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    // Deal a single card with animation
    function dealCardWithAnimation(index, card, delay) {
        return new Promise(resolve => {
            const cardImage = $(`.card-slot[data-index="${index}"] .card-image`);
            
            // Reset card state
            cardImage.removeClass('dealt').attr('src', '');
            
            setTimeout(() => {
                cardImage.attr('src', card.image).addClass('dealt');
                // Play card flip sound
                cardFlipSound.play();
                setTimeout(resolve, 200); // Reduced from 500 to 200 for faster animation
            }, delay);
        });
    }

    // Deal cards
    async function dealCards() {
        // Hide button during animations
        $('#dealButton').addClass('hidden');
        
        if (isFirstDeal) {
            hideBetButtons(); // Hide bet buttons during round
            // Instantly remove all cards
            $('.card-image').attr('src', '').removeClass('dealt winning');
            $('.payout-table tr').removeClass('highlight');
            $('#message').text('');
            
            if (balance < currentBet) {
                $('#message').text('Not enough balance to play!');
                $('#dealButton').removeClass('hidden');
                return;
            }
            const oldBalance = balance;
            balance -= currentBet;
            animateBalance(balance);
            
            // Check if we have a debug hand to use
            if (nextDebugHand.length === 5) {
                console.log("Using debug hand:", nextDebugHand);
                currentHand = nextDebugHand;
                nextDebugHand = []; // Clear the debug hand after using it
                
                // Display debug message
                $('#message').text('Debug hand active');
            } else {
                // Deal 5 new cards with faster animation
                currentHand = deck.splice(0, 5);
            }

            // Animate dealing the cards
            for (let i = 0; i < currentHand.length; i++) {
                await dealCardWithAnimation(i, currentHand[i], i * 100);
            }
            
            isFirstDeal = false;
            $('#dealButton').text('Draw').removeClass('hidden');
        } else {
            // Replace unlocked cards with animation
            const promises = [];
            $('.card-slot').each(function(index) {
                if (!$(this).hasClass('locked')) {
                    if (deck.length > 0) {
                        const newCard = deck.splice(0, 1)[0];
                        currentHand[index] = newCard;
                        promises.push(dealCardWithAnimation(index, newCard, index * 100));
                    }
                }
            });
            
            // Wait for all card animations to complete
            await Promise.all(promises);
            
            // Small delay before showing results
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Evaluate hand and show winnings
            const result = evaluateHand();
            if (result.winnings > 0) {
                const oldBalance = balance;
                balance += result.winnings;
                animateBalance(balance);
                $('#message').text(`Won ${result.winnings}€! (${result.type})`);
                highlightWinningHand(result);
            } else {
                $('#message').text('No winnings');
                // Remove any previous winning highlights
                $('.card-image').removeClass('winning');
                $('.payout-table tr').removeClass('highlight');
            }
            
            // Reset for next game
            isFirstDeal = true;
            $('#dealButton').text('Deal').removeClass('hidden');
            $('.card-slot').removeClass('locked');
            
            // Reshuffle if deck is running low
            if (deck.length < 10) {
                initializeDeck();
            }
            
            showBetButtons(); // Show bet buttons between rounds
        }
    }

    // Display cards on screen
    function displayCards() {
        currentHand.forEach((card, index) => {
            $(`.card-slot[data-index="${index}"] img`).attr('src', card.image);
        });
    }

    // Evaluate poker hand
    function evaluateHand() {
        const values = currentHand.map(card => card.value);
        const suits = currentHand.map(card => card.suit);
        
        // Count occurrences of each value
        const valueCounts = {};
        values.forEach(value => {
            valueCounts[value] = (valueCounts[value] || 0) + 1;
        });
        
        // Check for flush
        const isFlush = suits.every(suit => suit === suits[0]);
        
        // Check for straight
        const valueOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
        const sortedValues = [...values].sort((a, b) => valueOrder.indexOf(a) - valueOrder.indexOf(b));
        
        const isStraight = sortedValues.every((value, index) => {
            if (index === 0) return true;
            return valueOrder.indexOf(value) === valueOrder.indexOf(sortedValues[index - 1]) + 1;
        });

        // Check for royal flush (10, J, Q, K, A of same suit)
        const isRoyal = isFlush && 
            sortedValues.includes('10') && 
            sortedValues.includes('jack') && 
            sortedValues.includes('queen') && 
            sortedValues.includes('king') && 
            sortedValues.includes('ace');

        // Base payouts (for 10€ bet)
        const basePayouts = {
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

        // Helper function to return scaled winnings
        const getWinnings = (type) => {
            const base = basePayouts[type];
            return base * (currentBet / 10); // Scale based on 10€ being the base bet
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

    // Highlight winning cards and payout row
    function highlightWinningHand(result) {
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

        // Highlight winning cards based on the hand type
        const values = currentHand.map(card => card.value);
        const suits = currentHand.map(card => card.suit);

        switch (result.type) {
            case 'Royal Flush':
            case 'Straight Flush':
            case 'Flush':
                // Highlight all cards
                $('.card-image').addClass('winning');
                break;
            case 'Four of a Kind':
                // Find the value that appears 4 times
                const fourValue = Object.entries(getCounts(values))
                    .find(([_, count]) => count === 4)[0];
                highlightCardsByValue(fourValue);
                break;
            case 'Full House':
                // Find the value that appears 3 times
                const threeValue = Object.entries(getCounts(values))
                    .find(([_, count]) => count === 3)[0];
                const twoValue = Object.entries(getCounts(values))
                    .find(([_, count]) => count === 2)[0];
                highlightCardsByValue(threeValue);
                highlightCardsByValue(twoValue);
                break;
            case 'Straight':
                // Highlight all cards
                $('.card-image').addClass('winning');
                break;
            case 'Three of a Kind':
                const tripleValue = Object.entries(getCounts(values))
                    .find(([_, count]) => count === 3)[0];
                highlightCardsByValue(tripleValue);
                break;
            case 'Two Pair':
                const pairs = Object.entries(getCounts(values))
                    .filter(([_, count]) => count === 2)
                    .map(([value, _]) => value);
                pairs.forEach(value => highlightCardsByValue(value));
                break;
            case 'Jacks or Better':
                const pairValue = Object.entries(getCounts(values))
                    .find(([value, count]) => count === 2 && ['jack', 'queen', 'king', 'ace'].includes(value))[0];
                highlightCardsByValue(pairValue);
                break;
        }
    }

    // Helper function to count occurrences
    function getCounts(arr) {
        const counts = {};
        arr.forEach(item => {
            counts[item] = (counts[item] || 0) + 1;
        });
        return counts;
    }

    // Helper function to highlight cards by value
    function highlightCardsByValue(value) {
        currentHand.forEach((card, index) => {
            if (card.value === value) {
                const cardImage = $(`.card-slot[data-index="${index}"] .card-image`);
                // Remove dealt class to prevent animation conflicts
                cardImage.removeClass('dealt').addClass('winning');
            }
        });
    }

    // Event Handlers
    $('#dealButton').click(dealCards);

    $('.card-slot').click(function() {
        if (!isFirstDeal) {
            $(this).toggleClass('locked');
        }
    });

    // Initialize game
    initializeDeck();
    updateBetDisplay();
    showBetButtons(); // Show bet buttons at start
    $('#dealButton').text('Deal'); // Ensure button shows "Deal" initially

    initializeDebugMode();
    $('.debug-popup').hide();
    
    // Debug mode password handler
    $('.debug-password').on('input', function() {
        if ($(this).val().toLowerCase() === 'admin') {
            $(this).val(''); // Reset the input
            toggleDebugMode();
        }
    });
    
    $('.debug-cards .mini-card').on('click', function() {
        if (!debugMode) return;
        
        const suit = $(this).attr('data-suit');
        const value = $(this).attr('data-value');
        
        const card = {
            suit: suit,
            value: value,
            image: `card_textures/${value}_of_${suit}.png`
        };
        
        const cardIndex = selectedDebugCards.findIndex(c => 
            c.suit === card.suit && c.value === card.value);
        
        if (cardIndex === -1) {
            if (selectedDebugCards.length < 5) {
                selectedDebugCards.push(card);
                $(this).addClass('selected');
            }
        } else {
            selectedDebugCards.splice(cardIndex, 1);
            $(this).removeClass('selected');
        }
        
        updateDebugSelection();
        
        if (selectedDebugCards.length === 5) {
            nextDebugHand = [...selectedDebugCards];
            console.log("Debug hand set:", nextDebugHand);
            setTimeout(() => {
                toggleDebugMode();
            }, 500);
        }
    });
}); 

function toggleDebugMode() {
    debugMode = !debugMode;
    
    // Only clear selections when opening the popup, not when closing it
    if (debugMode) {
        selectedDebugCards = [];
        $('.mini-card').removeClass('selected');
        updateDebugSelection();
    }
    
    // Don't clear nextDebugHand when closing the popup
    $('.debug-popup').toggle();
}

function updateDebugSelection() {
    $('.debug-selected').empty();
    selectedDebugCards.forEach(card => {
        $('<div>')
            .addClass('mini-card')
            .addClass(card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black')
            .text(getCardSymbol(card.value, card.suit))
            .appendTo('.debug-selected');
    });
}

function getCardSymbol(value, suit) {
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

function initializeDebugMode() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    
    suits.forEach(suit => {
        const container = $(`.debug-cards.${suit}`);
        values.forEach(value => {
            const card = $('<div>')
                .addClass('mini-card')
                .addClass(suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black')
                .attr('data-suit', suit)
                .attr('data-value', value)
                .text(getCardSymbol(value, suit))
                .appendTo(container);
        });
    });
} 