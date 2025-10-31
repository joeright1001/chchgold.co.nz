/**
 * ADMIN CREATE-EDIT JavaScript - Client-Side Functionality
 * 
 * This file provides all interactive functionality for the unified create-edit page:
 * 
 * KEY FUNCTIONS:
 * 1. Contact Validation - Ensures mobile OR email is provided
 * 2. Live Price Management - Fetches and updates metal prices
 * 3. Items Management - Add/remove/calculate item prices dynamically
 * 4. URL Copy - Copy customer URL to clipboard
 * 5. Form Submission - Handle loading states
 * 6. Expire Quote - Confirm and submit expire request
 * 7. Weight Type Management - Handles the logic for weight type selection and data storage.
 * 
 * WORKFLOW:
 * INITIALIZATION:
 * - Detects if in CREATE or EDIT mode based on presence of quote ID
 * - Sets up all event listeners for buttons and form interactions
 * - Calculates initial item prices and grand total
 * 
 * LIVE PRICES:
 * - CREATE mode: Uses /quote/get-live-prices endpoint
 * - EDIT mode: Uses /quote/edit/:id/refresh-price endpoint
 * - Updates display and recalculates all item prices
 * 
 * ITEMS MANAGEMENT:
 * - Add Item: Creates new row with weight type options
 * - Remove Item: Deletes row and reindexes remaining items
 * - Weight Type Change: Auto-fills weight input
 * - Calculate Price: metal_type × weight × quantity × spot_price
 * - Grand Total: Sum of all item prices
 * 
 * WEIGHT TYPE MANAGEMENT (DYNAMIC):
 * - The list of weight options is NOT hardcoded in this file.
 * - It is passed from the server and stored in a global `window.weightOptions` variable.
 * - On page load, the `populateWeightSelect` function reads this global variable and dynamically builds the dropdowns for ALL item rows (both initial and newly added).
 * - This ensures a single source of truth for the options, managed in `src/config/weightOptions.js`.
 * - The `value` of each `<option>` is the gram equivalent, used for calculations and saved to the database.
 * 
 * NOTE: Prices stored in card dataset (data-gold-gram-nzd, data-silver-gram-nzd)
 * NOTE: Item indices must stay sequential for form submission
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('admin-create-edit-form');
    const submitButton = form.querySelector('button[type="submit"]');
    const spinner = submitButton.querySelector('.spinner-border');
    const card = document.getElementById('admin-create-edit-card');
    const quoteId = card.dataset.quoteId;
    const isEditMode = !!quoteId;

    // Initialize contact validation
    initContactValidation('admin-create-edit-form');

    // Handle copy URL button (only in edit mode)
    const copyUrlBtn = document.getElementById('copy-url-btn');
    if (copyUrlBtn) {
        const customerUrlInput = document.getElementById('customer-url');
        copyUrlBtn.addEventListener('click', () => {
            customerUrlInput.select();
            document.execCommand('copy');
            copyUrlBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyUrlBtn.textContent = 'Copy';
            }, 2000);
        });
    }

    // Handle expire form (only in edit mode)
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

    // Handle form submission spinner
    form.addEventListener('submit', () => {
        // Before submitting, update the hidden fields with the latest live prices from the card's dataset
        document.getElementById('hidden-gold-gram-nzd').value = card.dataset.goldGramNzd || 0;
        document.getElementById('hidden-silver-gram-nzd').value = card.dataset.silverGramNzd || 0;

        spinner.classList.remove('d-none');
        submitButton.disabled = true;
    });

    // ===== LIVE PRICE MANAGEMENT =====
    const refreshPriceBtn = document.getElementById('refresh-price-btn');
    const getLivePriceBtn = document.getElementById('get-live-price-btn');
    const priceErrorDiv = document.getElementById('price-error');

    // For edit mode - refresh existing quote prices
    if (refreshPriceBtn) {
        refreshPriceBtn.addEventListener('click', async () => {
            const spinner = refreshPriceBtn.querySelector('.spinner-border');
            refreshPriceBtn.disabled = true;
            spinner.classList.remove('d-none');
            priceErrorDiv.textContent = '';

            try {
                const response = await fetch(`/quote/edit/${quoteId}/refresh-price`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch latest prices from the server.');
                }

                const data = await response.json();

                // Update displayed prices
                document.getElementById('gold-oz-price').textContent = Number(data.spot_price_gold_ounce_nzd).toFixed(2);
                document.getElementById('gold-g-price').textContent = Number(data.spot_price_gold_gram_nzd).toFixed(2);
                document.getElementById('silver-oz-price').textContent = Number(data.spot_price_silver_ounce_nzd).toFixed(2);
                document.getElementById('silver-g-price').textContent = Number(data.spot_price_silver_gram_nzd).toFixed(2);
                document.getElementById('last-updated').textContent = new Date().toLocaleString();

                // Update card dataset for live price calculations
                card.dataset.goldGramNzd = data.spot_price_gold_gram_nzd;
                card.dataset.silverGramNzd = data.spot_price_silver_gram_nzd;

                // Recalculate all item prices
                updateAllItemPrices();

            } catch (error) {
                console.error('Error updating prices:', error);
                priceErrorDiv.textContent = 'Error: Could not update live prices. Please try again.';
            } finally {
                refreshPriceBtn.disabled = false;
                spinner.classList.add('d-none');
            }
        });
    }

    // For create mode - get initial live prices
    if (getLivePriceBtn) {
        getLivePriceBtn.addEventListener('click', async () => {
            const spinner = getLivePriceBtn.querySelector('.spinner-border');
            getLivePriceBtn.disabled = true;
            spinner.classList.remove('d-none');
            priceErrorDiv.textContent = '';

            try {
                const response = await fetch('/quote/get-live-prices');

                if (!response.ok) {
                    throw new Error('Failed to fetch latest prices from the server.');
                }

                const data = await response.json();

                // Update displayed prices
                document.getElementById('gold-oz-price').textContent = Number(data.gold_ounce_nzd).toFixed(2);
                document.getElementById('gold-g-price').textContent = Number(data.gold_gram_nzd).toFixed(2);
                document.getElementById('silver-oz-price').textContent = Number(data.silver_ounce_nzd).toFixed(2);
                document.getElementById('silver-g-price').textContent = Number(data.silver_gram_nzd).toFixed(2);
                document.getElementById('last-updated').textContent = new Date().toLocaleString();

                // Update card dataset for live price calculations
                card.dataset.goldGramNzd = data.gold_gram_nzd;
                card.dataset.silverGramNzd = data.silver_gram_nzd;

                // Recalculate all item prices
                updateAllItemPrices();

            } catch (error) {
                console.error('Error fetching live prices:', error);
                priceErrorDiv.textContent = 'Error: Could not fetch live prices. Please try again.';
            } finally {
                getLivePriceBtn.disabled = false;
                spinner.classList.add('d-none');
            }
        });
    }

    // ===== ITEMS MANAGEMENT =====

    /**
     * Populates a <select> element with weight options from the global window.weightOptions.
     * @param {HTMLSelectElement} selectElement The <select> element to populate.
     * @param {string|null} selectedValue The value to be pre-selected.
     */
    function populateWeightSelect(selectElement, selectedValue = null) {
        // Ensure the global variable exists
        if (!window.weightOptions || !Array.isArray(window.weightOptions)) {
            console.error('weightOptions is not available.');
            return;
        }

        selectElement.innerHTML = ''; // Clear existing options

        const selectOption = document.createElement('option');
        selectOption.value = '';
        selectOption.textContent = 'Select...';
        selectElement.appendChild(selectOption);

        // Group options by their 'group' property
        const groups = window.weightOptions.reduce((acc, option) => {
            (acc[option.group] = acc[option.group] || []).push(option);
            return acc;
        }, {});

        // Create and append optgroups and options
        for (const groupName in groups) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = groupName;
            groups[groupName].forEach(optionData => {
                const option = document.createElement('option');
                option.value = optionData.value;
                option.textContent = optionData.text;
                // Use '==' for comparison because values from HTML can be strings
                if (selectedValue && selectedValue == optionData.value) {
                    option.selected = true;
                }
                optgroup.appendChild(option);
            });
            selectElement.appendChild(optgroup);
        }
    }

    const itemsContainer = document.getElementById('items-container');
    const addItemBtn = document.getElementById('add-item-btn');

    // Initialize - set up event listeners for existing items
    setupItemEventListeners();

    // Populate all existing weight dropdowns on page load, preserving the selected value
    document.querySelectorAll('.weight-type-select').forEach(select => {
        const hiddenInput = select.closest('.item-row').querySelector('.weight-type-hidden');
        const selectedValue = hiddenInput ? hiddenInput.value : null;
        populateWeightSelect(select, selectedValue);
    });

    // Add new item
    addItemBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const currentRows = itemsContainer.querySelectorAll('.item-row');
        const newIndex = currentRows.length;
        
        const newRow = createItemRow(newIndex);
        itemsContainer.appendChild(newRow);
        
        // Show all remove buttons if we have more than one row
        updateRemoveButtonVisibility();
        
        // Update item numbers
        updateItemNumbers();
    });

    function createItemRow(index) {
        const div = document.createElement('div');
        div.className = 'mb-3 p-2 border rounded item-row';
        div.dataset.metalType = 'Gold';
        div.dataset.rowIndex = index;
        
        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="mb-0">Item <span class="item-number">${index + 1}</span></h5>
                <a href="#" class="remove-item-btn text-danger">Remove</a>
            </div>
            <input type="hidden" name="items[${index}][id]" value="" class="item-id-input">
            <input type="hidden" name="items[${index}][weightType]" id="weightTypeHidden${index}" value="" class="weight-type-hidden">
            <div class="item-details-row align-items-center">
                <div class="col-item-name">
                    <label class="form-label">Item Name:</label>
                    <input type="text" class="form-control item-name-input" name="items[${index}][name]" value="">
                </div>
                <div class="col-metal-type">
                    <label class="form-label">Metal Type:</label>
                    <select class="form-select metal-type-select" name="items[${index}][metalType]">
                        <option value="Gold" selected>Gold</option>
                        <option value="Silver">Silver</option>
                    </select>
                </div>
                <div class="col-qty">
                    <label class="form-label">Qty:</label>
                    <input type="number" class="form-control quantity-input" name="items[${index}][quantity]" value="1" min="1">
                </div>
                <div class="col-percent">
                    <label class="form-label">%:</label>
                    <input type="number" class="form-control percent-input" name="items[${index}][percent]" value="" step="0.01" min="0">
                </div>
                <div class="col-weight-type">
                    <label class="form-label">Weight Type:</label>
                    <select class="form-select weight-type-select" data-index="${index}"></select>
                </div>
                <div class="col-weight">
                    <label class="form-label">Weight (g):</label>
                    <input type="number" class="form-control weight-input" name="items[${index}][weight]" value="" step="any" placeholder="0.0000" min="0">
                </div>
                <div class="col-live-price">
                    <label>Live Price:</label>
                    <p><strong>$<span class="live-price">0.00</span> NZD</strong></p>
                </div>
            </div>
        `;
        
        // Populate the newly created select element using the single source of truth
        const weightTypeSelect = div.querySelector('.weight-type-select');
        populateWeightSelect(weightTypeSelect);

        setupItemRowListeners(div);
        return div;
    }

    function setupItemEventListeners() {
        const rows = itemsContainer.querySelectorAll('.item-row');
        rows.forEach(row => setupItemRowListeners(row));
    }

    function setupItemRowListeners(row) {
        // Remove button
        const removeBtn = row.querySelector('.remove-item-btn');
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            row.remove();
            updateRemoveButtonVisibility();
            updateItemNumbers();
            reindexItems();
            updateAllItemPrices();
        });

        // Metal type change
        const metalTypeSelect = row.querySelector('.metal-type-select');
        metalTypeSelect.addEventListener('change', (e) => {
            row.dataset.metalType = e.target.value;
            calculateItemPrice(row);
        });

        // Weight type change
        const weightTypeSelect = row.querySelector('.weight-type-select');
        weightTypeSelect.addEventListener('change', (e) => {
            const weightInput = row.querySelector('.weight-input');
            const weightTypeHidden = row.querySelector('.weight-type-hidden');
            
            const selectedWeight = e.target.value;
            weightInput.value = selectedWeight;
            
            // The 'weight_type' saved to the database is the gram value from the dropdown.
            // This value is used by `customer_view_quote.ejs` to look up the display text
            // in its `weightTypeMap`. This ensures that the admin panel uses grams for
            // calculations, while the customer sees a user-friendly description.
            weightTypeHidden.value = selectedWeight;
            
            calculateItemPrice(row);
        });

        // Weight input change
        const weightInput = row.querySelector('.weight-input');
        weightInput.addEventListener('input', () => {
            calculateItemPrice(row);
        });

        // Quantity change
        const quantityInput = row.querySelector('.quantity-input');
        quantityInput.addEventListener('input', () => {
            calculateItemPrice(row);
        });

        // Percent change
        const percentInput = row.querySelector('.percent-input');
        percentInput.addEventListener('input', () => {
            calculateItemPrice(row);
        });
    }

    function updateRemoveButtonVisibility() {
        const rows = itemsContainer.querySelectorAll('.item-row');
        const removeButtons = itemsContainer.querySelectorAll('.remove-item-btn');
        
        if (rows.length === 1) {
            removeButtons.forEach(btn => btn.style.display = 'none');
        } else {
            removeButtons.forEach(btn => btn.style.display = '');
        }
    }

    function updateItemNumbers() {
        const rows = itemsContainer.querySelectorAll('.item-row');
        rows.forEach((row, index) => {
            const itemNumber = row.querySelector('.item-number');
            itemNumber.textContent = index + 1;
        });
    }

    function reindexItems() {
        const rows = itemsContainer.querySelectorAll('.item-row');
        rows.forEach((row, newIndex) => {
            row.dataset.rowIndex = newIndex;
            
            // Update all input names
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

    function calculateItemPrice(row) {
        const metalType = row.dataset.metalType;
        const weightInput = row.querySelector('.weight-input');
        const quantityInput = row.querySelector('.quantity-input');
        const percentInput = row.querySelector('.percent-input');
        const livePriceSpan = row.querySelector('.live-price');
        
        const weight = parseFloat(weightInput.value) || 0;
        const quantity = parseInt(quantityInput.value) || 1;
        const percent = parseFloat(percentInput.value) || 0;
        
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
        
        livePriceSpan.textContent = finalPrice.toFixed(2);
        updateGrandTotal();
    }

    function updateAllItemPrices() {
        const rows = itemsContainer.querySelectorAll('.item-row');
        rows.forEach(row => calculateItemPrice(row));
    }

    function updateGrandTotal() {
        const livePrices = itemsContainer.querySelectorAll('.live-price');
        let total = 0;
        
        livePrices.forEach(priceSpan => {
            total += parseFloat(priceSpan.textContent) || 0;
        });
        
        document.getElementById('grand-total').textContent = total.toFixed(2);
    }

    // Initial calculation
    updateAllItemPrices();
});
