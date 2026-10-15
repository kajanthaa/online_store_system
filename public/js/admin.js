/**
 * FreshMart Online Grocery Store - Admin Dashboard Logic (admin.js)
 * Implements:
 * - Authentication & Protected Route Verification (Practical 02)
 * - Products CRUD & Stock Alerts (Practical 01 & 02)
 * - Categories CRUD (Practical 01)
 * - Customers Management (Practical 01)
 * - Orders & Payment Workflow Verification (Practical 01 & 02)
 * - Sales Reports & Analytics (Practical 02)
 * - Client-side form validation (Practical 01)
 */

$(document).ready(function () {
  let categoriesCache = [];
  let allAdminProducts = [];

  // Check Admin Authentication First (Practical 02 Protected Route)
  checkAuth();

  function checkAuth() {
    $.get('/api/auth/me')
      .done(function (res) {
        if (!res.authenticated) {
          window.location.href = '/login';
          return;
        }
        $('#adminUsername').text(res.user.username);
        initAdmin();
      })
      .fail(function () {
        window.location.href = '/login';
      });
  }

  function initAdmin() {
    bindTabs();
    bindModals();
    bindForms();
    bindLogout();

    // Initial Data Fetch
    loadCategories();
    loadDashboardReports();
    loadProducts();
    loadOrders();
    loadCustomers();
  }

  // 1. Tab Navigation
  function bindTabs() {
    $('.sidebar-link').on('click', function () {
      $('.sidebar-link').removeClass('active');
      $(this).addClass('active');

      const targetTab = $(this).data('tab');
      $('.admin-tab-pane').hide();
      $(`#${targetTab}`).fadeIn(200);

      const titleMap = {
        'tab-overview': 'Executive Dashboard & Sales Analytics',
        'tab-products': 'Product Catalog & Inventory CRUD',
        'tab-categories': 'Product Categories Management',
        'tab-orders': 'Customer Orders & Transaction History',
        'tab-customers': 'Customer Directory'
      };
      $('#pageTitle').text(titleMap[targetTab] || 'Admin Dashboard');

      if (targetTab === 'tab-overview') loadDashboardReports();
      if (targetTab === 'tab-products') loadProducts();
      if (targetTab === 'tab-categories') loadCategories();
      if (targetTab === 'tab-orders') loadOrders();
      if (targetTab === 'tab-customers') loadCustomers();
    });
  }

  // 2. Logout Handler
  function bindLogout() {
    $('#logoutBtn').on('click', function () {
      if (confirm('Are you sure you want to sign out?')) {
        $.post('/api/auth/logout', function () {
          showToast('Signed out successfully.');
          setTimeout(() => { window.location.href = '/login'; }, 400);
        });
      }
    });
  }

  // 3. Reports & Analytics (Practical 02)
  function loadDashboardReports() {
    $.get('/api/reports/dashboard')
      .done(function (res) {
        if (!res.success) return;
        const { summary, categorySales, topProducts, lowStockProducts } = res.data;

        // Metric Cards
        $('#statRevenue').text('Rs. ' + summary.totalRevenue);
        $('#statOrders').text(summary.totalOrders);
        $('#statProducts').text(summary.totalProducts);
        $('#statLowStock').text(summary.lowStockCount);

        // Render Category Sales Progress Bars
        const catContainer = $('#categorySalesContainer');
        catContainer.empty();
        if (categorySales.length === 0) {
          catContainer.html('<p style="color: #6b7280;">No sales recorded yet.</p>');
        } else {
          const maxSales = Math.max(...categorySales.map(c => Number(c.total_sales)), 1);
          categorySales.forEach(cat => {
            const pct = Math.round((Number(cat.total_sales) / maxSales) * 100);
            catContainer.append(`
              <div class="progress-container">
                <div class="progress-header">
                  <span>${escapeHtml(cat.category_name)} (${cat.total_qty_sold} sold)</span>
                  <span>Rs. ${Number(cat.total_sales).toFixed(2)}</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${pct}%;"></div>
                </div>
              </div>
            `);
          });
        }

        // Top 5 Products Table
        const topTable = $('#topProductsTableBody');
        topTable.empty();
        if (topProducts.length === 0) {
          topTable.html('<tr><td colspan="3" style="text-align:center; color:#6b7280;">No sales data available.</td></tr>');
        } else {
          topProducts.forEach(p => {
            topTable.append(`
              <tr>
                <td><strong>${escapeHtml(p.name)}</strong></td>
                <td><span style="font-weight:600; color:var(--primary-hover);">${p.total_sold} units</span></td>
                <td><strong>Rs. ${Number(p.total_revenue).toFixed(2)}</strong></td>
              </tr>
            `);
          });
        }

        // Low Stock Alerts Table (Practical 02)
        const stockTable = $('#stockAlertsTableBody');
        stockTable.empty();
        if (lowStockProducts.length === 0) {
          stockTable.html('<tr><td colspan="5" style="text-align:center; color:#10b981; font-weight:600;">✓ All items are well stocked!</td></tr>');
        } else {
          lowStockProducts.forEach(p => {
            const isOut = p.stock <= 0;
            stockTable.append(`
              <tr>
                <td><strong>${escapeHtml(p.name)}</strong></td>
                <td>${escapeHtml(p.category_name || '-')}</td>
                <td><span style="font-weight: 700; color: ${isOut ? 'var(--danger)' : 'var(--warning)'};">${p.stock} ${p.unit || ''}</span></td>
                <td>
                  <span class="badge-stock ${isOut ? 'badge-out-stock' : 'badge-low-stock'}">
                    ${isOut ? 'Out of Stock' : 'Low Stock Warning'}
                  </span>
                </td>
                <td>
                  <button class="action-btn btn-edit btn-quick-restock" data-id="${p.id}" data-name="${escapeHtml(p.name)}" data-stock="${p.stock}">
                    + Quick Restock
                  </button>
                </td>
              </tr>
            `);
          });

          // Quick restock click handler
          $('.btn-quick-restock').off('click').on('click', function () {
            const id = $(this).data('id');
            const name = $(this).data('name');
            const currentStock = $(this).data('stock');
            const addQty = prompt(`Quick Restock for "${name}" (Current: ${currentStock}). Enter quantity to add:`, "25");
            if (addQty && !isNaN(addQty) && Number(addQty) > 0) {
              const newTotalStock = Number(currentStock) + Number(addQty);
              // Fetch full product first to keep existing fields
              $.get(`/api/products/${id}`, function (res) {
                if (res.success) {
                  const prod = res.data;
                  $.ajax({
                    url: `/api/products/${id}`,
                    method: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify({
                      name: prod.name,
                      category_id: prod.category_id,
                      price: prod.price,
                      stock: newTotalStock,
                      unit: prod.unit
                    }),
                    success: function () {
                      showToast(`Restocked "${name}"! New stock: ${newTotalStock}`);
                      loadDashboardReports();
                      loadProducts();
                    }
                  });
                }
              });
            }
          });
        }
      });
  }

  $('#refreshStockAlertsBtn').on('click', loadDashboardReports);

  // 4. Products CRUD (Practical 01 & 02)
  function loadProducts() {
    const search = $('#adminProductSearch').val();
    const category = $('#adminProductCategoryFilter').val();

    let queryParams = $.param({ search, category });

    $.get(`/api/products?${queryParams}`, function (res) {
      if (!res.success) return;
      allAdminProducts = res.data;
      renderAdminProducts(res.data);
    });
  }

  function renderAdminProducts(products) {
    const tbody = $('#adminProductsTableBody');
    tbody.empty();

    if (products.length === 0) {
      tbody.html('<tr><td colspan="7" style="text-align:center; color:#6b7280; padding:2rem;">No products found.</td></tr>');
      return;
    }

    products.forEach(p => {
      let badgeHtml = '';
      if (p.stock <= 0) {
        badgeHtml = `<span class="badge-stock badge-out-stock">Out of Stock</span>`;
      } else if (p.isLowStock) {
        badgeHtml = `<span class="badge-stock badge-low-stock">Low Stock (${p.stock})</span>`;
      } else {
        badgeHtml = `<span class="badge-stock badge-in-stock">In Stock (${p.stock})</span>`;
      }

      const photoHtml = p.image_url 
        ? `<img src="${p.image_url}" alt="${escapeHtml(p.name)}" style="width:44px; height:44px; object-fit:cover; border-radius:6px; border:1px solid #e2e8f0;" onerror="this.src=''; this.parentElement.innerHTML='🧺';">` 
        : `<span style="font-size:1.6rem; display:inline-block; width:44px; text-align:center;">🧺</span>`;

      const row = $(`
        <tr>
          <td>${photoHtml}</td>
          <td>${p.id}</td>
          <td><strong>${escapeHtml(p.name)}</strong></td>
          <td>${escapeHtml(p.category_name || '-')}</td>
          <td><strong>Rs. ${Number(p.price).toFixed(2)}</strong></td>
          <td>${p.stock} <span style="font-size:0.75rem; color:#6b7280;">${p.unit || ''}</span></td>
          <td>${badgeHtml}</td>
          <td>
            <button class="action-btn btn-edit btn-edit-product" data-id="${p.id}">Edit</button>
            <button class="action-btn btn-delete btn-delete-product" data-id="${p.id}" data-name="${escapeHtml(p.name)}">Delete</button>
          </td>
        </tr>
      `);

      tbody.append(row);
    });

    // Bind Edit & Delete Product buttons
    $('.btn-edit-product').on('click', function () {
      const id = $(this).data('id');
      editProduct(id);
    });

    $('.btn-delete-product').on('click', function () {
      const id = $(this).data('id');
      const name = $(this).data('name');
      deleteProduct(id, name);
    });
  }

  // Filter & Search handlers for Admin Products
  let prodSearchTimer;
  $('#adminProductSearch').on('input', function () {
    clearTimeout(prodSearchTimer);
    prodSearchTimer = setTimeout(loadProducts, 300);
  });
  $('#adminProductCategoryFilter').on('change', loadProducts);

  function editProduct(id) {
    const p = allAdminProducts.find(item => item.id === id);
    if (!p) return;

    $('#productModalTitle').text('Edit Product');
    $('#prodEditId').val(p.id);
    $('#prodName').val(p.name);
    $('#prodCategory').val(p.category_id || '');
    $('#prodPrice').val(p.price);
    $('#prodStock').val(p.stock);
    $('#prodUnit').val(p.unit || '');
    $('#prodImageUrl').val(p.image_url || '');
    $('#prodImageFile').val('');

    if (p.image_url) {
      $('#imagePreview').attr('src', p.image_url);
      $('#imagePreviewContainer').show();
    } else {
      $('#imagePreviewContainer').hide();
    }

    Validator.clearAllErrors(document.getElementById('productForm'));
    openModal('#productModal');
  }

  function deleteProduct(id, name) {
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      $.ajax({
        url: `/api/products/${id}`,
        method: 'DELETE',
        success: function (res) {
          if (res.success) {
            showToast(`Product "${name}" deleted.`);
            loadProducts();
            loadDashboardReports();
          }
        },
        error: function (xhr) {
          const err = xhr.responseJSON ? xhr.responseJSON.message : 'Failed to delete product.';
          showToast(err, 'error');
        }
      });
    }
  }

  // 5. Categories CRUD (Practical 01)
  function loadCategories() {
    $.get('/api/categories', function (res) {
      if (!res.success) return;
      categoriesCache = res.data;

      // Populate Admin category filter dropdown
      const filterSelect = $('#adminProductCategoryFilter');
      filterSelect.find('option:not([value="all"])').remove();

      // Populate Product Form category dropdown
      const formSelect = $('#prodCategory');
      formSelect.empty();
      formSelect.append('<option value="">-- Select Category --</option>');

      categoriesCache.forEach(c => {
        filterSelect.append(`<option value="${c.id}">${escapeHtml(c.name)}</option>`);
        formSelect.append(`<option value="${c.id}">${escapeHtml(c.name)}</option>`);
      });

      // Populate Categories CRUD Table
      renderAdminCategories(res.data);
    });
  }

  function renderAdminCategories(categories) {
    const tbody = $('#adminCategoriesTableBody');
    tbody.empty();

    if (categories.length === 0) {
      tbody.html('<tr><td colspan="4" style="text-align:center; color:#6b7280; padding:2rem;">No categories found.</td></tr>');
      return;
    }

    categories.forEach(c => {
      const row = $(`
        <tr>
          <td>${c.id}</td>
          <td><strong>${escapeHtml(c.name)}</strong></td>
          <td><span style="font-weight:600;">${c.product_count || 0} products</span></td>
          <td>
            <button class="action-btn btn-edit btn-edit-category" data-id="${c.id}" data-name="${escapeHtml(c.name)}">Edit</button>
            <button class="action-btn btn-delete btn-delete-category" data-id="${c.id}" data-name="${escapeHtml(c.name)}">Delete</button>
          </td>
        </tr>
      `);
      tbody.append(row);
    });

    $('.btn-edit-category').on('click', function () {
      const id = $(this).data('id');
      const name = $(this).data('name');
      $('#categoryModalTitle').text('Edit Category');
      $('#catEditId').val(id);
      $('#catName').val(name);
      openModal('#categoryModal');
    });

    $('.btn-delete-category').on('click', function () {
      const id = $(this).data('id');
      const name = $(this).data('name');
      if (confirm(`Delete category "${name}"? Products under this category will become unassigned.`)) {
        $.ajax({
          url: `/api/categories/${id}`,
          method: 'DELETE',
          success: function (res) {
            showToast(`Category "${name}" deleted.`);
            loadCategories();
            loadProducts();
          },
          error: function (xhr) {
            const err = xhr.responseJSON ? xhr.responseJSON.message : 'Error deleting category.';
            showToast(err, 'error');
          }
        });
      }
    });
  }

  // 6. Orders & Payments Management (Practical 01 & 02)
  function loadOrders() {
    const status = $('#orderStatusFilter').val();
    $.get(`/api/orders?status=${status}`, function (res) {
      if (!res.success) return;
      renderAdminOrders(res.data);
    });
  }

  $('#orderStatusFilter').on('change', loadOrders);

  function renderAdminOrders(orders) {
    const tbody = $('#adminOrdersTableBody');
    tbody.empty();

    if (orders.length === 0) {
      tbody.html('<tr><td colspan="9" style="text-align:center; color:#6b7280; padding:2rem;">No orders found.</td></tr>');
      return;
    }

    orders.forEach(o => {
      let statusColor = '#3b82f6';
      if (o.status === 'Paid') statusColor = '#10b981';
      if (o.status === 'Completed') statusColor = '#065f46';
      if (o.status === 'Cancelled') statusColor = '#ef4444';

      const row = $(`
        <tr>
          <td><strong>#${o.id}</strong></td>
          <td>
            <strong>${escapeHtml(o.customer_name)}</strong>
            <div style="font-size:0.75rem; color:#6b7280;">${escapeHtml(o.customer_email)}</div>
          </td>
          <td>${o.item_count} items</td>
          <td><strong>Rs. ${Number(o.total).toFixed(2)}</strong></td>
          <td>
            <select class="order-status-select form-control" data-id="${o.id}" style="padding:0.25rem 0.5rem; font-size:0.85rem; font-weight:600; color:${statusColor};">
              <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Paid" ${o.status === 'Paid' ? 'selected' : ''}>Paid</option>
              <option value="Completed" ${o.status === 'Completed' ? 'selected' : ''}>Completed</option>
              <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
          <td>${o.payment_method || 'Sandbox Card'}</td>
          <td><code style="font-size:0.8rem; background:#f1f5f9; padding:0.2rem 0.4rem; border-radius:4px;">${o.payment_reference || 'N/A'}</code></td>
          <td style="font-size:0.8rem; color:#6b7280;">${new Date(o.created_at).toLocaleDateString()}</td>
          <td>
            <button class="action-btn btn-view btn-view-order-details" data-id="${o.id}">View</button>
          </td>
        </tr>
      `);

      tbody.append(row);
    });

    // Bind Status change
    $('.order-status-select').on('change', function () {
      const orderId = $(this).data('id');
      const newStatus = $(this).val();

      $.ajax({
        url: `/api/orders/${orderId}/status`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ status: newStatus }),
        success: function () {
          showToast(`Order #${orderId} marked as ${newStatus}.`);
          loadDashboardReports();
        },
        error: function () {
          showToast('Failed to update status.', 'error');
          loadOrders();
        }
      });
    });

    // Bind View Details
    $('.btn-view-order-details').on('click', function () {
      const orderId = $(this).data('id');
      viewOrderDetails(orderId);
    });
  }

  function viewOrderDetails(orderId) {
    $.get(`/api/orders/${orderId}`, function (res) {
      if (!res.success) return;
      const o = res.data;

      let itemsHtml = o.items.map(i => `
        <div style="display:flex; justify-content:space-between; padding:0.4rem 0; border-bottom:1px solid #f1f5f9;">
          <span>${escapeHtml(i.product_name)} (x${i.qty})</span>
          <strong>Rs. ${(Number(i.price) * i.qty).toFixed(2)}</strong>
        </div>
      `).join('');

      const html = `
        <div style="margin-bottom: 1rem;">
          <h3 style="margin-bottom: 0.5rem; color: var(--primary-dark);">Order #${o.id} Summary</h3>
          <p><strong>Customer:</strong> ${escapeHtml(o.customer_name)} (${escapeHtml(o.customer_email)})</p>
          <p><strong>Phone:</strong> ${escapeHtml(o.customer_phone || 'N/A')}</p>
          <p><strong>Address:</strong> ${escapeHtml(o.customer_address || 'N/A')}</p>
          <p><strong>Status:</strong> <span style="font-weight:700; color:var(--primary);">${o.status}</span></p>
          <p><strong>Payment Method:</strong> ${escapeHtml(o.payment_method || 'Sandbox Card')}</p>
          <p><strong>Transaction Ref:</strong> <code>${o.payment_reference || 'N/A'}</code></p>
        </div>
        <hr style="margin: 0.75rem 0;">
        <h4 style="margin-bottom: 0.5rem;">Ordered Products:</h4>
        ${itemsHtml}
        <div style="display:flex; justify-content:space-between; margin-top: 1rem; font-size: 1.15rem; font-weight:800; color:var(--primary-dark);">
          <span>Total Order Value:</span>
          <span>Rs. ${Number(o.total).toFixed(2)}</span>
        </div>
      `;

      $('#orderDetailsContent').html(html);
      openModal('#orderDetailsModal');
    });
  }

  // 7. Customers Management
  function loadCustomers() {
    $.get('/api/customers', function (res) {
      if (!res.success) return;
      const tbody = $('#adminCustomersTableBody');
      tbody.empty();

      if (res.data.length === 0) {
        tbody.html('<tr><td colspan="6" style="text-align:center; color:#6b7280; padding:2rem;">No customers registered yet.</td></tr>');
        return;
      }

      res.data.forEach(c => {
        tbody.append(`
          <tr>
            <td>${c.id}</td>
            <td><strong>${escapeHtml(c.name)}</strong></td>
            <td>${escapeHtml(c.email)}</td>
            <td>${escapeHtml(c.phone || '-')}</td>
            <td><span style="font-weight:600;">${c.order_count || 0} orders</span></td>
            <td>
              <button class="action-btn btn-delete btn-delete-customer" data-id="${c.id}" data-name="${escapeHtml(c.name)}">Delete</button>
            </td>
          </tr>
        `);
      });

      $('.btn-delete-customer').on('click', function () {
        const id = $(this).data('id');
        const name = $(this).data('name');
        if (confirm(`Delete customer "${name}"?`)) {
          $.ajax({
            url: `/api/customers/${id}`,
            method: 'DELETE',
            success: function () {
              showToast(`Customer "${name}" deleted.`);
              loadCustomers();
            }
          });
        }
      });
    });
  }

  // 8. Modals & Forms Binding
  function bindModals() {
    $('#openAddProductModalBtn').on('click', function () {
      $('#productModalTitle').text('Add New Product');
      $('#prodEditId').val('');
      $('#productForm')[0].reset();
      $('#prodImageUrl').val('');
      $('#prodImageFile').val('');
      $('#imagePreviewContainer').hide();
      $('#imagePreview').attr('src', '');
      Validator.clearAllErrors(document.getElementById('productForm'));
      openModal('#productModal');
    });

    $('#closeProductModalBtn').on('click', () => closeModal('#productModal'));

    // Image preview when file is selected
    $('#prodImageFile').on('change', function () {
      const file = this.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          $('#imagePreview').attr('src', e.target.result);
          $('#imagePreviewContainer').show();
        };
        reader.readAsDataURL(file);
      }
    });

    // Image preview when URL is typed
    $('#prodImageUrl').on('input', function () {
      const val = $(this).val().trim();
      if (val) {
        $('#imagePreview').attr('src', val);
        $('#imagePreviewContainer').show();
      }
    });

    $('#openAddCategoryModalBtn').on('click', function () {
      $('#categoryModalTitle').text('Add New Category');
      $('#catEditId').val('');
      $('#categoryForm')[0].reset();
      Validator.clearAllErrors(document.getElementById('categoryForm'));
      openModal('#categoryModal');
    });

    $('#closeCategoryModalBtn').on('click', () => closeModal('#categoryModal'));
    $('#closeOrderDetailsBtn').on('click', () => closeModal('#orderDetailsModal'));
  }

  function bindForms() {
    // Product Form Submit with Picture Upload (FormData)
    $('#productForm').on('submit', function (e) {
      e.preventDefault();
      Validator.clearAllErrors(this);

      const editId = $('#prodEditId').val();
      const nameInput = document.getElementById('prodName');
      const catInput = document.getElementById('prodCategory');
      const priceInput = document.getElementById('prodPrice');
      const stockInput = document.getElementById('prodStock');
      const unitInput = document.getElementById('prodUnit');
      const imageFileInput = document.getElementById('prodImageFile');
      const imageUrlInput = document.getElementById('prodImageUrl');

      let isValid = true;

      if (!Validator.isRequired(nameInput.value)) {
        Validator.showError(nameInput, 'Product name is required.');
        isValid = false;
      }

      if (!Validator.isRequired(catInput.value)) {
        Validator.showError(catInput, 'Please select a category.');
        isValid = false;
      }

      if (!Validator.isPositiveNumber(priceInput.value)) {
        Validator.showError(priceInput, 'Please enter a valid price (>= 0).');
        isValid = false;
      }

      if (!Validator.isPositiveNumber(stockInput.value)) {
        Validator.showError(stockInput, 'Please enter a valid stock quantity (>= 0).');
        isValid = false;
      }

      if (!isValid) return;

      const saveBtn = $('#saveProductBtn');
      saveBtn.prop('disabled', true).text('Saving product with image...');

      // Build FormData for multipart upload
      const formData = new FormData();
      formData.append('name', nameInput.value.trim());
      formData.append('category_id', catInput.value);
      formData.append('price', parseFloat(priceInput.value));
      formData.append('stock', parseInt(stockInput.value));
      formData.append('unit', unitInput.value.trim() || 'kg');

      if (imageFileInput.files && imageFileInput.files[0]) {
        formData.append('image', imageFileInput.files[0]);
      }
      if (imageUrlInput.value && imageUrlInput.value.trim()) {
        formData.append('image_url', imageUrlInput.value.trim());
      }

      const url = editId ? `/api/products/${editId}` : '/api/products';
      const method = editId ? 'PUT' : 'POST';

      $.ajax({
        url,
        method,
        processData: false,
        contentType: false,
        data: formData,
        success: function (res) {
          saveBtn.prop('disabled', false).text('Save Product');
          showToast(res.message || 'Product saved successfully!');
          closeModal('#productModal');
          loadProducts();
          loadDashboardReports();
        },
        error: function (xhr) {
          saveBtn.prop('disabled', false).text('Save Product');
          const err = xhr.responseJSON ? xhr.responseJSON.message : 'Failed to save product.';
          showToast(err, 'error');
        }
      });
    });

    // Category Form Submit (Create or Update)
    $('#categoryForm').on('submit', function (e) {
      e.preventDefault();
      Validator.clearAllErrors(this);

      const editId = $('#catEditId').val();
      const nameInput = document.getElementById('catName');

      if (!Validator.isRequired(nameInput.value)) {
        Validator.showError(nameInput, 'Category name is required.');
        return;
      }

      const payload = { name: nameInput.value.trim() };
      const url = editId ? `/api/categories/${editId}` : '/api/categories';
      const method = editId ? 'PUT' : 'POST';

      $.ajax({
        url,
        method,
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function (res) {
          showToast(res.message || 'Category saved successfully!');
          closeModal('#categoryModal');
          loadCategories();
        },
        error: function (xhr) {
          const err = xhr.responseJSON ? xhr.responseJSON.message : 'Failed to save category.';
          showToast(err, 'error');
        }
      });
    });
  }

  // Helpers
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
