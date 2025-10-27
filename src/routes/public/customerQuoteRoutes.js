const express = require('express');
const router = express.Router();

const quoteService = require('../../services/quoteService');

// GET /view/:id - The customer-facing view of the quote
router.get('/:id', async (req, res) => {
    try {
        // TODO: Implement customer authentication (e.g., with mobile number)
        const quoteData = await quoteService.getQuoteById(req.params.id);
        if (!quoteData) {
            return res.status(404).send('Quote not found');
        }
        res.render('customer_view_quote', {
            quote: quoteData.quote,
            items: quoteData.items,
        });
    } catch (error) {
        console.error(`Error fetching quote for customer view (ID: ${req.params.id}):`, error);
        res.status(500).send('Server error');
    }
});

module.exports = router;
