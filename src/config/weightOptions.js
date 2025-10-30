/**
 * weightOptions.js
 * 
 * Centralized data source for weight type dropdown options.
 * This ensures consistency between server-rendered and client-rendered item rows.
 * 
 * This file is read by the server and the data is passed to the EJS template.
 * 
 * Each object contains:
 * - value: The gram equivalent for calculations and database storage.
 * - text: The user-friendly display text.
 * - group: The optgroup ('Metric' or 'Imperial/Other').
 */
const weightOptions = [
    // Metric Group
    { value: '1', text: '1g', group: 'Metric' },
    { value: '5', text: '5g', group: 'Metric' },
    { value: '10', text: '10g', group: 'Metric' },
    { value: '20', text: '20g', group: 'Metric' },
    { value: '50', text: '50g', group: 'Metric' },
    { value: '100', text: '100g', group: 'Metric' },
    { value: '500', text: '500g', group: 'Metric' },
    { value: '1000', text: '1 Kgs', group: 'Metric' },
    // Imperial/Other Group
    { value: '0.0', text: 'Half Sovereign', group: 'Imperial/Other' },
    { value: '0', text: 'Sovereign', group: 'Imperial/Other' },
    { value: '1.555175', text: '1/20 oz', group: 'Imperial/Other' },
    { value: '3.11035', text: '1/10 oz', group: 'Imperial/Other' },
    { value: '7.775869', text: '1/4 oz', group: 'Imperial/Other' },
    { value: '15.55175', text: '1/2 oz', group: 'Imperial/Other' },
    { value: '31.1035', text: '1 oz', group: 'Imperial/Other' },
    { value: '62.207', text: '2 oz', group: 'Imperial/Other' },
    { value: '155.5175', text: '5 oz', group: 'Imperial/Other' },
    { value: '311.035', text: '10 oz', group: 'Imperial/Other' }
];

module.exports = weightOptions;
