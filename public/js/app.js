/**
 * FreshMart Online Grocery Store - Frontend Logic (app.js)
 * Implements:
 * - Dynamic product loading via AJAX (Practical 01)
 * - Category filter & Live search (Practical 01 & 02)
 * - Shopping Cart & DOM updates (Practical 01)
 * - Form Validation (Practical 01)
 * - Payment Workflow & Receipt generation (Practical 02)
 * - jQuery effects & animations (Practical 01)
 */

$(document).ready(function () {
  let cart = JSON.parse(localStorage.getItem('freshmart_cart') || '[]');
  let allProducts = [];
  let selectedCategory = 'all';
  let activePaymentMethod = 'Credit Card';

  // Category Emoji Mapper
  const categoryIcons = {
    'Fresh Fruits': '🍎',
    'Fresh Vegetables': '🥦',
    'Dairy & Eggs': '🥛',
    'Bakery & Bread': '🍞',
    'Beverages': '🧃',
    'Grains & Pulses': '🌾',
    'Snacks & Sweets': '🍪'
  };

  // Initialize
  init();

  function init() {
    loadCategories();
    loadProducts();
    updateCartUI();
    bindEvents();
  }

  // Bind All UI Events
  function bindEvents() {
    // Search input (live AJAX filter)
    let searchTimeout;
    $('#searchInput').on('input', function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadProducts();
      }, 300);
    });

    $('#searchBtn').on('click', function () {
      loadProducts();
    });

    // Sort select
    $('#sortSelect').on('change', function () {
      loadProducts();
    });

    // Cart Modal toggles
    $('#cartBtn').on('click', function () {
      openModal('#cartModal');
    });

    $('#closeCartBtn').on('click', function () {
      closeModal('#cartModal');
    });

    $('#openCheckoutBtn').on('click', function () {
      if (cart.length === 0) {
        showToast('Your cart is empty! Add products first.', 'error');
        return;
      }
      closeModal('#cartModal');
      openModal('#checkoutModal');
      $('#checkoutTotalDisplay').text('Rs. ' + calculateTotal().toFixed(2));
    });

    $('#closeCheckoutBtn').on('click', function () {
      closeModal('#checkoutModal');
    });

    $('#closeReceiptBtn, #continueShoppingBtn').on('click', function () {
      closeModal('#receiptModal');
    });

    $('#printReceiptBtn').on('click', function () {
      window.print();
    });

    // Payment method tab selection (Practical 02)
    $('.pay-tab-btn').on('click', function () {
      $('.pay-tab-btn').removeClass('active');
      $(this).addClass('active');
      activePaymentMethod = $(this).data('method');

      if (activePaymentMethod === 'Credit Card') {
        $('#cardPaymentFields').slideDown(200);
        $('#upiPaymentFields').slideUp(200);
        $('#codPaymentFields').slideUp(200);
      } else if (activePaymentMethod === 'UPI / QR') {
        $('#cardPaymentFields').slideUp(200);
        $('#upiPaymentFields').slideDown(200);
        $('#codPaymentFields').slideUp(200);
      } else {
        $('#cardPaymentFields').slideUp(200);
        $('#upiPaymentFields').slideUp(200);
        $('#codPaymentFields').slideDown(200);
      }
    });

    // Checkout Form Submission (Validation + API calls)
    $('#checkoutForm').on('submit', handleCheckoutSubmit);
  }

  // 1. AJAX: Load Categories
  function loadCategories() {
    $.ajax({
      url: '/api/categories',
      method: 'GET',
      dataType: 'json',
      success: function (res) {
        if (res.success) {
          renderCategoryPills(res.data);
        }
      },
      error: function (err) {
        console.error('Failed to load categories', err);
      }
    });
  }

  function renderCategoryPills(categories) {
    const container = $('#categoryPills');
    container.find('button:not([data-category="all"])').remove();

    categories.forEach(cat => {
      const btn = $(`
        <button class="pill-btn" data-category="${cat.id}">
          ${categoryIcons[cat.name] || '🧺'} ${cat.name}
        </button>
      `);

      btn.on('click', function () {
        $('.pill-btn').removeClass('active');
        $(this).addClass('active');
        selectedCategory = cat.id;
        loadProducts();
      });

      container.append(btn);
    });

    // Re-bind 'All' button
    container.find('[data-category="all"]').off('click').on('click', function () {
      $('.pill-btn').removeClass('active');
      $(this).addClass('active');
      selectedCategory = 'all';
      loadProducts();
    });
  }

  // 2. AJAX: Load Products with Search & Filter
  function loadProducts() {
    const searchVal = $('#searchInput').val();
    const sortVal = $('#sortSelect').val();

    let queryParams = $.param({
      search: searchVal,
      category: selectedCategory,
      sort: sortVal
    });

    // Visual indicator using jQuery
    $('#productGrid').css('opacity', '0.6');

    $.ajax({
      url: `/api/products?${queryParams}`,
      method: 'GET',
      dataType: 'json',
      success: function (res) {
        $('#productGrid').css('opacity', '1');
        if (res.success) {
          allProducts = res.data;
          renderProducts(res.data);
        }
      },
      error: function (err) {
        $('#productGrid').css('opacity', '1');
        showToast('Error loading products from server.', 'error');
      }
    });
  }

  // Render Product Cards via DOM Manipulation
  function renderProducts(products) {
    const grid = $('#productGrid');
    grid.empty();

    if (products.length === 0) {
      grid.html(`
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: #fff; border-radius: 12px; border: 1px solid #e5e7eb;">
          <p style="font-size: 2rem;">🔍</p>
          <h3>No products found</h3>
          <p style="color: #6b7280;">Try adjusting your search or category filter.</p>
        </div>
      `);
      return;
    }

    products.forEach(p => {
      // Determine badge status (Practical 02 Stock Alerts)
      let badgeHtml = '';
      let isOutOfStock = p.stock <= 0;

      if (isOutOfStock) {
        badgeHtml = `<span class="badge-stock badge-out-stock">Out of Stock</span>`;
      } else if (p.isLowStock) {
        badgeHtml = `<span class="badge-stock badge-low-stock">⚠️ Only ${p.stock} left!</span>`;
      } else {
        badgeHtml = `<span class="badge-stock badge-in-stock">In Stock (${p.stock})</span>`;
      }

      const icon = categoryIcons[p.category_name] || '🛒';

      const mediaHtml = p.image_url 
        ? `<div class="product-img-wrapper"><img src="${p.image_url}" alt="${escapeHtml(p.name)}" class="product-img" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'product-icon\\'>${icon}</div>'"></div>`
        : `<div class="product-icon">${icon}</div>`;

      const card = $(`
        <article class="product-card" id="product-${p.id}">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <span class="category-tag">${p.category_name || 'Grocery'}</span>
              ${badgeHtml}
            </div>

            ${mediaHtml}
            <h3 class="product-title">${escapeHtml(p.name)}</h3>
          </div>

          <div>
            <div class="product-meta">
              <div class="product-price">
                Rs. ${Number(p.price).toFixed(2)} <span>/ ${p.unit || 'unit'}</span>
              </div>
            </div>

            <button 
              class="btn-add-cart" 
              ${isOutOfStock ? 'disabled' : ''} 
              data-id="${p.id}"
            >
              ${isOutOfStock ? 'Sold Out' : '+ Add to Cart'}
            </button>
          </div>
        </article>
      `);

      // Add to Cart event handler
      card.find('.btn-add-cart').on('click', function () {
        addToCart(p);
      });

      grid.append(card);
    });

    // Smooth fadeIn animation with jQuery
    grid.hide().fadeIn(250);
  }

  // 3. Cart Management
  function addToCart(product) {
    const existingIndex = cart.findIndex(item => item.id === product.id);

    if (existingIndex > -1) {
      if (cart[existingIndex].qty + 1 > product.stock) {
        showToast(`Cannot add more. Only ${product.stock} in stock!`, 'error');
        return;
      }
      cart[existingIndex].qty += 1;
    } else {
      if (product.stock <= 0) {
        showToast('Sorry, this product is out of stock.', 'error');
        return;
      }
      cart.push({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        unit: product.unit,
        image_url: product.image_url || '',
        stock: product.stock,
        qty: 1
      });
    }

    saveCart();
    updateCartUI();
    showToast(`Added "${product.name}" to cart! 🛒`);
  }

  function updateCartQuantity(productId, delta) {
    const index = cart.findIndex(i => i.id === productId);
    if (index === -1) return;

    const newQty = cart[index].qty + delta;
    if (newQty <= 0) {
      cart.splice(index, 1);
    } else {
      if (newQty > cart[index].stock) {
        showToast(`Maximum available stock reached (${cart[index].stock})`, 'error');
        return;
      }
      cart[index].qty = newQty;
    }

    saveCart();
    updateCartUI();
  }

  function removeFromCart(productId) {
    cart = cart.filter(i => i.id !== productId);
    saveCart();
    updateCartUI();
    showToast('Item removed from cart.');
  }

  function saveCart() {
    localStorage.setItem('freshmart_cart', JSON.stringify(cart));
  }

  function calculateTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }

  // 4. Update Cart DOM UI
  function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    $('#cartBadge').text(totalItems);

    const tbody = $('#cartTableBody');
    tbody.empty();

    if (cart.length === 0) {
      tbody.html(`
        <tr>
          <td colspan="5" style="text-align: center; color: #6b7280; padding: 2rem;">
            Your cart is empty.
          </td>
        </tr>
      `);
      $('#cartTotalDisplay').text('$0.00');
      return;
    }

    cart.forEach(item => {
      const thumbHtml = item.image_url 
        ? `<img src="${item.image_url}" alt="${escapeHtml(item.name)}" style="width:34px; height:34px; object-fit:cover; border-radius:4px; margin-right:8px; vertical-align:middle; border:1px solid #e2e8f0;">` 
        : '';

      const row = $(`
        <tr>
          <td>
            <div style="display:flex; align-items:center;">
              ${thumbHtml}
              <div>
                <strong>${escapeHtml(item.name)}</strong>
                <div style="font-size: 0.75rem; color: #6b7280;">${item.unit || ''}</div>
              </div>
            </div>
          </td>
          <td>Rs. ${item.price.toFixed(2)}</td>
          <td>
            <div class="qty-control">
              <button class="qty-btn btn-minus" data-id="${item.id}">-</button>
              <span style="font-weight: 600; min-width: 20px; text-align: center;">${item.qty}</span>
              <button class="qty-btn btn-plus" data-id="${item.id}">+</button>
            </div>
          </td>
          <td style="font-weight: 600;">Rs. ${(item.price * item.qty).toFixed(2)}</td>
          <td>
            <button class="modal-close-btn btn-remove" data-id="${item.id}" title="Remove">&times;</button>
          </td>
        </tr>
      `);

      row.find('.btn-minus').on('click', () => updateCartQuantity(item.id, -1));
      row.find('.btn-plus').on('click', () => updateCartQuantity(item.id, 1));
      row.find('.btn-remove').on('click', () => removeFromCart(item.id));

      tbody.append(row);
    });

    const total = calculateTotal();
    $('#cartTotalDisplay').text('Rs. ' + total.toFixed(2));
  }

  // 5. Form Validation & Checkout Process
  async function handleCheckoutSubmit(e) {
    e.preventDefault();
    const form = this;
    Validator.clearAllErrors(form);

    const nameInput = document.getElementById('custName');
    const emailInput = document.getElementById('custEmail');
    const phoneInput = document.getElementById('custPhone');
    const addressInput = document.getElementById('custAddress');

    let isValid = true;

    // Validate Customer Details
    if (!Validator.isRequired(nameInput.value)) {
      Validator.showError(nameInput, 'Full name is required.');
      isValid = false;
    }

    if (!Validator.isEmail(emailInput.value)) {
      Validator.showError(emailInput, 'Please enter a valid email address.');
      isValid = false;
    }

    if (!Validator.isRequired(phoneInput.value)) {
      Validator.showError(phoneInput, 'Contact phone number is required.');
      isValid = false;
    }

    if (!Validator.isRequired(addressInput.value)) {
      Validator.showError(addressInput, 'Delivery address is required.');
      isValid = false;
    }

    // Validate Payment Method Fields
    const cardNumInput = document.getElementById('cardNum');
    const cardCvvInput = document.getElementById('cardCvv');
    const upiInput = document.getElementById('upiId');

    if (activePaymentMethod === 'Credit Card') {
      if (!Validator.isValidCardNumber(cardNumInput.value)) {
        Validator.showError(cardNumInput, 'Enter a valid mock card number (12-19 digits).');
        isValid = false;
      }
      if (!Validator.isValidCVV(cardCvvInput.value)) {
        Validator.showError(cardCvvInput, 'Enter a valid 3-digit CVV.');
        isValid = false;
      }
    } else if (activePaymentMethod === 'UPI / QR') {
      if (!upiInput.value.includes('@')) {
        Validator.showError(upiInput, 'Enter a valid UPI ID (e.g. user@okhdfcbank).');
        isValid = false;
      }
    }

    if (!isValid) return;

    // Proceed with Order + Payment API
    const submitBtn = $('#submitOrderBtn');
    submitBtn.prop('disabled', true).text('Processing Order & Sandbox Payment...');

    try {
      // Step A: Create Order
      const orderPayload = {
        customer: {
          name: nameInput.value.trim(),
          email: emailInput.value.trim(),
          phone: phoneInput.value.trim(),
          address: addressInput.value.trim()
        },
        items: cart.map(i => ({ productId: i.id, qty: i.qty }))
      };

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      const orderData = await orderRes.json();

      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to place order.');
      }

      const orderId = orderData.data.orderId;

      // Step B: Process Sandbox Payment (Practical 02 Workflow)
      const paymentPayload = {
        orderId: orderId,
        method: activePaymentMethod,
        cardHolder: nameInput.value.trim(),
        cardNumber: cardNumInput.value,
        cvv: cardCvvInput.value,
        upiId: upiInput.value
      };

      const paymentRes = await fetch('/api/payments/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentPayload)
      });
      const paymentData = await paymentRes.json();

      if (!paymentData.success) {
        throw new Error(paymentData.message || 'Payment simulation failed.');
      }

      // Order Success! Render Receipt
      renderReceipt(paymentData.receipt, cart);

      // Reset cart and reload products to update remaining stock
      cart = [];
      saveCart();
      updateCartUI();
      loadProducts();

      closeModal('#checkoutModal');
      openModal('#receiptModal');
      showToast('Order & Payment successful! 🎉');

    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.prop('disabled', false).text('Confirm & Pay Now 🚀');
    }
  }

  // 6. Render Printable Receipt Modal
  function renderReceipt(receipt, orderedItems) {
    let itemsRows = orderedItems.map(item => `
      <div class="receipt-row">
        <span>${escapeHtml(item.name)} (x${item.qty})</span>
        <span>Rs. ${(item.price * item.qty).toFixed(2)}</span>
      </div>
    `).join('');

    const html = `
      <div class="receipt-header">
        <h3 style="color: var(--primary-dark); font-size: 1.3rem;">FreshMart Official Receipt</h3>
        <p style="font-size: 0.85rem; color: #6b7280;">Thank you for shopping with us!</p>
      </div>

      <div class="receipt-row">
        <strong>Transaction Ref:</strong>
        <span style="font-family: monospace; font-weight: 700; color: #065f46;">${receipt.reference}</span>
      </div>

      <div class="receipt-row">
        <strong>Order ID:</strong>
        <span>#${receipt.orderId}</span>
      </div>

      <div class="receipt-row">
        <strong>Customer:</strong>
        <span>${escapeHtml(receipt.customerName)}</span>
      </div>

      <div class="receipt-row">
        <strong>Email:</strong>
        <span>${escapeHtml(receipt.customerEmail)}</span>
      </div>

      <div class="receipt-row">
        <strong>Payment Method:</strong>
        <span>${escapeHtml(receipt.method)}</span>
      </div>

      <div class="receipt-row">
        <strong>Date & Time:</strong>
        <span>${new Date(receipt.timestamp).toLocaleString()}</span>
      </div>

      <hr style="margin: 0.8rem 0; border: none; border-top: 1px dashed #cbd5e1;">

      <div style="margin-bottom: 0.8rem;">
        <h4 style="font-size: 0.9rem; margin-bottom: 0.4rem; color: #374151;">Items Purchased:</h4>
        ${itemsRows}
      </div>

      <hr style="margin: 0.8rem 0; border: none; border-top: 1px dashed #cbd5e1;">

      <div class="receipt-row" style="font-size: 1.15rem; font-weight: 800; color: #064e3b;">
        <span>Total Paid:</span>
        <span>Rs. ${Number(receipt.amount).toFixed(2)}</span>
      </div>
    `;

    $('#receiptContent').html(html);
  }

  // Modal Helpers
  function openModal(selector) {
    $(selector).css('display', 'flex').hide().fadeIn(200);
  }

  function closeModal(selector) {
    $(selector).fadeOut(200);
  }

  function escapeHtml(text) {
    if (!text) return '';
    return $('<div>').text(text).html();
  }
});
