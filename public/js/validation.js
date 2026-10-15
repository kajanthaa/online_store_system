/**
 * Client-side Form Validation and DOM Feedback System
 * Practical 01 & 02 Requirement: Client-side validation & DOM updates
 */

const Validator = {
  // Check if string is non-empty
  isRequired(value) {
    return value !== null && value !== undefined && value.toString().trim() !== '';
  },

  // Check valid email format
  isEmail(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  },

  // Check valid phone (7 to 15 digits/characters)
  isPhone(value) {
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return phoneRegex.test(value.trim());
  },

  // Check positive number
  isPositiveNumber(value) {
    const num = Number(value);
    return !isNaN(num) && num >= 0;
  },

  // Mock Card Number (16 digits test)
  isValidCardNumber(value) {
    const clean = value.replace(/\s+/g, '');
    return /^\d{12,19}$/.test(clean);
  },

  // Mock CVV (3 or 4 digits)
  isValidCVV(value) {
    return /^\d{3,4}$/.test(value.trim());
  },

  // Set field error state in DOM
  showError(inputElement, errorMessage) {
    inputElement.classList.add('is-invalid');
    const parent = inputElement.closest('.form-group') || inputElement.parentElement;
    let errorElem = parent.querySelector('.error-feedback');
    if (!errorElem) {
      errorElem = document.createElement('div');
      errorElem.className = 'error-feedback';
      parent.appendChild(errorElem);
    }
    errorElem.textContent = errorMessage;
    errorElem.classList.add('visible');
  },

  // Clear field error state in DOM
  clearError(inputElement) {
    inputElement.classList.remove('is-invalid');
    const parent = inputElement.closest('.form-group') || inputElement.parentElement;
    const errorElem = parent.querySelector('.error-feedback');
    if (errorElem) {
      errorElem.textContent = '';
      errorElem.classList.remove('visible');
    }
  },

  // Clear all errors within a form
  clearAllErrors(formElement) {
    const invalids = formElement.querySelectorAll('.is-invalid');
    invalids.forEach(el => el.classList.remove('is-invalid'));
    const feedbacks = formElement.querySelectorAll('.error-feedback');
    feedbacks.forEach(el => {
      el.textContent = '';
      el.classList.remove('visible');
    });
  }
};

// Global toast alert notification
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '⚠'}</span> <div>${message}</div>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
