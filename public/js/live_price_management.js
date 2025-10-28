// Live Price Management JavaScript - Handles fetching and updating spot prices
document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('edit-quote-card') || document.getElementById('create-quote-card');
    const updatePriceBtn = document.getElementById('refresh-price-btn') || document.getElementById('get-live-price-btn');
    const errorDiv = document.getElementById('price-error');
    
    if (!updatePriceBtn) return;

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
                
                document.getElementById('gold-oz-price').textContent = Number(data.gold_ounce_nzd).toFixed(2);
                document.getElementById('gold-g-price').textContent = Number(data.gold_gram_nzd).toFixed(2);
                document.getElementById('silver-oz-price').textContent = Number(data.silver_ounce_nzd).toFixed(2);
                document.getElementById('silver-g-price').textContent = Number(data.silver_gram_nzd).toFixed(2);
                document.getElementById('last-updated').textContent = new Date().toLocaleString();
            } else {
                card.dataset.goldGramNzd = data.spot_price_gold_gram_nzd;
                card.dataset.silverGramNzd = data.spot_price_silver_gram_nzd;
                
                document.getElementById('gold-oz-price').textContent = Number(data.spot_price_gold_ounce_nzd).toFixed(2);
                document.getElementById('gold-g-price').textContent = Number(data.spot_price_gold_gram_nzd).toFixed(2);
                document.getElementById('silver-oz-price').textContent = Number(data.spot_price_silver_ounce_nzd).toFixed(2);
                document.getElementById('silver-g-price').textContent = Number(data.spot_price_silver_gram_nzd).toFixed(2);
                document.getElementById('last-updated').textContent = new Date(data.updated_at).toLocaleString();
            }

            // Dispatch event to notify items section that prices have updated
            const event = new CustomEvent('pricesUpdated', { 
                detail: {
                    gold_gram_nzd: isCreatePage ? data.gold_gram_nzd : data.spot_price_gold_gram_nzd,
                    silver_gram_nzd: isCreatePage ? data.silver_gram_nzd : data.spot_price_silver_gram_nzd
                }
            });
            document.dispatchEvent(event);

        } catch (error) {
            console.error('Error updating prices:', error);
            errorDiv.textContent = 'Error: Could not update live prices. Please try again.';
        } finally {
            updatePriceBtn.disabled = false;
            spinner.classList.add('d-none');
        }
    });
});
