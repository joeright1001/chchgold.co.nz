// Items Management JavaScript - Handles dynamic rows, price calculations, and live price updates
document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('edit-quote-card') || document.getElementById('create-quote-card');
    const container = document.getElementById('items-container');
    const addBtn = document.getElementById('add-item-btn');
    const updatePriceBtn = document.getElementById('refresh-price-btn') || document.getElementById('get-live-price-btn');
    const errorDiv = document.getElementById('price-error');
    
    if (!card || !container || !addBtn) return;
    
    let rowCounter = container.querySelectorAll('.item-row').length;
    let currentPrices = {
        gold_gram_nzd: parseFloat(card.dataset.goldGramNzd) || 0,
        silver_gram_nzd: parseFloat(card.dataset.silverGramNzd) || 0
    };

    // Update all row indices and numbers
    function updateRowIndices() {
        const rows = container.querySelectorAll('.item-row');
        rows.forEach((row, index) => {
            row.dataset.rowIndex = index;
            row.querySelector('.item-number').textContent = index + 1;
            
            row.querySelector('.item-id-input').name = `items[${index}][id]`;
            row.querySelector('.weight-type-hidden').name = `items[${index}][weightType]`;
            row.querySelector('.weight-type-hidden').id = `weightTypeHidden${index}`;
            row.querySelector('.item-name-input').name = `items[${index}][name]`;
            row.querySelector('.metal-type-select').name = `items[${index}][metalType]`;
            row.querySelector('.quantity-input').name = `items[${index}][quantity]`;
            row.querySelector('.percent-input').name = `items[${index}][percent]`;
            row.querySelector('.weight-input').name = `items[${index}][weight]`;
            row.querySelector('.weight-type-select').dataset.index = index;
        });
        
        updateRemoveButtons();
    }

    // Show/hide remove buttons based on row count
    function updateRemoveButtons() {
        const rows = container.querySelectorAll('.item-row');
        const removeButtons = container.querySelectorAll('.remove-item-btn');
        
        if (rows.length === 1) {
            removeButtons.forEach(btn => btn.style.display = 'none');
        } else {
            removeButtons.forEach(btn => btn.style.display = 'inline-block');
        }
    }

    // Calculate live prices for all items
    function updateLivePrices() {
        let grandTotal = 0;
        document.querySelectorAll('.item-row').forEach(row => {
            const weightInput = row.querySelector('.weight-input');
            const percentInput = row.querySelector('.percent-input');
            const quantityInput = row.querySelector('.quantity-input');
            const livePriceSpan = row.querySelector('.live-price');
            const metalTypeSelect = row.querySelector('.metal-type-select');
            
            const metalType = metalTypeSelect.value;
            const weight = parseFloat(weightInput.value) || 0;
            const percent = parseFloat(percentInput.value) || 0;
            const quantity = parseInt(quantityInput.value) || 1;

            row.dataset.metalType = metalType;

            let basePrice = 0;
            if (metalType === 'Gold') {
                basePrice = weight * currentPrices.gold_gram_nzd;
            } else if (metalType === 'Silver') {
                basePrice = weight * currentPrices.silver_gram_nzd;
            }
            
            const finalPrice = basePrice * quantity * (1 - (percent / 100));
            livePriceSpan.textContent = finalPrice.toFixed(2);
            grandTotal += finalPrice;
        });

        const grandTotalElement = document.getElementById('grand-total');
        if (grandTotalElement) {
            grandTotalElement.textContent = grandTotal.toFixed(2);
        }
    }

    // Add new item row
    addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const newRow = document.createElement('div');
        newRow.className = 'mb-3 p-2 border rounded item-row';
        newRow.dataset.metalType = 'Gold';
        newRow.dataset.rowIndex = rowCounter;
        
        newRow.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="mb-0">Item <span class="item-number">${rowCounter + 1}</span></h5>
                <a href="#" class="remove-item-btn text-danger">Remove</a>
            </div>
            <input type="hidden" name="items[${rowCounter}][id]" value="" class="item-id-input">
            <input type="hidden" name="items[${rowCounter}][weightType]" id="weightTypeHidden${rowCounter}" value="" class="weight-type-hidden">
            <div class="item-details-row align-items-center">
            <div class="col-item-name">
                <label class="form-label">Item Name:</label>
                <input type="text" class="form-control item-name-input" name="items[${rowCounter}][name]" value="">
            </div>
            <div class="col-metal-type">
                <label class="form-label">Metal Type:</label>
                <select class="form-select metal-type-select" name="items[${rowCounter}][metalType]">
                    <option value="Gold" selected>Gold</option>
                    <option value="Silver">Silver</option>
                </select>
            </div>
            <div class="col-qty">
                <label class="form-label">Qty:</label>
                <input type="number" class="form-control quantity-input" name="items[${rowCounter}][quantity]" value="1" min="1">
            </div>
            <div class="col-percent">
                <label class="form-label">%:</label>
                <input type="number" class="form-control percent-input" name="items[${rowCounter}][percent]" value="" step="0.01">
            </div>
            <div class="col-weight-type">
                <label class="form-label">Weight Type:</label>
                <select class="form-select weight-type-select" data-index="${rowCounter}">
                    <option value="">Select...</option>
                    <option value="1">1g</option>
                    <option value="5">5g</option>
                    <option value="10">10g</option>
                    <option value="20">20g</option>
                    <option value="50">50g</option>
                    <option value="1.41748">1/20 oz</option>
                    <option value="2.83495">1/10 oz</option>
                    <option value="14.17476">1/2 oz</option>
                    <option value="28.34952">1 oz</option>
                    <option value="56.69904">2 oz</option>
                    <option value="141.7476">5 oz</option>
                    <option value="283.4952">10 oz</option>
                    <option value="1000">1 Kgs</option>
                </select>
            </div>
            <div class="col-weight">
                <label class="form-label">Weight (g):</label>
                <input type="number" class="form-control weight-input" name="items[${rowCounter}][weight]" value="" step="any" placeholder="0.0000">
            </div>
            <div class="col-live-price">
                <label>Live Price:</label>
                <p><strong>$<span class="live-price">0.00</span> NZD</strong></p>
            </div>
            </div>
        `;
        
        container.appendChild(newRow);
        rowCounter++;
        updateRemoveButtons();
        updateLivePrices();
    });

    // Remove item row
    container.addEventListener('click', (e) => {
        if (e.target.closest('.remove-item-btn')) {
            e.preventDefault();
            const row = e.target.closest('.item-row');
            row.remove();
            updateRowIndices();
            updateLivePrices();
        }
    });

    // Handle weight type dropdown selection
    container.addEventListener('change', (e) => {
        if (e.target.classList.contains('weight-type-select')) {
            const row = e.target.closest('.item-row');
            const weightInput = row.querySelector('.weight-input');
            const hiddenWeightType = row.querySelector('.weight-type-hidden');
            const selectedValue = e.target.value;
            
            hiddenWeightType.value = selectedValue;
            
            if (selectedValue) {
                weightInput.value = parseFloat(selectedValue).toFixed(5);
                // Immediately trigger calculation
                updateLivePrices();
            }
        }
        
        // Also trigger on metal type or any other select changes
        if (e.target.matches('.metal-type-select')) {
            updateLivePrices();
        }
    });

    // Listen for ALL input/change events that should trigger price updates
    container.addEventListener('input', (e) => {
        if (e.target.matches('.weight-input, .quantity-input, .percent-input')) {
            updateLivePrices();
        }
    });
    
    // Also listen for keyup to catch all changes immediately
    container.addEventListener('keyup', (e) => {
        if (e.target.matches('.weight-input, .quantity-input, .percent-input')) {
            updateLivePrices();
        }
    });

    // Update Live Price Button
    if (updatePriceBtn) {
        const isCreatePage = !!document.getElementById('get-live-price-btn');
        const quoteId = card?.dataset?.quoteId;

        updatePriceBtn.addEventListener('click', async () => {
            const spinner = updatePriceBtn.querySelector('.spinner-border');

            updatePriceBtn.disabled = true;
            spinner.classList.remove('d-none');
            errorDiv.textContent = '';

            try {
                let response;
                
                if (isCreatePage) {
                    response = await fetch('/quote/get-live-prices');
                } else {
                    response = await fetch(`/quote/edit/${quoteId}/refresh-price`, {
                        method: 'POST',
                    });
                }

                if (!response.ok) {
                    throw new Error('Failed to fetch latest prices from the server.');
                }

                const data = await response.json();
                
                if (isCreatePage) {
                    card.dataset.goldGramNzd = data.gold_gram_nzd;
                    card.dataset.silverGramNzd = data.silver_gram_nzd;
                    currentPrices.gold_gram_nzd = data.gold_gram_nzd;
                    currentPrices.silver_gram_nzd = data.silver_gram_nzd;
                    
                    document.getElementById('gold-oz-price').textContent = Number(data.gold_ounce_nzd).toFixed(2);
                    document.getElementById('gold-g-price').textContent = Number(data.gold_gram_nzd).toFixed(2);
                    document.getElementById('silver-oz-price').textContent = Number(data.silver_ounce_nzd).toFixed(2);
                    document.getElementById('silver-g-price').textContent = Number(data.silver_gram_nzd).toFixed(2);
                    document.getElementById('last-updated').textContent = new Date().toLocaleString();
                } else {
                    card.dataset.goldGramNzd = data.spot_price_gold_gram_nzd;
                    card.dataset.silverGramNzd = data.spot_price_silver_gram_nzd;
                    currentPrices.gold_gram_nzd = data.spot_price_gold_gram_nzd;
                    currentPrices.silver_gram_nzd = data.spot_price_silver_gram_nzd;
                    
                    document.getElementById('gold-oz-price').textContent = Number(data.spot_price_gold_ounce_nzd).toFixed(2);
                    document.getElementById('gold-g-price').textContent = Number(data.spot_price_gold_gram_nzd).toFixed(2);
                    document.getElementById('silver-oz-price').textContent = Number(data.spot_price_silver_ounce_nzd).toFixed(2);
                    document.getElementById('silver-g-price').textContent = Number(data.spot_price_silver_gram_nzd).toFixed(2);
                    document.getElementById('last-updated').textContent = new Date(data.updated_at).toLocaleString();
                }

                updateLivePrices();

            } catch (error) {
                console.error('Error updating prices:', error);
                errorDiv.textContent = 'Error: Could not update live prices. Please try again.';
            } finally {
                updatePriceBtn.disabled = false;
                spinner.classList.add('d-none');
            }
        });
    }

    // Initialize
    updateRemoveButtons();
    updateLivePrices();
});
