/* =========================================================
   restro.in – Frontend Controller
   ========================================================= */

/* ---------- Auth State ---------- */
let authToken = localStorage.getItem('restro_token');
let currentUser = null; // { username, role, full_name }

/* ---------- App State ---------- */
let currentFestivalId = 1;
let festivalsData = [];
let forecastData = null;
let currentPoData = null;
let staffCart = []; // [{ id, name, price, qty }]
let staffMenuItems = []; // full menu from API
let staffMenuCategory = 'All';
let kotPollTimer = null;
let calcExpression = '';
let calcResult = '0';

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupVoiceSpeech();
  checkAuthAndInit();
});

async function checkAuthAndInit() {
  if (!authToken) { showLoginOverlay(); return; }
  try {
    const res = await fetch('/api/auth/me', { headers: authHeader() });
    if (!res.ok) { clearAuth(); showLoginOverlay(); return; }
    currentUser = await res.json();
    hideLoginOverlay();
    initAppForRole(currentUser.role);
  } catch {
    showLoginOverlay();
  }
}

function authHeader() {
  return authToken ? { 'Authorization': 'Bearer ' + authToken } : {};
}

function showLoginOverlay() {
  document.getElementById('login-overlay').classList.remove('hidden');
}

function hideLoginOverlay() {
  document.getElementById('login-overlay').classList.add('hidden');
}

function clearAuth() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('restro_token');
  localStorage.removeItem('restro_user');
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.detail || 'Invalid credentials'; return; }
    authToken = data.token;
    currentUser = { username: data.username, role: data.role, full_name: data.full_name };
    localStorage.setItem('restro_token', authToken);
    localStorage.setItem('restro_user', JSON.stringify(currentUser));
    hideLoginOverlay();
    initAppForRole(data.role);
  } catch {
    errEl.textContent = 'Server error. Please try again.';
  }
}

function fillLogin(u, p) {
  document.getElementById('login-username').value = u;
  document.getElementById('login-password').value = p;
}

async function logoutUser() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', headers: authHeader() });
  } catch {}
  clearAuth();
  if (kotPollTimer) clearInterval(kotPollTimer);
  location.reload();
}

function initAppForRole(role) {
  // Show user badge
  const badge = document.getElementById('user-role-badge');
  if (badge) badge.textContent = currentUser ? `${currentUser.full_name} (${role})` : role;

  // Hide tabs based on role
  const allTabs = document.querySelectorAll('.nav-tab');
  allTabs.forEach(tab => {
    const t = tab.dataset.tab;
    if (role === 'kitchen') {
      tab.style.display = (t === 'tab-kot-orders') ? '' : 'none';
    } else if (role === 'manager') {
      tab.style.display = '';
    } else {
      tab.style.display = ''; // admin: all visible
    }
  });

  // If kitchen role, switch to KOT tab immediately
  if (role === 'kitchen') switchTab('tab-kot-orders');

  // Lock profile edit for non-admin
  const profForm = document.getElementById('restaurant-profile-form');
  if (profForm && role !== 'admin') {
    profForm.querySelectorAll('input, select, textarea, button[type="submit"]').forEach(el => el.disabled = true);
  }

  initApp();
}

async function initApp() {
  await loadRestaurantProfile();
  await loadFestivals();
  await loadForecast(currentFestivalId);
  await loadMenuEngineering();
  await loadAnomalies();
  await loadOrdersAndKOT();
  await loadStaffRoster();
  await loadStaffMenu();
  await loadStaffMembers();
  await loadInvoiceHistory();
  loadSampleInvoice();
  startKOTPoll();
}

/* =========================================================
   Tab Navigation
   ========================================================= */
function switchTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });
}

function setupEventListeners() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  document.getElementById('btn-daily-summary')?.addEventListener('click', openDailySummaryModal);
  document.getElementById('btn-reset-demo')?.addEventListener('click', resetDemoData);
  document.getElementById('btn-theme-toggle')?.addEventListener('click', toggleTheme);
  document.getElementById('btn-generate-po')?.addEventListener('click', preparePODispatchModal);
  document.getElementById('btn-dispatch-whatsapp')?.addEventListener('click', dispatchPOWhatsApp);
  document.querySelectorAll("input[name='qr-dish']").forEach(cb => {
    cb.addEventListener('change', updateQROrderTotal);
  });
}

/* =========================================================
   Theme
   ========================================================= */
function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  document.getElementById('theme-icon-sun')?.classList.toggle('hidden', isLight);
  document.getElementById('theme-icon-moon')?.classList.toggle('hidden', !isLight);
}

/* =========================================================
   1. Restaurant Profile
   ========================================================= */
async function loadRestaurantProfile() {
  try {
    const res = await fetch('/api/restaurant', { headers: authHeader() });
    if (res.status === 401) { clearAuth(); showLoginOverlay(); return; }
    const data = await res.json();
    document.getElementById('header-restaurant-title').textContent = `${data.name} • ${data.city}`;
    document.getElementById('header-op-status').textContent = data.operating_status;
    document.getElementById('header-kitchen-status').textContent = data.kitchen_status;
    document.getElementById('header-active-staff').textContent = `${data.active_staff} Staff Clocked In`;
    document.getElementById('kpi-tables').textContent = `${data.active_tables} / ${data.total_tables} Tables`;
    document.getElementById('kpi-workers').textContent = `${data.active_staff} Floor Staff`;
    const fields = ['name','cuisine','tagline','city','address','contact_phone','contact_email','fssai_license','gstin','operating_status','kitchen_status','total_tables','active_tables','active_staff'];
    const ids = ['prof-name','prof-cuisine','prof-tagline','prof-city','prof-address','prof-phone','prof-email','prof-fssai','prof-gstin','prof-op-status','prof-kitchen-status','prof-tables','prof-active-tables','prof-active-staff'];
    fields.forEach((f, i) => {
      const el = document.getElementById(ids[i]);
      if (el) el.value = data[f] ?? '';
    });
  } catch (err) {
    console.error('Failed to load restaurant profile:', err);
  }
}

async function handleProfileSave(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('prof-name').value,
    cuisine: document.getElementById('prof-cuisine').value,
    tagline: document.getElementById('prof-tagline').value,
    city: document.getElementById('prof-city').value,
    address: document.getElementById('prof-address').value,
    contact_phone: document.getElementById('prof-phone').value,
    contact_email: document.getElementById('prof-email').value,
    fssai_license: document.getElementById('prof-fssai').value,
    gstin: document.getElementById('prof-gstin').value,
    operating_status: document.getElementById('prof-op-status').value,
    kitchen_status: document.getElementById('prof-kitchen-status').value,
    total_tables: parseInt(document.getElementById('prof-tables').value),
    active_tables: parseInt(document.getElementById('prof-active-tables').value),
    active_staff: parseInt(document.getElementById('prof-active-staff').value)
  };
  try {
    await fetch('/api/restaurant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(payload)
    });
    showToast('Profile & Operational Status updated successfully!', 'success');
    await loadRestaurantProfile();
  } catch {
    showToast('Error updating profile', 'danger');
  }
}

/* =========================================================
   2. Festivals & AI Stock Forecast
   ========================================================= */
async function loadFestivals() {
  try {
    const res = await fetch('/api/festivals', { headers: authHeader() });
    festivalsData = await res.json();
    const container = document.getElementById('festival-pills-container');
    container.innerHTML = '';
    festivalsData.forEach(fest => {
      const btn = document.createElement('button');
      btn.className = `festival-pill ${fest.id === currentFestivalId ? 'active' : ''}`;
      const lift = Math.round((fest.demand_factor - 1) * 100);
      const liftStr = lift > 0 ? `+${lift}%` : (lift < 0 ? `${lift}%` : '1.0x');
      btn.innerHTML = `<span>${fest.name}</span><span class="badge-tag">${liftStr}</span>`;
      btn.onclick = () => selectFestival(fest.id);
      container.appendChild(btn);
    });
  } catch (err) {
    console.error('Failed to load festivals:', err);
  }
}

async function selectFestival(festId) {
  currentFestivalId = festId;
  document.querySelectorAll('.festival-pill').forEach((pill, idx) => {
    pill.classList.toggle('active', festivalsData[idx] && festivalsData[idx].id === festId);
  });
  await loadForecast(festId);
  await loadStaffRoster();
}

async function loadForecast(festId = 1) {
  try {
    const res = await fetch(`/api/forecast?festival_id=${festId}`, { headers: authHeader() });
    forecastData = await res.json();
    const fest = forecastData.festival;
    const liftPct = Math.round((fest.demand_factor - 1) * 100);
    const liftStr = liftPct > 0 ? `+${liftPct}%` : `${liftPct}%`;
    document.getElementById('context-badge-name').textContent = fest.name;
    document.getElementById('context-reasoning-desc').textContent = fest.reasoning_summary;
    document.getElementById('context-lift-pct').textContent = liftStr;
    document.getElementById('stat-festival-boost').textContent = liftStr;
    document.getElementById('stat-po-cost').textContent = `₹${(forecastData.total_po_cost / 1000).toFixed(1)}k`;
    const tbody = document.getElementById('forecast-table-body');
    tbody.innerHTML = '';
    forecastData.recommendations.forEach(item => {
      const tr = document.createElement('tr');
      const guardClass = item.is_perishable ? 'guard-perishable' : 'guard-bulk';
      const guardLabel = item.is_perishable ? '🛡️ Perishable (2d Max)' : '📦 Bulk EOQ (Discount)';
      const deadStockBadge = item.is_dead_stock
        ? `<div class="dead-stock-flag">⚠️ Dead Stock (${item.days_in_stock}d unsold)</div>` : '';
      const orderBadge = item.recommended_order > 0
        ? `<strong style="color: #EC601C; font-size: 0.95rem;">${item.recommended_order} ${item.unit}</strong>`
        : `<span style="color: var(--ink-muted);">0 (Stock Safe)</span>`;
      tr.innerHTML = `
        <td>
          <div style="font-weight: 600;">${item.name}</div>
          <div style="font-size: 0.75rem; color: var(--ink-secondary);">${item.category} • Preferred: ${item.preferred_supplier}</div>
          ${deadStockBadge}
        </td>
        <td>${item.shelf_life_days} days</td>
        <td><span class="guard-badge ${guardClass}">${guardLabel}</span></td>
        <td><strong>${item.current_stock}</strong> ${item.unit}</td>
        <td>${item.projected_demand} ${item.unit}</td>
        <td>${orderBadge}</td>
        <td>₹${item.estimated_cost.toLocaleString()}</td>
        <td class="reasoning-cell">${item.reasoning}</td>
        <td>
          ${item.recommended_order > 0
            ? `<button class="btn btn-sm btn-outline" onclick="orderSingleItem('${item.name}', ${item.recommended_order}, '${item.unit}', '${item.preferred_supplier}', '${item.supplier_phone}')">Order</button>`
            : `<span style="font-size: 0.75rem; color: var(--ink-muted);">Adequate</span>`}
        </td>`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load forecast:', err);
  }
}

/* =========================================================
   3. Menu Engineering & Wastage Audit
   ========================================================= */
async function loadMenuEngineering() {
  try {
    const res = await fetch('/api/menu-engineering', { headers: authHeader() });
    const data = await res.json();
    document.getElementById('stat-overall-margin').textContent = `${data.summary.overall_margin_percent}%`;
    document.getElementById('kpi-total-sales').textContent = `₹${Math.round(data.summary.total_sales_30d).toLocaleString()}`;
    document.getElementById('kpi-total-profit').textContent = `₹${Math.round(data.summary.total_profit_30d).toLocaleString()}`;
    renderBCGQuadrant('bcg-stars-list', data.quadrants.stars);
    renderBCGQuadrant('bcg-plow-list', data.quadrants.plow_horses);
    renderBCGQuadrant('bcg-puzzle-list', data.quadrants.puzzles);
    renderBCGQuadrant('bcg-dogs-list', data.quadrants.dogs);
  } catch (err) {
    console.error('Failed to load menu engineering:', err);
  }
}

function renderBCGQuadrant(elementId, items) {
  const container = document.getElementById(elementId);
  container.innerHTML = '';
  items.forEach(dish => {
    const div = document.createElement('div');
    div.className = 'bcg-item-row';
    div.innerHTML = `
      <div class="bcg-item-title">${dish.name}</div>
      <div class="bcg-item-metrics">
        <span>Price: ₹${dish.price} (Cost: ₹${dish.cost_of_ingredients})</span>
        <strong style="color: var(--success);">${dish.margin_percent}% Margin</strong>
      </div>
      <div class="bcg-item-action">💡 ${dish.recommended_action}</div>`;
    container.appendChild(div);
  });
}

/* =========================================================
   4. Wastage & Anomaly Audit
   ========================================================= */
async function loadAnomalies() {
  try {
    const res = await fetch('/api/anomalies', { headers: authHeader() });
    const data = await res.json();
    const container = document.getElementById('anomaly-cards-container');
    container.innerHTML = '';
    data.anomalies.forEach(ano => {
      const card = document.createElement('div');
      card.className = 'anomaly-detail-card';
      card.innerHTML = `
        <div class="anomaly-top">
          <h4>${ano.ingredient_name}</h4>
          <span class="badge-danger">+${ano.variance_percent}% Variance • ₹${ano.estimated_loss_inr} Loss</span>
        </div>
        <div class="anomaly-meter" style="margin-bottom: 10px;">
          <div class="meter-bar expected" style="width: 65%;">Recipe Expected: ${ano.expected_consumption}</div>
          <div class="meter-bar leakage" style="width: 35%;">Physical Draw: ${ano.actual_consumption}</div>
        </div>
        <p style="font-size: 0.82rem; color: var(--ink-secondary); line-height: 1.4;">${ano.reasoning}</p>`;
      container.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to load anomalies:', err);
  }
}

/* =========================================================
   5. Live KOT – Real-time Orders
   ========================================================= */
function startKOTPoll() {
  if (kotPollTimer) clearInterval(kotPollTimer);
  kotPollTimer = setInterval(loadOrdersAndKOT, 8000);
}

async function loadOrdersAndKOT() {
  try {
    const res = await fetch('/api/orders', { headers: authHeader() });
    const data = await res.json();
    const container = document.getElementById('kot-tickets-container');
    container.innerHTML = '';
    const badge = document.getElementById('kot-count-badge');
    if (badge) badge.textContent = `${data.orders.length} Active Orders`;

    data.orders.forEach(order => {
      let items;
      try { items = JSON.parse(order.items_json || '[]'); } catch { items = []; }
      const itemsHtml = items.map(it =>
        `<li><strong>${it.qty}x</strong> ${it.name} <span style="color:var(--ink-muted);">(₹${it.price})</span></li>`
      ).join('');

      let tagClass = 'tag-dinein';
      if ((order.channel || '').toLowerCase().includes('swiggy')) tagClass = 'tag-swiggy';
      if ((order.channel || '').toLowerCase().includes('zomato')) tagClass = 'tag-zomato';

      const status = (order.status || 'new').toLowerCase();
      const statusLabels = { new: '🔴 New', preparing: '🟡 Preparing', ready: '🟢 Ready', served: '✅ Served' };
      const statusLabel = statusLabels[status] || status;

      const nextActions = {
        new: [['preparing', 'Mark Preparing']],
        preparing: [['ready', 'Mark Ready']],
        ready: [['served', 'Mark Served']],
        served: []
      };
      const actions = (nextActions[status] || []).map(([s, label]) =>
        `<button class="btn btn-sm btn-outline kot-action-btn" onclick="updateOrderStatus(${order.id}, '${s}')">${label}</button>`
      ).join('');

      const itemsJsonStr = escapeHtml(order.items_json || '[]');

      const ticket = document.createElement('div');
      ticket.className = `kot-ticket kot-status-${status}`;
      ticket.innerHTML = `
        <div class="kot-ticket-header">
          <span>${order.order_number || `ORD-${order.id}`}</span>
          <span class="kot-channel-tag ${tagClass}">${order.channel || 'Dine-In'}</span>
        </div>
        <div class="kot-customer">Guest: ${order.customer_name || 'Walk-in'}</div>
        <div class="kot-status-badge badge-status-${status}">${statusLabel}</div>
        <ul class="kot-items-list">${itemsHtml}</ul>
        <div class="kot-ticket-footer">
          <span>Total: <strong>₹${order.total_amount || 0}</strong></span>
          <span style="color: var(--success); font-weight: 600;">Net: ₹${order.net_profit || 0}</span>
        </div>
        <div class="kot-actions" style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
          ${actions}
          <button class="btn btn-sm btn-outline" onclick="openEditOrderModal(${order.id}, '${itemsJsonStr}')">✏️ Edit Qty</button>
        </div>`;
      container.appendChild(ticket);
    });
  } catch (err) {
    console.error('Failed to load orders:', err);
  }
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ status: newStatus })
    });
    showToast(`Order updated to ${newStatus}`, 'success');
    await loadOrdersAndKOT();
  } catch {
    showToast('Failed to update order status', 'danger');
  }
}

/* ---------- Edit Order Modal ---------- */
function openEditOrderModal(orderId, itemsJsonStr) {
  let items;
  try { items = JSON.parse(itemsJsonStr); } catch { items = []; }
  const modal = document.getElementById('modal-edit-order');
  if (!modal) return;
  modal.dataset.orderId = orderId;
  const list = document.getElementById('edit-order-items-list');
  list.innerHTML = '';
  items.forEach((it, idx) => {
    const row = document.createElement('div');
    row.className = 'edit-order-row';
    row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
    row.innerHTML = `
      <span style="flex:1;">${it.name}</span>
      <button class="btn btn-sm btn-outline" type="button" onclick="editQtyDelta(${idx},-1)">−</button>
      <span id="edit-qty-${idx}" style="min-width:24px;text-align:center;">${it.qty}</span>
      <button class="btn btn-sm btn-outline" type="button" onclick="editQtyDelta(${idx},1)">+</button>
      <span style="color:var(--brand);min-width:60px;text-align:right;">₹<span id="edit-line-${idx}">${(it.qty * it.price).toFixed(2)}</span></span>`;
    row.dataset.price = it.price;
    row.dataset.name = it.name;
    list.appendChild(row);
  });
  recalcEditModal();
  modal.classList.remove('hidden');
}

function editQtyDelta(idx, delta) {
  const qtyEl = document.getElementById(`edit-qty-${idx}`);
  const lineEl = document.getElementById(`edit-line-${idx}`);
  const row = qtyEl.closest('.edit-order-row');
  let qty = parseInt(qtyEl.textContent) + delta;
  if (qty < 0) qty = 0;
  qtyEl.textContent = qty;
  const price = parseFloat(row.dataset.price) || 0;
  lineEl.textContent = (qty * price).toFixed(2);
  recalcEditModal();
}

function recalcEditModal() {
  const list = document.getElementById('edit-order-items-list');
  let total = 0;
  list.querySelectorAll('.edit-order-row').forEach((row, idx) => {
    const qty = parseInt(document.getElementById(`edit-qty-${idx}`)?.textContent || '0');
    const price = parseFloat(row.dataset.price) || 0;
    total += qty * price;
  });
  const totEl = document.getElementById('edit-order-total');
  if (totEl) totEl.textContent = `₹${total.toFixed(2)}`;
}

async function saveOrderQuantityChanges() {
  const modal = document.getElementById('modal-edit-order');
  const orderId = modal.dataset.orderId;
  const list = document.getElementById('edit-order-items-list');
  const items = [];
  list.querySelectorAll('.edit-order-row').forEach((row, idx) => {
    const qty = parseInt(document.getElementById(`edit-qty-${idx}`)?.textContent || '0');
    if (qty > 0) {
      items.push({ name: row.dataset.name, qty, price: parseFloat(row.dataset.price) });
    }
  });
  try {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ items })
    });
    showToast('Order updated successfully!', 'success');
    modal.classList.add('hidden');
    await loadOrdersAndKOT();
  } catch {
    showToast('Failed to update order', 'danger');
  }
}

/* =========================================================
   6. Staff POS Order Builder
   ========================================================= */
async function loadStaffMenu() {
  try {
    const res = await fetch('/api/menu-items', { headers: authHeader() });
    staffMenuItems = await res.json();

    // Populate category pills dynamically
    const cats = ['All', ...new Set(staffMenuItems.map(m => m.category))];
    const pillsContainer = document.getElementById('staff-category-pills');
    if (pillsContainer) {
      pillsContainer.innerHTML = cats.map(c =>
        `<button type="button" class="cat-pill ${c === 'All' ? 'active' : ''}" onclick="setMenuCategory('${c}')">${c}</button>`
      ).join('');
    }
    renderStaffMenuGrid(staffMenuItems);
  } catch (err) {
    console.error('Failed to load staff menu:', err);
  }
}

function renderStaffMenuGrid(items) {
  const grid = document.getElementById('staff-menu-grid');
  if (!grid) return;
  grid.innerHTML = '';
  if (items.length === 0) {
    grid.innerHTML = '<p style="color:var(--ink-muted);padding:14px;">No items found.</p>';
    return;
  }
  items.forEach(item => {
    const tile = document.createElement('div');
    tile.className = 'menu-item-tile';
    tile.onclick = () => addToStaffCart(item.id, item.name, item.price);
    tile.innerHTML = `
      <div class="menu-tile-name">${item.name}</div>
      <div class="menu-tile-cat">${item.category}</div>
      <div class="menu-tile-price">₹${item.price}</div>`;
    grid.appendChild(tile);
  });
}

function setMenuCategory(cat) {
  staffMenuCategory = cat;
  document.querySelectorAll('.cat-pill').forEach(p => {
    p.classList.toggle('active', p.textContent === cat);
  });
  filterStaffMenu();
}

function filterStaffMenu() {
  const search = (document.getElementById('staff-menu-search')?.value || '').toLowerCase();
  const filtered = staffMenuItems.filter(item => {
    const matchCat = staffMenuCategory === 'All' || item.category === staffMenuCategory;
    const matchSearch = !search || item.name.toLowerCase().includes(search) || item.category.toLowerCase().includes(search);
    return matchCat && matchSearch;
  });
  renderStaffMenuGrid(filtered);
}

function addToStaffCart(id, name, price) {
  const existing = staffCart.find(c => c.id === id);
  if (existing) { existing.qty++; }
  else { staffCart.push({ id, name, price, qty: 1 }); }
  renderStaffCart();
  playChime();
}

function updateCartQty(id, delta) {
  const idx = staffCart.findIndex(c => c.id === id);
  if (idx < 0) return;
  staffCart[idx].qty += delta;
  if (staffCart[idx].qty <= 0) staffCart.splice(idx, 1);
  renderStaffCart();
}

function renderStaffCart() {
  const tbody = document.getElementById('staff-cart-body');
  const totalEl = document.getElementById('staff-cart-total-display');
  if (!tbody) return;
  if (staffCart.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--ink-muted); padding: 14px;">Select dishes from menu above to build order</td></tr>';
    if (totalEl) totalEl.textContent = '₹0.00';
    return;
  }
  tbody.innerHTML = '';
  let total = 0;
  staffCart.forEach(item => {
    total += item.price * item.qty;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td style="text-align:center;">
        <button class="btn btn-sm btn-outline" style="padding:2px 6px;" onclick="updateCartQty(${item.id},-1)">−</button>
        <span style="margin:0 6px;">${item.qty}</span>
        <button class="btn btn-sm btn-outline" style="padding:2px 6px;" onclick="updateCartQty(${item.id},1)">+</button>
      </td>
      <td style="text-align:right;">₹${(item.price * item.qty).toFixed(2)}</td>
      <td><button class="btn btn-sm" style="padding:2px 6px;color:var(--danger);" onclick="removeCartItem(${item.id})">✕</button></td>`;
    tbody.appendChild(tr);
  });
  if (totalEl) totalEl.textContent = `₹${total.toFixed(2)}`;
}

function removeCartItem(id) {
  staffCart = staffCart.filter(c => c.id !== id);
  renderStaffCart();
}

async function submitStaffOrder() {
  if (staffCart.length === 0) { showToast('Add items to the order first', 'warning'); return; }
  const table = document.getElementById('staff-order-table')?.value || 'Table 1';
  const customer = document.getElementById('staff-customer-name')?.value || 'Server';
  const payload = {
    channel: `Staff POS (${table})`,
    customer_name: customer,
    table_number: table,
    items: staffCart.map(c => ({ id: c.id, name: c.name, qty: c.qty, price: c.price }))
  };
  try {
    const res = await fetch('/api/orders/create-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    showToast(`🍽️ Order sent to kitchen! ${data.order_number || ''}`, 'success');
    playChime();
    staffCart = [];
    renderStaffCart();
    await loadOrdersAndKOT();
  } catch {
    showToast('Failed to submit order', 'danger');
  }
}

/* =========================================================
   7. Staff Members Table
   ========================================================= */
async function loadStaffMembers() {
  try {
    const res = await fetch('/api/staff-members', { headers: authHeader() });
    const data = await res.json();
    const staffList = data.staff || data;
    const tbodies = document.querySelectorAll('#staff-members-table-body');
    tbodies.forEach(tbody => {
      tbody.innerHTML = '';
      staffList.forEach(s => {
        const effPct = s.efficiency_score || 85;
        const effColor = effPct >= 85 ? 'var(--success)' : effPct >= 65 ? '#F59E0B' : 'var(--danger)';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${s.name}</strong></td>
          <td>${s.role || '—'}</td>
          <td>${s.shift || '—'}</td>
          <td>${s.tasks_completed || 0}</td>
          <td>
            <div style="display:flex;align-items:center;gap:6px;">
              <div style="flex:1;background:rgba(255,255,255,0.1);border-radius:4px;height:6px;overflow:hidden;">
                <div style="width:${effPct}%;height:100%;background:${effColor};border-radius:4px;"></div>
              </div>
              <span style="font-size:0.78rem;color:${effColor};font-weight:600;">${effPct}%</span>
            </div>
          </td>
          <td><span class="badge-tag">${s.status || 'Active'}</span></td>`;
        tbody.appendChild(tr);
      });
    });
  } catch (err) {
    console.error('Failed to load staff members:', err);
  }
}

/* =========================================================
   8. Customer QR Ordering Simulator
   ========================================================= */
function updateQROrderTotal() {
  let total = 0;
  document.querySelectorAll("input[name='qr-dish']:checked").forEach(cb => {
    total += parseFloat(cb.dataset.price || 0);
  });
  document.getElementById('qr-order-total-display').textContent = `₹${total.toFixed(2)}`;
}

async function handleQROrderSubmit(e) {
  e.preventDefault();
  const guestName = document.getElementById('qr-guest-name').value;
  const selectedItems = [];
  document.querySelectorAll("input[name='qr-dish']:checked").forEach(cb => {
    selectedItems.push({ name: cb.value, qty: 1, price: parseFloat(cb.dataset.price) });
  });
  if (selectedItems.length === 0) { showToast('Please select at least one dish', 'warning'); return; }
  try {
    const res = await fetch('/api/orders/create-qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'QR Dine-In (Table 7)', customer_name: guestName, items: selectedItems })
    });
    const data = await res.json();
    showToast(`🛎️ ${data.message}`, 'success');
    playChime();
    await loadOrdersAndKOT();
  } catch {
    showToast('Failed to place QR order', 'danger');
  }
}

/* =========================================================
   9. Smart Staff Scheduling
   ========================================================= */
async function loadStaffRoster() {
  try {
    const festFactor = festivalsData.find(f => f.id === currentFestivalId)?.demand_factor || 1.35;
    const res = await fetch(`/api/staff-roster?factor=${festFactor}`, { headers: authHeader() });
    const data = await res.json();
    document.getElementById('staff-schedule-desc').textContent = data.reasoning;
    document.getElementById('staff-lunch-stat').textContent = `${data.lunch_shift.recommended_staff} Roster (${data.lunch_shift.status})`;
    document.getElementById('staff-dinner-stat').textContent = `${data.dinner_shift.recommended_staff} Roster (${data.dinner_shift.status})`;
  } catch (err) {
    console.error('Failed to load staff roster:', err);
  }
}

/* =========================================================
   10. Invoice Checker & Calculator
   ========================================================= */
async function loadSampleInvoice() {
  try {
    const res = await fetch('/api/invoices/1', { headers: authHeader() });
    if (!res.ok) { populateSampleInvoiceDefaults(); return; }
    const inv = await res.json();
    document.getElementById('inv-supplier').value = inv.supplier_name || '';
    document.getElementById('inv-number').value = inv.invoice_number || '';
    document.getElementById('inv-date').value = inv.invoice_date || '';
    document.getElementById('inv-subtotal').value = inv.subtotal || 0;
    document.getElementById('inv-tax').value = inv.tax_amount || 0;
    document.getElementById('inv-discount').value = inv.discount || 0;
    document.getElementById('inv-grandtotal').value = inv.grand_total || 0;
    const tbody = document.getElementById('invoice-lines-body');
    tbody.innerHTML = '';
    (inv.items || []).forEach(item => addInvoiceLineRow(item));
    runInvoiceAudit();
  } catch {
    populateSampleInvoiceDefaults();
  }
}

function populateSampleInvoiceDefaults() {
  // Pre-populate with 3 sample rows if nothing loaded
  const tbody = document.getElementById('invoice-lines-body');
  if (!tbody || tbody.children.length > 0) return;
  const samples = [
    { item_name: 'Paneer (Fresh)', qty: 10, unit: 'kg', unit_price: 320, line_total: 3200 },
    { item_name: 'Fresh Cream', qty: 5, unit: 'L', unit_price: 180, line_total: 900 },
    { item_name: 'Basmati Rice', qty: 25, unit: 'kg', unit_price: 68, line_total: 1700 },
  ];
  samples.forEach(s => addInvoiceLineRow(s));
  recalcInvoiceTotals();
}

let invoiceLineIndex = 0;
function addInvoiceLineRow(data = {}) {
  const idx = invoiceLineIndex++;
  const tbody = document.getElementById('invoice-lines-body');
  const tr = document.createElement('tr');
  tr.dataset.lineIdx = idx;
  tr.innerHTML = `
    <td><input type="text" class="form-input inv-item-name" value="${data.item_name || ''}" placeholder="Item name" oninput="recalcInvoiceTotals()"></td>
    <td><input type="number" class="form-input inv-item-qty" value="${data.qty || ''}" step="0.01" placeholder="Qty" oninput="autoCalcLineTotal(this)"></td>
    <td><input type="text" class="form-input inv-item-unit" value="${data.unit || ''}" placeholder="kg/L/pcs"></td>
    <td><input type="number" class="form-input inv-item-rate" value="${data.unit_price || ''}" step="0.01" placeholder="Rate" oninput="autoCalcLineTotal(this)"></td>
    <td><input type="number" class="form-input inv-item-total" value="${data.line_total || ''}" step="0.01" placeholder="Total" oninput="recalcInvoiceTotals()"></td>
    <td><span class="flag-pill flag-ok" id="flag-line-${idx}">—</span></td>
    <td><button type="button" class="btn btn-sm" style="color:var(--danger);padding:2px 6px;" onclick="this.closest('tr').remove();recalcInvoiceTotals()">✕</button></td>`;
  tbody.appendChild(tr);
}

function autoCalcLineTotal(inputEl) {
  const tr = inputEl.closest('tr');
  const qty = parseFloat(tr.querySelector('.inv-item-qty').value) || 0;
  const rate = parseFloat(tr.querySelector('.inv-item-rate').value) || 0;
  tr.querySelector('.inv-item-total').value = (qty * rate).toFixed(2);
  recalcInvoiceTotals();
}

function recalcInvoiceTotals() {
  let subtotal = 0;
  document.querySelectorAll('#invoice-lines-body tr').forEach(tr => {
    const total = parseFloat(tr.querySelector('.inv-item-total')?.value) || 0;
    subtotal += total;
  });
  const tax = parseFloat(document.getElementById('inv-tax')?.value) || 0;
  const discount = parseFloat(document.getElementById('inv-discount')?.value) || 0;
  const subEl = document.getElementById('inv-subtotal');
  if (subEl) subEl.value = subtotal.toFixed(2);
  const grandEl = document.getElementById('inv-grandtotal');
  if (grandEl) grandEl.value = (subtotal + tax - discount).toFixed(2);
}

function runInvoiceAudit() {
  const flagsList = document.getElementById('validation-flags-list');
  if (!flagsList) return;
  flagsList.innerHTML = '';
  const flags = [];
  let allOk = true;

  // Check each line: qty * rate == line_total
  document.querySelectorAll('#invoice-lines-body tr').forEach((tr, i) => {
    const qty = parseFloat(tr.querySelector('.inv-item-qty')?.value) || 0;
    const rate = parseFloat(tr.querySelector('.inv-item-rate')?.value) || 0;
    const total = parseFloat(tr.querySelector('.inv-item-total')?.value) || 0;
    const expected = qty * rate;
    const flagEl = document.getElementById(`flag-line-${tr.dataset.lineIdx}`);
    if (Math.abs(expected - total) > 0.01 && total > 0) {
      const f = `Line ${i+1}: Line total ₹${total} ≠ qty×rate ₹${expected.toFixed(2)} (diff: ₹${(total - expected).toFixed(2)})`;
      flags.push({ type: 'error', msg: f });
      if (flagEl) { flagEl.textContent = '❌ Error'; flagEl.className = 'flag-pill flag-error'; }
      allOk = false;
    } else {
      if (flagEl) { flagEl.textContent = '✅ OK'; flagEl.className = 'flag-pill flag-ok'; }
    }
  });

  // Check grand total: subtotal + tax - discount == grand total
  const subtotal = parseFloat(document.getElementById('inv-subtotal')?.value) || 0;
  const tax = parseFloat(document.getElementById('inv-tax')?.value) || 0;
  const discount = parseFloat(document.getElementById('inv-discount')?.value) || 0;
  const grand = parseFloat(document.getElementById('inv-grandtotal')?.value) || 0;
  const calcGrand = subtotal + tax - discount;
  if (Math.abs(calcGrand - grand) > 0.02) {
    flags.push({ type: 'error', msg: `Grand total ₹${grand} ≠ subtotal+tax-discount ₹${calcGrand.toFixed(2)} (diff: ₹${(grand - calcGrand).toFixed(2)})` });
    allOk = false;
  } else {
    flags.push({ type: 'ok', msg: `Grand total ₹${grand} matches calculation ✅` });
  }

  if (allOk && flags.length === 0) {
    flags.push({ type: 'ok', msg: 'All checks passed — invoice is clean ✅' });
  }

  flags.forEach(f => {
    const div = document.createElement('div');
    div.className = `validation-flag flag-${f.type}`;
    div.innerHTML = `<span class="flag-icon">${f.type === 'error' ? '❌' : f.type === 'warning' ? '⚠️' : '✅'}</span> ${escapeHtml(f.msg)}`;
    flagsList.appendChild(div);
  });

  const badge = document.getElementById('invoice-status-badge');
  if (badge) {
    badge.textContent = allOk ? '✅ Audit Passed' : '❌ Issues Found';
    badge.style.background = allOk ? 'var(--success)' : '#EF4444';
    badge.style.color = '#fff';
  }
}

async function saveVerifiedInvoice() {
  const lines = [];
  document.querySelectorAll('#invoice-lines-body tr').forEach(tr => {
    lines.push({
      item_name: tr.querySelector('.inv-item-name')?.value || '',
      qty: parseFloat(tr.querySelector('.inv-item-qty')?.value) || 0,
      unit: tr.querySelector('.inv-item-unit')?.value || '',
      unit_price: parseFloat(tr.querySelector('.inv-item-rate')?.value) || 0,
      line_total: parseFloat(tr.querySelector('.inv-item-total')?.value) || 0
    });
  });
  const payload = {
    supplier_name: document.getElementById('inv-supplier')?.value || '',
    invoice_number: document.getElementById('inv-number')?.value || '',
    invoice_date: document.getElementById('inv-date')?.value || '',
    subtotal: parseFloat(document.getElementById('inv-subtotal')?.value) || 0,
    tax_amount: parseFloat(document.getElementById('inv-tax')?.value) || 0,
    discount: parseFloat(document.getElementById('inv-discount')?.value) || 0,
    grand_total: parseFloat(document.getElementById('inv-grandtotal')?.value) || 0,
    items: lines
  };
  try {
    await fetch('/api/invoices/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(payload)
    });
    showToast('Invoice saved successfully!', 'success');
    await loadInvoiceHistory();
  } catch {
    showToast('Failed to save invoice', 'danger');
  }
}

async function loadInvoiceHistory() {
  try {
    const search = document.getElementById('invoice-history-search')?.value || '';
    let url = '/api/invoices';
    if (search) url += `?supplier=${encodeURIComponent(search)}`;
    const res = await fetch(url, { headers: authHeader() });
    const data = await res.json();
    const invoices = data.invoices || data;
    const countPill = document.getElementById('invoices-count-pill');
    if (countPill) countPill.textContent = `${invoices.length} Recorded`;
    const list = document.getElementById('invoice-history-list');
    if (!list) return;
    list.innerHTML = '';
    if (invoices.length === 0) {
      list.innerHTML = '<p style="color:var(--ink-muted);padding:10px;">No invoices saved yet.</p>';
      return;
    }
    invoices.forEach(inv => {
      const div = document.createElement('div');
      div.className = 'invoice-history-row';
      div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:0.83rem;';
      div.innerHTML = `
        <div>
          <strong>${inv.supplier_name || '—'}</strong>
          <span style="color:var(--ink-muted);margin-left:6px;">${inv.invoice_number || ''}</span>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          <span style="color:var(--ink-muted);">${inv.invoice_date || ''}</span>
          <strong style="color:var(--brand);">₹${(inv.grand_total || 0).toLocaleString()}</strong>
          <button class="btn btn-sm btn-outline" onclick="loadInvoiceById(${inv.id})">View</button>
        </div>`;
      list.appendChild(div);
    });
  } catch (err) {
    console.error('Failed to load invoice history:', err);
  }
}

async function loadInvoiceById(id) {
  try {
    const res = await fetch(`/api/invoices/${id}`, { headers: authHeader() });
    const inv = await res.json();
    document.getElementById('inv-supplier').value = inv.supplier_name || '';
    document.getElementById('inv-number').value = inv.invoice_number || '';
    document.getElementById('inv-date').value = inv.invoice_date || '';
    document.getElementById('inv-subtotal').value = inv.subtotal || 0;
    document.getElementById('inv-tax').value = inv.tax_amount || 0;
    document.getElementById('inv-discount').value = inv.discount || 0;
    document.getElementById('inv-grandtotal').value = inv.grand_total || 0;
    const tbody = document.getElementById('invoice-lines-body');
    tbody.innerHTML = '';
    invoiceLineIndex = 0;
    (inv.items || []).forEach(item => addInvoiceLineRow(item));
    runInvoiceAudit();
    showToast(`Loaded invoice ${inv.invoice_number}`, 'success');
  } catch {
    showToast('Failed to load invoice', 'danger');
  }
}

function filterInvoiceHistory() {
  // Also filter client-side for the search box
  loadInvoiceHistory();
}

function handleInvoiceFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  showToast(`📄 File "${file.name}" received. Auto-extraction requires backend OCR integration (demo: use Sample Invoice).`, 'brand');
}

/* ---------- Manual Calculator ---------- */
function calcInput(key) {
  const display = document.getElementById('calc-display-val');
  if (!display) return;
  if (key === 'C') {
    calcExpression = '';
    calcResult = '0';
    display.textContent = '0';
    return;
  }
  if (key === '=') {
    try {
      // Safe eval using Function constructor with no access to globals
      const result = Function('"use strict"; return (' + calcExpression + ')')();
      calcResult = parseFloat(result.toFixed(6)).toString();
      display.textContent = calcResult;
      calcExpression = calcResult;
    } catch {
      display.textContent = 'Error';
      calcExpression = '';
    }
    return;
  }
  calcExpression += key;
  // Show current expression
  display.textContent = calcExpression;
}

/* =========================================================
   11. Natural Language Assistant
   ========================================================= */
let speechRecognition = null;

function setupVoiceSpeech() {
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) {
    document.getElementById('mic-status-label').textContent = 'Speech recognition supported in Chrome/Edge. Type below.';
    return;
  }
  speechRecognition = new Speech();
  speechRecognition.continuous = false;
  speechRecognition.interimResults = false;
  speechRecognition.lang = 'en-IN';
  const micBtn = document.getElementById('btn-voice-mic');
  speechRecognition.onstart = () => {
    micBtn?.classList.add('listening');
    document.getElementById('mic-status-label').textContent = '🎙️ Listening...';
  };
  speechRecognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById('assistant-text-input').value = transcript;
    micBtn?.classList.remove('listening');
    document.getElementById('mic-status-label').textContent = `Recognized: "${transcript}"`;
    sendAssistantQuery(transcript);
  };
  speechRecognition.onerror = () => {
    micBtn?.classList.remove('listening');
    document.getElementById('mic-status-label').textContent = 'Voice error. Type below.';
  };
  speechRecognition.onend = () => micBtn?.classList.remove('listening');
  micBtn?.addEventListener('click', () => {
    try { speechRecognition.start(); } catch { speechRecognition.stop(); }
  });
}

function handleAssistantSend() {
  const input = document.getElementById('assistant-text-input');
  const query = input.value.trim();
  if (!query) return;
  input.value = '';
  sendAssistantQuery(query);
}

async function sendAssistantQuery(query) {
  const history = document.getElementById('chat-history');
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble bubble-user';
  userBubble.innerHTML = `<div class="bubble-avatar">👤</div><div class="bubble-content">${escapeHtml(query)}</div>`;
  history.appendChild(userBubble);
  history.scrollTop = history.scrollHeight;

  const botBubble = document.createElement('div');
  botBubble.className = 'chat-bubble bubble-bot';
  botBubble.innerHTML = `<div class="bubble-avatar">🤖</div><div class="bubble-content"><em>Analyzing restaurant data...</em></div>`;
  history.appendChild(botBubble);
  history.scrollTop = history.scrollHeight;

  try {
    const res = await fetch('/api/assistant/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ query })
    });
    if (!res.ok) throw new Error('API error');
    const ans = await res.json();
    if (!ans || !ans.title) throw new Error('Empty response');

    let chartHtml = '';
    if (ans.chart && ans.chart.labels && ans.chart.values) {
      const maxVal = Math.max(...ans.chart.values.map(v => Math.abs(v)));
      const barsHtml = ans.chart.labels.map((lbl, idx) => {
        const val = ans.chart.values[idx];
        const pct = Math.min(100, Math.max(10, Math.round((Math.abs(val) / maxVal) * 100)));
        const isNeg = val < 0;
        return `<div class="chart-bar-row">
          <span class="chart-bar-lbl" title="${lbl}">${lbl}</span>
          <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%;background:${isNeg ? '#EF4444' : 'linear-gradient(90deg,var(--brand),#E85A1D)'};"></div></div>
          <span class="chart-bar-val" style="color:${isNeg ? '#EF4444' : 'var(--ink-primary)'}">${val > 100 ? `₹${val.toLocaleString()}` : `${val}%`}</span>
        </div>`;
      }).join('');
      chartHtml = `<div class="chat-chart-box"><div style="font-size:0.76rem;font-weight:600;color:#EC601C;margin-bottom:6px;">${ans.chart.metric || 'Performance Breakdown'}</div><div class="chart-bars">${barsHtml}</div></div>`;
    }

    const actionsHtml = ans.suggested_actions ? `
      <div style="margin-top:10px;font-size:0.8rem;">
        <strong style="color:#EC601C;">AI Recommended Action:</strong>
        <ul style="padding-left:18px;margin-top:4px;">${ans.suggested_actions.map(a => `<li>${a}</li>`).join('')}</ul>
      </div>` : '';

    botBubble.querySelector('.bubble-content').innerHTML = `
      <strong>${ans.title}</strong>
      <p style="margin-top:6px;">${ans.summary}</p>
      ${chartHtml}${actionsHtml}`;
  } catch {
    botBubble.querySelector('.bubble-content').innerHTML =
      '⚠️ Could not retrieve analysis right now. Please retry or rephrase your question. <button class="btn btn-sm btn-outline" style="margin-left:8px;" onclick="sendAssistantQuery(\'' + escapeHtml(query) + '\')">Retry</button>';
  }
  history.scrollTop = history.scrollHeight;
}

/* =========================================================
   12. Modals: 9 PM Digest & 1-Click PO
   ========================================================= */
async function openDailySummaryModal() {
  try {
    const res = await fetch('/api/daily-summary', { headers: authHeader() });
    const data = await res.json();
    document.getElementById('telegram-preview-text').textContent = data.summary_text;
    document.getElementById('modal-daily-summary').classList.remove('hidden');
  } catch {
    showToast('Failed to generate 9 PM summary', 'danger');
  }
}

function sendTelegramMock() {
  showToast('📲 9 PM Summary sent to owner\'s Telegram & WhatsApp!', 'success');
  closeModal('modal-daily-summary');
}

function preparePODispatchModal() {
  if (!forecastData) return;
  const itemsToOrder = forecastData.recommendations.filter(r => r.recommended_order > 0);
  if (itemsToOrder.length === 0) { showToast('All items are well stocked! No PO needed.', 'success'); return; }
  const dairyItems = itemsToOrder.filter(i => i.preferred_supplier.includes('Dairy'));
  const targetItems = dairyItems.length > 0 ? dairyItems : itemsToOrder;
  const supplier = targetItems[0].preferred_supplier;
  const phone = targetItems[0].supplier_phone;
  let msg = `*PURCHASE ORDER: RESTRO.IN*\nTo: ${supplier} (${phone})\nEvent Context: ${forecastData.festival.name}\nDelivery Needed: Tomorrow 7:00 AM\n\nItems Required:\n`;
  let total = 0;
  targetItems.forEach(it => {
    msg += `• ${it.name}: ${it.recommended_order} ${it.unit} @ ₹${it.cost_per_unit}/${it.unit} = ₹${it.estimated_cost}\n`;
    total += it.estimated_cost;
  });
  msg += `\nTotal Estimated PO: ₹${total.toLocaleString()}\nAuthorized by: Restaurant GM / restro.in`;
  currentPoData = { supplier, phone, message: msg };
  document.getElementById('po-supplier-title').textContent = `Supplier: ${supplier} (${phone})`;
  document.getElementById('po-preview-text').textContent = msg;
  document.getElementById('modal-po-dispatch').classList.remove('hidden');
}

function orderSingleItem(name, qty, unit, supplier, phone) {
  const msg = `*PURCHASE ORDER: RESTRO.IN*\nTo: ${supplier}\nPlease deliver: ${qty} ${unit} of ${name} by tomorrow morning.\nAuthorized by: restro.in`;
  currentPoData = { supplier, phone, message: msg };
  document.getElementById('po-supplier-title').textContent = `Supplier: ${supplier}`;
  document.getElementById('po-preview-text').textContent = msg;
  document.getElementById('modal-po-dispatch').classList.remove('hidden');
}

async function dispatchPOWhatsApp() {
  if (!currentPoData) return;
  try {
    const res = await fetch('/api/purchase-orders/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ supplier_name: currentPoData.supplier, channel: 'WhatsApp', message: currentPoData.message })
    });
    const data = await res.json();
    showToast(`✅ PO dispatched to ${currentPoData.supplier} via WhatsApp!`, 'success');
    closeModal('modal-po-dispatch');
    window.open(data.whatsapp_url, '_blank');
  } catch {
    showToast('Error dispatching PO', 'danger');
  }
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.add('hidden');
}

/* =========================================================
   13. Reset Demo Data
   ========================================================= */
async function resetDemoData() {
  if (!confirm('Reset all sales, stock, and anomalies back to demo start?')) return;
  try {
    await fetch('/api/reset', { method: 'POST', headers: authHeader() });
    showToast('🔄 Demo data refreshed!', 'success');
    await initApp();
  } catch {
    showToast('Failed to reset demo', 'danger');
  }
}

/* =========================================================
   Helpers
   ========================================================= */
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

function showToast(msg, type = 'brand') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
