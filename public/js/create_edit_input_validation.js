/**
 * @file Client-side validation for the admin create/edit quote form.
 * @description This script ensures that the form is not submitted unless key validation rules are met.
 *              It checks for the following:
 *              1. At least one contact method (mobile or email) is provided for the customer.
 *              2. For each item row that is partially filled, all fields in that row must be completed.
 *              If validation fails, the form submission is prevented, and appropriate error messages are displayed.
 */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('admin-create-edit-form');
    if (!form) return;

    const mobileInput = document.getElementById('mobile');
    const emailInput = document.getElementById('email');
    const mobileError = document.getElementById('mobile-error');
    const emailError = document.getElementById('email-error');

    form.addEventListener('submit', (event) => {
        let isContactValid = validateContactInfo();
        let areItemsValid = validateItems();

        if (!isContactValid || !areItemsValid) {
            event.preventDefault(); // Stop form submission
            // Re-enable the submit button if validation fails
            const submitButton = form.querySelector('button[type="submit"]');
            const spinner = submitButton.querySelector('.spinner-border');
            spinner.classList.add('d-none');
            submitButton.disabled = false;
        }
    });

    function validateContactInfo() {
        const mobile = mobileInput.value.trim();
        const email = emailInput.value.trim();
        
        // Reset validation states
        mobileInput.classList.remove('is-invalid');
        emailInput.classList.remove('is-invalid');
        mobileError.textContent = '';
        emailError.textContent = '';
        
        if (!mobile && !email) {
            mobileInput.classList.add('is-invalid');
            emailInput.classList.add('is-invalid');
            mobileError.textContent = 'Please provide at least one contact method';
            emailError.textContent = 'Please provide at least one contact method';
            return false;
        }
        return true;
    }

    function validateItems() {
        let isValid = true;
        clearItemErrors();
        const itemRows = form.querySelectorAll('.item-row');

        itemRows.forEach((row) => {
            const itemNameInput = row.querySelector('.item-name-input');
            const quantityInput = row.querySelector('.quantity-input');
            const weightTypeSelect = row.querySelector('.weight-type-select');
            const weightInput = row.querySelector('.weight-input');
            const percentInput = row.querySelector('.percent-input');

            const isPartiallyFilled = [itemNameInput.value, quantityInput.value, weightTypeSelect.value, weightInput.value, percentInput.value].some(value => value && value.trim() !== '');

            if (isPartiallyFilled) {
                if (!validateField(itemNameInput, 'Item Name is required.')) isValid = false;
                if (!validateField(quantityInput, 'Quantity is required.')) isValid = false;
                if (!validateField(weightTypeSelect, 'Weight Type is required.')) isValid = false;
                if (!validateField(weightInput, 'Weight is required.')) isValid = false;
            }
        });
        return isValid;
    }

    function validateField(field, errorMessage) {
        if (!field.value || field.value.trim() === '') {
            field.classList.add('is-invalid');
            const errorDiv = field.nextElementSibling;
            if (errorDiv && errorDiv.classList.contains('invalid-feedback')) {
                errorDiv.textContent = errorMessage;
            }
            return false;
        }
        return true;
    }

    function clearItemErrors() {
        const invalidFields = form.querySelectorAll('.item-row .is-invalid');
        invalidFields.forEach(field => {
            field.classList.remove('is-invalid');
            const errorDiv = field.nextElementSibling;
            if (errorDiv && errorDiv.classList.contains('invalid-feedback')) {
                errorDiv.textContent = '';
            }
        });
    }
});
