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
        const betOptions = [];
        for (let i = 1; i <= 1000000; i *= 10) {
            betOptions.push(i);
            if (i * 5 <= 1000000) {
                betOptions.push(i * 5);
            }
        }
        this.betOptions = betOptions;
        this.currentBetIndex = 2; // Start with 10€
        this.doubleMode = false;
        this.lastWinAmount = 0;
        
        // Debug mode state
        this.debugMode = false;
        this.selectedDebugCards = [];
        this.nextDebugHand = [];
        
        // Initialize sound effects
        this.cardFlipSound = new Audio('sounds/card_flip.m4a');
        this.winSound = new Audio('sounds/win_sound.mp3');
        this.explosionSound = new Audio('sounds/explosion.m4a');
        
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
        
        // Hide nuke-container initially
        $('.nuke-container').hide();
        
        this.setupEventListeners();
        this.updateBetDisplay();
        this.showBetButtons();
        $('#dealButton').html('<div class="button-content"><span class="main-label">Deal</span><div class="shortcut-label">[Space]</div></div>'); // Ensure button shows "Deal" initially
        $('#doubleButton').addClass('unlit'); // Double button starts as unlit
        this.initializeDebugMode();
        $('.debug-popup').hide();
    }

    // Set up all event listeners
    setupEventListeners() {
        // Deal button
        $('#dealButton').click(() => {
            if (!$('#dealButton').hasClass('unlit')) {
                this.dealCards();
            }
        });
        
        // Double button
        $('#doubleButton').click(() => {
            if (!$('#doubleButton').hasClass('unlit')) {
                this.playDoubleGame();
            }
        });
        
        // Keyboard shortcuts
        $(document).keydown((e) => {
            // Space key for Deal/Draw
            if (e.keyCode === 32) {
                if (!$('#dealButton').hasClass('unlit')) {
                    this.dealCards();
                }
                e.preventDefault(); // Prevent page scrolling
            }
            
            // Enter key for Double
            if (e.keyCode === 13) {
                if (!$('#doubleButton').hasClass('unlit')) {
                    this.playDoubleGame();
                }
                e.preventDefault();
            }
        });
        
        // Card selection
        $('.card-slot').click((e) => {
            if (!this.isFirstDeal && !this.doubleMode) {
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
        
        // Instructions button
        $('#instructionsButton').on('click', () => {
            $('#instructionsPopup').fadeIn(300);
        });
        
        // Close instructions button
        $('#closeInstructionsButton').on('click', () => {
            $('#instructionsPopup').fadeOut(300);
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
        const currentBalance = parseInt($('#balance').text());
        
        if (this.currentBetIndex < this.betOptions.length - 1) {
            const nextBet = this.betOptions[this.currentBetIndex + 1];
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
        $('.bet-display span').text(`Bet: ${this.currentBet}€`);
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

    // Enable bet buttons
    showBetButtons() {
        $('.bet-button').removeClass('unlit');
    }

    // Disable bet buttons
    hideBetButtons() {
        $('.bet-button').addClass('unlit');
    }

    // Adjust bet based on balance
    adjustBetToBalance() {
        const currentBalance = parseInt($('#balance').text());
        
        if (this.currentBet > currentBalance) {
            // Using predefined options
            while (this.currentBet > currentBalance && this.currentBetIndex > 0) {
                this.currentBetIndex--;
                this.currentBet = this.betOptions[this.currentBetIndex];
            }
            this.updateBetDisplay();
        }
    }

    // Animate balance change
    animateBalance(newBalance) {
        // Extract just the number from the balance text
        const currentBalance = parseInt($('#balance').text());
        const difference = newBalance - currentBalance;
        
        // Remove any existing animation classes
        $('.balance-text').removeClass('bounce bounce-small bounce-large');
        
        if (difference !== 0) {
            // Calculate the increment amount (2% of difference, minimum 1)
            const incrementAmount = Math.max(1, Math.ceil(Math.abs(difference) * 0.02));
            
            // Calculate number of steps based on increment amount
            const steps = Math.ceil(Math.abs(difference) / incrementAmount);
            
            // Duration based on steps, but capped to make large wins faster
            const duration = Math.min(1500, Math.max(500, steps * 20));
            const stepDuration = duration / steps;
            
            let currentStep = 0;
            let currentValue = currentBalance;
            
            // Clear any existing animation interval
            if (window.balanceAnimation) {
                clearInterval(window.balanceAnimation);
            }
            
            // Add appropriate bounce class based on win size
            if (difference > 0) {
                if (difference > this.currentBet * 10) {
                    $('.balance-text').addClass('bounce-large');
                } else if (difference > this.currentBet) {
                    $('.balance-text').addClass('bounce-small');
                } else {
                    $('.balance-text').addClass('bounce');
                }
            }
            
            window.balanceAnimation = setInterval(() => {
                currentStep++;
                
                // Calculate the next value
                if (difference > 0) {
                    currentValue = Math.min(newBalance, currentValue + incrementAmount);
                } else {
                    currentValue = Math.max(newBalance, currentValue - incrementAmount);
                }
                
                // Update the display
                $('#balance').text(currentValue);
                
                // Check if we're done
                if (currentValue === newBalance || currentStep >= steps) {
                    clearInterval(window.balanceAnimation);
                    $('#balance').text(newBalance);
                    
                    // Adjust bet if needed after balance change
                    this.adjustBetToBalance();
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
        const previousLevel = this.uraniumLevel;
        this.uraniumLevel = Math.min(Math.max(level, 0), 100);
        
        // Animate the percentage text with rolling numbers
        this.animateUraniumPercentage(previousLevel, this.uraniumLevel);
        
        // Add glow effect to the nuke image based on level
        const glowIntensity = Math.min(this.uraniumLevel / 100 * 25 + 10, 35);
        $('.nuke-image').css('filter', `drop-shadow(0 0 ${glowIntensity/2}px rgba(255, 255, 0, ${this.uraniumLevel / 100 * 0.5 + 0.5}))`);
        
        // Gradually show/hide nuke-container based on uraniumLevel
        if (this.uraniumLevel === 0) {
            $('.nuke-container').hide();
        } else if (previousLevel === 0 && this.uraniumLevel > 0) {
            // If transitioning from 0 to a positive value, fade in
            $('.nuke-container').css('opacity', 0).show().animate({opacity: 1}, 1000);
        } else {
            // Ensure it's visible
            $('.nuke-container').show();
        }
    }
    
    // Animate uranium percentage with rolling numbers
    animateUraniumPercentage(fromValue, toValue) {
        // Clear any existing animation
        if (this.uraniumAnimation) {
            clearInterval(this.uraniumAnimation);
        }
        
        // Round the values
        fromValue = Math.round(fromValue);
        toValue = Math.round(toValue);
        
        // If values are the same, just update the text
        if (fromValue === toValue) {
            $('.nuke-percentage').text(`Nuke ${toValue}% Completed`);
            return;
        }
        
        // Calculate animation steps
        const duration = 1000; // 1 second
        const fps = 30;
        const steps = duration / (1000 / fps);
        const increment = (toValue - fromValue) / steps;
        
        let currentStep = 0;
        let currentValue = fromValue;
        
        // Start the animation
        this.uraniumAnimation = setInterval(() => {
            currentStep++;
            
            // Calculate the next value
            if (fromValue < toValue) {
                currentValue = Math.min(toValue, currentValue + increment);
            } else {
                currentValue = Math.max(toValue, currentValue + increment);
            }
            
            // Update the display
            $('.nuke-percentage').text(`Nuke ${Math.round(currentValue)}% Completed`);
            
            // Check if we're done
            if (currentStep >= steps || Math.round(currentValue) === toValue) {
                clearInterval(this.uraniumAnimation);
                $('.nuke-percentage').text(`Nuke ${toValue}% Completed`);
            }
        }, 1000 / fps);
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
        // Disable buttons during animations by making them unlit
        $('#dealButton, #doubleButton').addClass('unlit');
        
        // If we're in double mode, return to normal mode
        if (this.doubleMode) {
            this.exitDoubleMode();
            return;
        }
        
        if (this.isFirstDeal) {
            // Make bet buttons unlit during round instead of hiding them
            $('.bet-button').addClass('unlit');
            
            // Instantly remove all cards
            $('.card-image').attr('src', '').removeClass('dealt winning');
            $('.payout-table tr').removeClass('highlight');
            $('#message').text('');
            
            if (this.balance < this.currentBet) {
                $('#message').text('Not enough money!');
                $('#dealButton').removeClass('unlit');
                $('.bet-button').removeClass('unlit');
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
                $('#message').text('Nuke Exploded! Special hand dealt!');
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
            $('#dealButton').html('<div class="button-content"><span class="main-label">Draw</span><div class="shortcut-label">[Space]</div></div>').removeClass('unlit');
            
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
                
                // Store the win amount for potential doubling
                this.lastWinAmount = result.winnings;
                
                // Activate the double button
                $('#doubleButton').removeClass('unlit');
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
            $('#dealButton').html('<div class="button-content"><span class="main-label">Deal</span><div class="shortcut-label">[Space]</div></div>').removeClass('unlit');
            $('.card-slot').removeClass('locked');
            
            // Reshuffle if deck is running low
            if (this.pokerGame.deck.length < 10) {
                console.log("Reshuffling deck");
                this.pokerGame.initializeDeck();
            }
            
            // Enable bet buttons between rounds
            $('.bet-button').removeClass('unlit');
        }
    }

    // Create falling coins animation
    createCoinAnimation() {
        // Number of coins based on win amount
        const numCoins = 50;
        
        // Create and append coins to the body
        for (let i = 0; i < numCoins; i++) {
            const coin = document.createElement('div');
            coin.className = 'coin';
            
            // Random horizontal position
            const randomX = Math.random() * window.innerWidth;
            coin.style.left = `${randomX}px`;
            
            // Random delay
            const randomDelay = Math.random() * 1;  // Reduced from 1.5s to match faster animation
            coin.style.animationDelay = `${randomDelay}s`;
            
            // Random size variation (slightly larger)
            const randomSize = 30 + Math.random() * 25;  // Increased from 20-40 to 30-55
            coin.style.width = `${randomSize}px`;
            coin.style.height = `${randomSize}px`;
            
            // Random rotation
            const randomRotation = Math.random() * 360;
            coin.style.transform = `rotate(${randomRotation}deg)`;
            
            // Append to body
            document.body.appendChild(coin);
            
            // Remove after animation completes
            setTimeout(() => {
                if (coin.parentNode) {
                    coin.parentNode.removeChild(coin);
                }
            }, (randomDelay + 1.33) * 1000); // Updated animation duration + delay
        }
    }

    // Show "BIG WIN!" popup
    showBigWinPopup() {
        // Remove any existing popup
        $('.big-win-popup').remove();
        
        // Create the popup
        const popup = document.createElement('div');
        popup.className = 'big-win-popup';
        popup.textContent = 'BIG WIN!';
        
        // Ensure it's added to the body for proper positioning
        document.body.appendChild(popup);
        
        // Force a reflow to ensure the animation works properly
        void popup.offsetWidth;
        
        // Remove after animation completes
        setTimeout(() => {
            if (popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
        }, 2000); // Animation duration
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

        // Check if it's a high hand win
        const highHands = ['Royal Flush', 'Straight Flush', 'Four of a Kind', 'Full House', 'Flush'];
        if (highHands.includes(result.type)) {
            // Create coin animation for high hands
            this.createCoinAnimation();
            
            // Show "BIG WIN!" popup
            this.showBigWinPopup();
        }

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
            
            // After 0.5 second, animate the nuke dropping
            setTimeout(() => {
                // Get the nuke image element
                const nukeImage = $('.nuke-image');
                
                // Get the current position of the nuke image
                const nukePosition = nukeImage.offset();
                
                // Get the position of the cards container (middle point)
                const cardsContainer = $('.cards-container');
                const cardsPosition = cardsContainer.offset();
                const cardsMiddleX = cardsPosition.left + cardsContainer.width() / 2;
                const cardsMiddleY = cardsPosition.top + cardsContainer.height() / 2;
                
                // Create a clone of the nuke image for the animation
                const nukeClone = nukeImage.clone();
                
                // Set the clone's initial position to match the original nuke
                nukeClone.css({
                    position: 'fixed',
                    top: nukePosition.top + 'px',
                    left: nukePosition.left + 'px',
                    width: nukeImage.width() + 'px',
                    height: nukeImage.height() + 'px',
                    zIndex: 1000,
                    filter: 'drop-shadow(0 0 20px rgba(255, 255, 0, 0.8))',
                    transform: 'none',
                    margin: 0,
                    padding: 0
                });
                
                // Append the clone to the body
                $('body').append(nukeClone);
                
                // Hide the original nuke image
                nukeImage.css('visibility', 'hidden');
                
                // Create a custom animation for the nuke to target the cards center
                const customAnimation = `
                    @keyframes customNukeDrop {
                        0% {
                            top: ${nukePosition.top}px;
                            left: ${nukePosition.left}px;
                            transform: scale(1) rotate(0deg);
                            opacity: 1;
                        }
                        50% {
                            top: ${(nukePosition.top + cardsMiddleY) / 2}px;
                            left: ${(nukePosition.left + cardsMiddleX) / 2}px;
                            transform: scale(1.5) rotate(180deg);
                            opacity: 1;
                        }
                        80% {
                            top: ${cardsMiddleY - 50}px;
                            left: ${cardsMiddleX - 50}px;
                            transform: scale(2) rotate(360deg);
                            opacity: 0.8;
                        }
                        100% {
                            top: ${cardsMiddleY}px;
                            left: ${cardsMiddleX}px;
                            transform: scale(3) rotate(720deg);
                            opacity: 0;
                        }
                    }
                `;
                
                // Add the custom animation to the head
                const styleElement = document.createElement('style');
                styleElement.innerHTML = customAnimation;
                document.head.appendChild(styleElement);
                
                // Apply the custom animation to the clone
                nukeClone.css('animation', 'customNukeDrop 1.5s forwards');
                
                // After animation completes, remove the clone and show the original
                setTimeout(() => {
                    // Remove the clone
                    nukeClone.remove();
                    
                    // Remove the custom animation style
                    document.head.removeChild(styleElement);
                    
                    // Show the original nuke image
                    nukeImage.css('visibility', 'visible');
                    
                    // Stop the shaking
                    $('.uranium-meter-container').css('animation', '');
                    $('.uranium-meter-container').css('box-shadow', '');
                    
                    // Empty the meter to 0%
                    this.uraniumLevel = 0;
                    this.updateUraniumMeter(0);
                    
                    // Create an explosion effect at the cards
                    this.createExplosionEffect(cardsMiddleX, cardsMiddleY);
                    
                    resolve();
                }, 1500);
            }, 500);
        });
    }
    
    // Create explosion effect
    createExplosionEffect(x, y) {
        // Play explosion sound at 50% volume
        this.explosionSound.volume = 0.5;
        this.explosionSound.play();
        
        // Create explosion div
        const explosion = $('<div class="explosion"></div>');
        explosion.css({
            position: 'fixed',
            top: y - 150 + 'px',
            left: x - 150 + 'px',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,0,0.8) 0%, rgba(255,165,0,0.6) 50%, rgba(255,0,0,0.4) 100%)',
            boxShadow: '0 0 50px 25px rgba(255, 255, 0, 0.8)',
            zIndex: 999
        });
        
        // Append to body
        $('body').append(explosion);
        
        // Add screen shake effect
        $('body').addClass('screen-shake');
        
        // Remove after animation completes
        setTimeout(() => {
            explosion.remove();
            $('body').removeClass('screen-shake');
        }, 500);
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

    // Play the double game
    async playDoubleGame() {
        console.log("Starting double game with win amount:", this.lastWinAmount);
        
        // Enter double mode
        this.doubleMode = true;
        
        // Disable buttons during animations
        $('#dealButton, #doubleButton').addClass('unlit');
        
        // Clear the cards and remove any highlights
        $('.card-image').attr('src', '').removeClass('dealt winning');
        $('.card-slot').removeClass('locked');
        $('.payout-table tr').removeClass('highlight');
        
        // Show the dealer and player labels
        $('.dealer-label').css('display', 'block');
        $('.player-label').css('display', 'block');
        
        // Update message
        $('#message').text(`Double or nothing: ${this.lastWinAmount}€`);
        
        // Deal 4 cards for the double game (2 for dealer, 2 for player)
        const doubleCards = this.pokerGame.deck.splice(0, 4);
        
        // Deal first dealer card (position 0)
        await this.dealCardWithAnimation(0, doubleCards[0], 300);
        
        // Deal first player card (position 3)
        await this.dealCardWithAnimation(3, doubleCards[1], 300);
        
        // Deal second dealer card (position 1)
        await this.dealCardWithAnimation(1, doubleCards[2], 300);
        
        // Deal second player card (position 4)
        await this.dealCardWithAnimation(4, doubleCards[3], 300);
        
        // Small delay before showing results
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Determine the winner by evaluating poker hands
        const dealerHand = [doubleCards[0], doubleCards[2]];
        const playerHand = [doubleCards[1], doubleCards[3]];
        
        const dealerRank = this.evaluateDoubleHand(dealerHand);
        const playerRank = this.evaluateDoubleHand(playerHand);
        
        console.log(`Dealer has ${dealerRank.type} (${dealerRank.value}), Player has ${playerRank.type} (${playerRank.value})`);
        
        let playerWins = false;
        
        // Compare hand ranks
        if (dealerRank.rank < playerRank.rank) {
            playerWins = true;
        } else if (dealerRank.rank === playerRank.rank) {
            // If same rank, compare values
            if (dealerRank.value < playerRank.value) {
                playerWins = true;
            }
        }
        
        // Highlight the winning hand
        if (playerWins) {
            this.highlightWinningDoubleHand(playerHand, true);
        } else {
            this.highlightWinningDoubleHand(dealerHand, false);
        }
        
        if (playerWins) {
            // Player wins
            const doubledAmount = this.lastWinAmount * 2;
            this.balance += doubledAmount;
            this.animateBalance(this.balance);
            $('#message').text(`You win! Doubled to ${doubledAmount}€`);
            this.winSound.play();
        } else {
            // Dealer wins (including ties)
            $('#message').text('Dealer wins. Better luck next time!');
            // The winnings were already added to the balance, so we need to subtract them
            this.balance -= this.lastWinAmount;
            this.animateBalance(this.balance);
        }
        
        // Enable the deal button to continue
        $('#dealButton').html('<div class="button-content"><span class="main-label">Continue</span><div class="shortcut-label">[Space]</div></div>').removeClass('unlit');
    }
    
    // Evaluate a hand for the double game
    evaluateDoubleHand(cards) {
        if (cards.length !== 2) {
            console.error("Invalid hand for double game evaluation");
            return { rank: 0, type: "Invalid", value: 0 };
        }
        
        // Check if it's a pair
        if (cards[0].value === cards[1].value) {
            // It's a pair
            const pairValue = this.pokerGame.valueOrder.indexOf(cards[0].value);
            return { 
                rank: 2, 
                type: "Pair", 
                value: pairValue 
            };
        } else {
            // Not a pair, evaluate high card
            const values = cards.map(card => this.pokerGame.valueOrder.indexOf(card.value));
            const highValue = Math.max(...values);
            return { 
                rank: 1, 
                type: "High Card", 
                value: highValue 
            };
        }
    }
    
    // Highlight the winning hand in the double game
    highlightWinningDoubleHand(cards, isPlayer) {
        // Remove any existing highlights
        $('.card-image').removeClass('winning');
        
        // Determine which card slots to highlight based on whether it's player or dealer
        const indices = isPlayer ? [3, 4] : [0, 1];
        
        // Highlight both cards
        indices.forEach(index => {
            const cardImage = $(`.card-slot[data-index="${index}"] .card-image`);
            cardImage.removeClass('dealt').addClass('winning');
        });
    }
    
    // Exit double mode and return to normal game
    exitDoubleMode() {
        this.doubleMode = false;
        this.lastWinAmount = 0;
        
        // Hide the dealer and player labels
        $('.dealer-label').css('display', 'none');
        $('.player-label').css('display', 'none');
        
        // Clear the cards
        $('.card-image').attr('src', '').removeClass('dealt winning');
        
        // Reset the deal button
        $('#dealButton').html('<div class="button-content"><span class="main-label">Deal</span><div class="shortcut-label">[Space]</div></div>').removeClass('unlit');
        
        // Disable the double button
        $('#doubleButton').addClass('unlit');
        
        // Clear message
        $('#message').text('');
        
        // Enable bet buttons
        $('.bet-button').removeClass('unlit');
    }
}

// Export the PokerGUI class for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PokerGUI };
} else {
    // For browser environment
    window.PokerGUI = PokerGUI;
} 