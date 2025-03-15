/**
 * game.js - Main entry point
 * This file initializes the poker game and GUI
 */

// Initialize the game when the document is ready
$(document).ready(function() {
    console.log("Document ready, initializing poker game...");
    
    try {
        // Create a new instance of the PokerGame
        const pokerGame = new PokerGame();
        console.log("PokerGame instance created");
        
        // Create a new instance of the PokerGUI and pass the game instance
        const pokerGUI = new PokerGUI(pokerGame);
        console.log("PokerGUI instance created");
        
        // Initialize the GUI
        pokerGUI.initialize();
        console.log("GUI initialized");
        
        // Make pokerGUI available globally for debugging
        window.pokerGUI = pokerGUI;
        
        console.log("Poker game initialization complete");
    } catch (error) {
        console.error("Error initializing poker game:", error);
    }
}); 