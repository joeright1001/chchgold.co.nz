/**
 * =====================================================================================
 * ADMIN CREATE-EDIT JavaScript - Client-Side Functionality
 * =====================================================================================
 *
 * This script manages all client-side interactivity for the quote creation and editing page.
 * Its primary purpose is to provide a dynamic and responsive user experience for administrators.
 *
 * -------------------------------------------------------------------------------------
 * CORE FEATURES:
 * -------------------------------------------------------------------------------------
 *
 * 1.  **Live Price Updates:**
 *     - Fetches and displays real-time gold and silver spot prices.
 *     - Allows manual price refreshes, which automatically recalculate all item values.
 *
 * 2.  **Dynamic Item Rows:**
 *     - Users can add or remove quote items on the fly.
 *     - New item rows are created by cloning a `<template>` element, ensuring a single,
 *       maintainable source for the item row's HTML structure.
 *
 * 3.  **Real-Time Calculations:**
 *     - Instantly calculates and displays the total price for each item row as the user
 *       inputs data (quantity, weight, etc.).
 *     - Automatically updates the grand total for the entire quote in real-time.
 *
 * 4.  **User Interface Feedback:**
 *     - Manages loading spinners and button states during asynchronous operations like
 *       fetching prices or submitting the form.
 *     - Provides simple UI enhancements like a "copy to clipboard" button for the quote URL.
 *
 * =====================================================================================
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- CORE ELEMENT SELECTION ---
    const form = document.getElementById('admin-create-edit-form');
    const submitButton = form.querySelector('button[type="submit"]');
    const spinner = submitButton.querySelector('.spinner-border');
    const card = document.getElementById('admin-create-edit-card');
    const quoteId = card.dataset.quoteId;
    const isEditMode = !!quoteId;

    // --- UI/UX EVENT LISTENERS ---

    /**
     * Handles the "Open URL" button functionality in edit mode.
     * Opens the customer-facing URL in a new tab with an admin password for auto-login.
     */
    const openUrlBtn = document.getElementById('open-url-btn');
    if (openUrlBtn) {
        openUrlBtn.addEventListener('click', () => {
            const customerUrl = document.getElementById('customer-url').value;
            const adminPassword = card.dataset.adminPassword;
            
            if (customerUrl && adminPassword) {
                // Construct the URL for the login page, not the direct quote view,
                // so the auto-login logic in the GET /login route can be triggered.
                const loginUrl = `${customerUrl}/login?admin_password=${encodeURIComponent(adminPassword)}`;
                window.open(loginUrl, '_blank');
            } else {
                alert('Could not open the URL. Customer URL or admin password not found.');
            }
        });
    }

    /**
     * Handles the "Mark as Expired" form submission in edit mode.
     * - Shows a confirmation dialog before proceeding.
     * - Prevents submission if the user cancels.
     * - Manages the loading spinner and button state.
     */
    const expireForm = document.getElementById('expire-form');
    if (expireForm) {
        const expireButton = expireForm.querySelector('button[type="submit"]');
        const expireSpinner = expireButton.querySelector('.spinner-border');

        expireForm.addEventListener('submit', (event) => {
            const isConfirmed = confirm('Are you sure you want to mark this quote as expired?');
            
            if (!isConfirmed) {
                event.preventDefault();
                return;
            }

            if (expireButton.disabled) {
                event.preventDefault();
                return;
            }

            expireSpinner.classList.remove('d-none');
            expireButton.disabled = true;
        });
    }

    /**
     * Handles the main form submission.
     * - Updates hidden input fields with the latest spot prices from the card's dataset.
     * - Shows a loading spinner on the submit button to indicate processing.
     */
    form.addEventListener('submit', () => {
        document.getElementById('hidden-gold-gram-nzd').value = card.dataset.goldGramNzd || 0;
        document.getElementById('hidden-silver-gram-nzd').value = card.dataset.silverGramNzd || 0;

        spinner.classList.remove('d-none');
        submitButton.disabled = true;
    });

    // =====================================================================================
    // LIVE PRICE MANAGEMENT
    // =====================================================================================
    const refreshPriceBtn = document.getElementById('refresh-price-btn');
    const getLivePriceBtn = document.getElementById('get-live-price-btn');
    const priceErrorDiv = document.getElementById('price-error');

    /**
     * A single, reusable function to fetch, display, and store live spot prices.
     * This function handles the logic for both "create" and "edit" modes.
     * @param {HTMLButtonElement} button - The button element that triggered the action.
     */
    const updateLivePrices = async (button) => {
        const spinner = button.querySelector('.spinner-border');
        button.disabled = true;
        spinner.classList.remove('d-none');
        priceErrorDiv.textContent = '';

        const url = isEditMode ? `/quote/edit/${quoteId}/refresh-price` : '/quote/get-live-prices';
        const options = isEditMode ? { method: 'POST', headers: { 'Content-Type': 'application/json' } } : {};

        try {
            const response = await fetch(url, options);
            const data = await response.json();

            if (!response.ok) {
                // If the server sends a specific error message, use it. Otherwise, use a generic one.
                throw new Error(data.error || 'Failed to fetch latest prices from the server.');
            }

            // Normalize the keys from the server response, as they differ between modes.
            const prices = {
                gold_oz: Number(data.spot_price_gold_ounce_nzd || data.gold_ounce_nzd).toFixed(2),
                gold_g: Number(data.spot_price_gold_gram_nzd || data.gold_gram_nzd).toFixed(2),
                silver_oz: Number(data.spot_price_silver_ounce_nzd || data.silver_ounce_nzd).toFixed(2),
                silver_g: Number(data.spot_price_silver_gram_nzd || data.silver_gram_nzd).toFixed(2),
                gold_g_raw: data.spot_price_gold_gram_nzd || data.gold_gram_nzd,
                silver_g_raw: data.spot_price_silver_gram_nzd || data.silver_gram_nzd
            };

            // Update the UI with the new prices.
            document.getElementById('gold-oz-price').textContent = prices.gold_oz;
            document.getElementById('gold-g-price').textContent = prices.gold_g;
            document.getElementById('silver-oz-price').textContent = prices.silver_oz;
            document.getElementById('silver-g-price').textContent = prices.silver_g;
            document.getElementById('last-updated').textContent = new Date().toLocaleString();

            // Store the raw gram values in the card's dataset for calculations.
            card.dataset.goldGramNzd = prices.gold_g_raw;
            card.dataset.silverGramNzd = prices.silver_g_raw;

            // Recalculate all item prices with the new spot values.
            updateAllItemPrices();

        } catch (error) {
            priceErrorDiv.textContent = `Error: ${error.message}`;
        } finally {
            button.disabled = false;
            spinner.classList.add('d-none');
        }
    };

    // Attach the event listener to the "refresh" button if it exists (edit mode).
    if (refreshPriceBtn) {
        refreshPriceBtn.addEventListener('click', () => updateLivePrices(refreshPriceBtn));
    }

    // Attach the event listener to the "get live" button if it exists (create mode).
    if (getLivePriceBtn) {
        getLivePriceBtn.addEventListener('click', () => updateLivePrices(getLivePriceBtn));
    }

    // =====================================================================================
    // DYNAMIC ITEMS MANAGEMENT
    // =====================================================================================
    const itemsContainer = document.getElementById('items-container');
    const addItemBtn = document.getElementById('add-item-btn');

    // Initial setup: attach event listeners to any server-rendered item rows.
    setupItemEventListeners();

    /**
     * Handles the "Add Item" button click.
     * - Determines the correct index for the new row.
     * - Creates a new item row using the template.
     * - Appends the new row to the container.
     * - Updates UI elements like remove buttons and item numbers.
     */
    addItemBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const currentRows = itemsContainer.querySelectorAll('.item-row');
        const newIndex = currentRows.length;
        
        const newRow = createItemRow(newIndex);
        itemsContainer.appendChild(newRow);
        
        updateRemoveButtonVisibility();
        updateItemNumbers();
    });

    /**
     * Creates a new item row by cloning an HTML template.
     * @param {number} index - The new row's index, used to set names and IDs correctly.
     * @returns {HTMLElement} The newly created item row element, ready to be appended.
     */
    function createItemRow(index) {
        const template = document.getElementById('item-row-template');
        const clone = template.content.cloneNode(true);
        const newRow = clone.querySelector('.item-row');

        // The template HTML contains 'INDEX' as a placeholder. This replaces it
        // with the actual row index to ensure form field names are correct.
        // e.g., name="items[INDEX][name]" becomes name="items[1][name]"
        newRow.innerHTML = newRow.innerHTML.replace(/INDEX/g, index);
        
        // Attach all necessary event listeners to the new row's inputs.
        setupItemRowListeners(newRow);
        return newRow;
    }

    /**
     * A helper function to iterate over all item rows and attach event listeners.
     * This is used for both initial page load and for newly added rows.
     */
    function setupItemEventListeners() {
        const rows = itemsContainer.querySelectorAll('.item-row');
        rows.forEach(row => setupItemRowListeners(row));
    }

    /**
     * Attaches all necessary event listeners to a single item row.
     * This is the core of the item's interactivity.
     * @param {HTMLElement} row - The item row element to attach listeners to.
     */
    function setupItemRowListeners(row) {
        // Remove button: Deletes the row and triggers UI updates.
        const removeBtn = row.querySelector('.remove-item-btn');
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            row.remove();
            updateRemoveButtonVisibility();
            updateItemNumbers();
            reindexItems();
            updateAllItemPrices(); // Recalculate total after removal
        });

        // Metal type dropdown: Updates the row's dataset and recalculates its price.
        const metalTypeSelect = row.querySelector('.metal-type-select');
        metalTypeSelect.addEventListener('change', (e) => {
            row.dataset.metalType = e.target.value;
            calculateItemPrice(row);
        });

        // Weight type dropdown: When a pre-defined weight is selected (e.g., "1 oz"),
        // it auto-fills the "Metal Weight (g)" input with the gram equivalent.
        const weightTypeSelect = row.querySelector('.weight-type-select');
        weightTypeSelect.addEventListener('change', (e) => {
            const weightInput = row.querySelector('.weight-input');
            const weightTypeHidden = row.querySelector('.weight-type-hidden');
            
            const selectedWeight = e.target.value;
            weightInput.value = selectedWeight; // Auto-fill the weight input
            weightTypeHidden.value = selectedWeight; // Update hidden field for submission
            
            calculateItemPrice(row);
        });

        // All other inputs (weight, quantity, percent) trigger a price recalculation on change.
        row.querySelector('.weight-input').addEventListener('input', () => calculateItemPrice(row));
        row.querySelector('.quantity-input').addEventListener('input', () => calculateItemPrice(row));
        row.querySelector('.percent-input').addEventListener('input', () => calculateItemPrice(row));
    }

    /**
     * Manages the visibility of the "Remove" button for each item row.
     * If only one row exists, the button is hidden. If more than one, it's shown.
     */
    function updateRemoveButtonVisibility() {
        const rows = itemsContainer.querySelectorAll('.item-row');
        const removeButtons = itemsContainer.querySelectorAll('.remove-item-btn');
        
        if (rows.length === 1) {
            removeButtons.forEach(btn => btn.style.display = 'none');
        } else {
            removeButtons.forEach(btn => btn.style.display = '');
        }
    }

    /**
     * Updates the visual item number (e.g., "Item 1", "Item 2") for all rows.
     * This is called after adding or removing a row.
     */
    function updateItemNumbers() {
        const rows = itemsContainer.querySelectorAll('.item-row');
        rows.forEach((row, index) => {
            row.querySelector('.item-number').textContent = index + 1;
        });
    }

    /**
     * Re-indexes all form inputs within the item rows after a deletion.
     * This is CRITICAL for form submission, as the server expects a zero-based,
     * sequential array of items (e.g., items[0], items[1], items[2]).
     */
    function reindexItems() {
        const rows = itemsContainer.querySelectorAll('.item-row');
        rows.forEach((row, newIndex) => {
            row.dataset.rowIndex = newIndex;
            
            row.querySelectorAll('input, select').forEach(input => {
                if (input.name) {
                    input.name = input.name.replace(/\[\d+\]/, `[${newIndex}]`);
                }
                if (input.id && input.id.includes('weightTypeHidden')) {
                    input.id = `weightTypeHidden${newIndex}`;
                }
            });
            
            const weightTypeSelect = row.querySelector('.weight-type-select');
            if (weightTypeSelect) {
                weightTypeSelect.dataset.index = newIndex;
            }
        });
    }

    /**
     * Calculates the live price for a single item row based on its inputs.
     * Formula: (Weight * GramPrice * Quantity) * (1 - PercentDiscount)
     * @param {HTMLElement} row - The item row to calculate the price for.
     */
    function calculateItemPrice(row) {
        const metalType = row.dataset.metalType;
        const weight = parseFloat(row.querySelector('.weight-input').value) || 0;
        const quantity = parseInt(row.querySelector('.quantity-input').value) || 1;
        const percent = parseFloat(row.querySelector('.percent-input').value) || 0;
        
        const goldGramPrice = parseFloat(card.dataset.goldGramNzd) || 0;
        const silverGramPrice = parseFloat(card.dataset.silverGramNzd) || 0;
        
        let basePrice = 0;
        if (metalType === 'Gold') {
            basePrice = weight * goldGramPrice * quantity;
        } else if (metalType === 'Silver') {
            basePrice = weight * silverGramPrice * quantity;
        }
        
        let finalPrice = basePrice * (1 - (percent / 100));
        finalPrice = Math.max(0, finalPrice); // Ensure price is not negative
        
        row.querySelector('.live-price').textContent = finalPrice.toFixed(2);
        updateGrandTotal(); // Trigger a grand total update after each item calculation.
    }

    /**
     * A utility function to loop through all item rows and recalculate their prices.
     * This is typically called after fetching new spot prices.
     */
    function updateAllItemPrices() {
        const rows = itemsContainer.querySelectorAll('.item-row');
        rows.forEach(row => calculateItemPrice(row));
    }

    /**
     * Calculates and updates the grand total by summing up all individual item prices.
     */
    function updateGrandTotal() {
        const livePrices = itemsContainer.querySelectorAll('.live-price');
        let total = 0;
        
        livePrices.forEach(priceSpan => {
            total += parseFloat(priceSpan.textContent) || 0;
        });
        
        document.getElementById('grand-total').textContent = total.toFixed(2);
    }

    // --- INITIALIZATION ---
    // Perform an initial calculation of all item prices and the grand total on page load.
    updateAllItemPrices();
    updateRemoveButtonVisibility();
});
