/**
 * Shared contact validation for quote forms
 * Ensures at least one of mobile or email is provided
 */
function initContactValidation(formId) {
    const form = document.getElementById(formId);
    if (!form) return;

    const mobileInput = document.getElementById('mobile');
    const emailInput = document.getElementById('email');
    const mobileError = document.getElementById('mobile-error');
    const emailError = document.getElementById('email-error');

    if (!mobileInput || !emailInput || !mobileError || !emailError) {
        console.error('Contact validation elements not found');
        return;
    }

    // Validate that at least one of mobile or email is provided
    function validateContactInfo(e) {
        const mobile = mobileInput.value.trim();
        const email = emailInput.value.trim();
        
        // Reset validation states
        mobileInput.classList.remove('is-invalid');
        emailInput.classList.remove('is-invalid');
        mobileError.textContent = '';
        emailError.textContent = '';
        
        // Check if at least one is provided
        if (!mobile && !email) {
            e.preventDefault();
            mobileInput.classList.add('is-invalid');
            emailInput.classList.add('is-invalid');
            mobileError.textContent = 'Please provide at least one contact method';
            emailError.textContent = 'Please provide at least one contact method';
            
            return false;
        }
        
        return true;
    }

    // Attach validation to form submission
    form.addEventListener('submit', validateContactInfo);
}
