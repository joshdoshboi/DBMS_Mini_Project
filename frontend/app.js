const API = 'http://127.0.0.1:8000/api';

const S = {
  page: 'dashboard',
  data: {},
  search: '',
  edit: null,
  lines: []
};

const $ = s => document.querySelector(s);

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

const money = n => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2
}).format(+n || 0);

const cfg = {
  categories: {
    name: 'Category',
    id: 'category_id',
    fields: [['category_name', 'Category name', 'text']]
  },
  suppliers: {
    name: 'Supplier',
    id: 'supplier_id',
    fields: [
      ['supplier_name', 'Supplier name', 'text'],
      ['email', 'Email', 'email'],
      ['phone', 'Phone', 'tel']
    ]
  },
  customers: {
    name: 'Customer',
    id: 'customer_id',
    fields: [
      ['customer_name', 'Customer name', 'text'],
      ['email', 'Email', 'email'],
      ['phone', 'Phone', 'tel']
    ]
  },
  products: {
    name: 'Product',
    id: 'product_id',
    fields: [
      ['product_name', 'Product name', 'text'],
      ['category_id', 'Category', 'category'],
      ['supplier_id', 'Supplier', 'supplier'],
      ['price', 'Price', 'number'],
      ['stock_quantity', 'Stock quantity', 'number'],
      ['reorder_level', 'Reorder level', 'number']
    ]
  }
};

// API helper
async function api(path, opt = {}) {
  const response = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opt
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({
    detail: 'Server error'
  }));

  if (!response.ok) {
    // FastAPI 422 returns detail as an array of error objects; flatten to readable text.
    const detail = Array.isArray(data.detail)
      ? data.detail.map(e => e.msg || JSON.stringify(e)).join('; ')
      : data.detail;
    throw new Error(detail || 'Request failed');
  }

  return data;
}

// Notifications
function toast(message, error = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (error ? ' err' : '');
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 3000);
}

// Load data from the backend
async function load(keys) {
  await Promise.all(keys.map(async key => {
    S.data[key] = await api('/' + key);
  }));
}

function panel(title, body) {
  return `<section class="panel">
    <h3>${esc(title)}</h3>
    ${body}
  </section>`;
}

function badge(text, low = false) {
  return `<span class="badge ${low ? 'low' : ''}">
    ${esc(text)}
  </span>`;
}

// Refresh the current page
async function refresh() {
  try {
    let keys;

    if (S.page === 'dashboard' || S.page === 'reports') {
      keys = ['dashboard', 'products'];
    } else if (S.page === 'orders') {
      keys = ['orders', 'customers', 'products'];
    } else if (S.page === 'products') {
      keys = ['products', 'categories', 'suppliers'];
    } else {
      keys = [S.page];
    }

    await load(keys);

    $('#status').textContent = 'PostgreSQL connected';
    render();
  } catch (error) {
    $('#status').textContent = 'API not connected';

    $('#content').innerHTML = `
      <section class="panel">
        <h3>Unable to load data</h3>
        <div class="panelbody">
          <p>${esc(error.message)}</p>
          <p>Check that PostgreSQL and FastAPI are running.</p>
          <button class="primary" id="retry">Retry</button>
        </div>
      </section>`;

    $('#retry').onclick = refresh;
  }
}

function head(title, subtitle, add = false) {
  $('#crumb').textContent = title;
  $('#title').textContent = title;
  $('#subtitle').textContent = subtitle;
  $('#add').hidden = !add;
  $('#add').textContent =
    '＋ Add ' + (cfg[S.page]?.name.toLowerCase() || 'order');
}

// Render the selected page
function render() {
  document.querySelectorAll('[data-page]').forEach(button => {
    button.classList.toggle(
      'active',
      button.dataset.page === S.page
    );
  });

  if (S.page === 'dashboard') dash();
  else if (S.page === 'orders') orders();
  else if (S.page === 'reports') reports();
  else table(S.page);
}

// Dashboard
function dash() {
  const d = S.data.dashboard || {
    stats: {},
    low_stock_products: [],
    best_sellers: []
  };

  const s = d.stats || {};

  head(
    'Inventory overview',
    'Your stock, orders and suppliers at a glance.'
  );

  const stat = (name, value) => `
    <div class="stat">
      <small>${esc(name)}</small>
      <strong>${value}</strong>
      <small>Live database value</small>
    </div>`;

  $('#content').innerHTML = `
    <div class="stats">
      ${stat('Active products', s.total_products || 0)}
      ${stat('Stock units', s.stock_units || 0)}
      ${stat('Low stock alerts', s.low_stock || 0)}
      ${stat('Order value', money(s.order_value))}
    </div>

    <div class="grid">
      ${panel('Low stock watch', `
        <div class="panelbody">
          ${(d.low_stock_products || []).map(p => `
            <p>
              ${esc(p.product_name)} —
              ${badge(p.stock_quantity + ' left', true)}
            </p>
          `).join('') || 'No low-stock items.'}
        </div>
      `)}

      ${panel('Best sellers', `
        <div class="panelbody">
          ${(d.best_sellers || []).map(p => `
            <p>
              ${esc(p.product_name)} —
              ${p.units_sold} sold
            </p>
          `).join('') || 'No sales yet.'}

          <hr>

          <button class="secondary" data-create="products">
            ＋ Add product
          </button>

          <button class="secondary" data-create="orders">
            ＋ Create order
          </button>
        </div>
      `)}
    </div>`;
}

// CRUD action buttons
function actions(page, id) {
  return `
    <div class="actions">
      <button data-edit="${page}:${id}">Edit</button>
      <button data-del="${page}:${id}">Delete</button>
    </div>`;
}

// Tables for products, categories, suppliers and customers
function table(page) {
  const config = cfg[page];

  if (!config) {
    $('#content').innerHTML = '<p>Unknown page.</p>';
    return;
  }

  const records = S.data[page] || [];

  head(
    'Manage ' + page,
    'Create, search, update and delete records.',
    true
  );

  let columns;
  let body;

  if (page === 'products') {
    columns = [
      'PRODUCT', 'CATEGORY', 'SUPPLIER',
      'PRICE', 'STOCK', 'STATUS', 'ACTIONS'
    ];

    body = records
      .filter(p =>
        `${p.product_name} ${p.category_name} ${p.supplier_name}`
          .toLowerCase()
          .includes(S.search.toLowerCase())
      )
      .map(p => `
        <tr>
          <td>${esc(p.product_name)}</td>
          <td>${esc(p.category_name)}</td>
          <td>${esc(p.supplier_name)}</td>
          <td>${money(p.price)}</td>
          <td>${p.stock_quantity}</td>
          <td>
            ${badge(
              p.stock_quantity <= p.reorder_level
                ? 'Low stock'
                : 'In stock',
              p.stock_quantity <= p.reorder_level
            )}
          </td>
          <td>${actions(page, p.product_id)}</td>
        </tr>
      `).join('');
  } else if (page === 'categories') {
    columns = ['ID', 'CATEGORY', 'ACTIONS'];

    body = records
      .filter(c =>
        c.category_name.toLowerCase()
          .includes(S.search.toLowerCase())
      )
      .map(c => `
        <tr>
          <td>${c.category_id}</td>
          <td>${esc(c.category_name)}</td>
          <td>${actions(page, c.category_id)}</td>
        </tr>
      `).join('');
  } else {
    const nameField = page === 'suppliers'
      ? 'supplier_name'
      : 'customer_name';

    columns = ['ID', 'NAME', 'EMAIL', 'PHONE', 'ACTIONS'];

    body = records
      .filter(r =>
        `${r[nameField] || ''} ${r.email || ''} ${r.phone || ''}`
          .toLowerCase()
          .includes(S.search.toLowerCase())
      )
      .map(r => `
        <tr>
          <td>${r[config.id]}</td>
          <td>${esc(r[nameField])}</td>
          <td>${esc(r.email || '')}</td>
          <td>${esc(r.phone || '')}</td>
          <td>${actions(page, r[config.id])}</td>
        </tr>
      `).join('');
  }

  $('#content').innerHTML = panel(page, `
    <div class="toolbar">
      <input
        id="search"
        placeholder="Search..."
        value="${esc(S.search)}"
      >
      <button class="secondary" id="reload">Refresh</button>
    </div>

    <div class="tablewrap">
      <table>
        <thead>
          <tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${body || `
            <tr>
              <td class="empty" colspan="${columns.length}">
                No records found.
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `);

  $('#search').oninput = event => {
    S.search = event.target.value;
    table(page);
    $('#search').focus();
    $('#search').setSelectionRange(
      S.search.length,
      S.search.length
    );
  };

  $('#reload').onclick = refresh;
}

// Orders page
function orders() {
  head(
    'Orders',
    'View orders and cancel to restore stock.',
    true
  );

  $('#add').textContent = '＋ Create order';

  const records = S.data.orders || [];

  $('#content').innerHTML = panel('Order register', `
    <div class="tablewrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>CUSTOMER</th>
            <th>DATE</th>
            <th>UNITS</th>
            <th>TOTAL</th>
            <th>STATUS</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          ${records.map(o => `
            <tr>
              <td>#${o.order_id}</td>
              <td>${esc(o.customer_name)}</td>
              <td>${new Date(o.order_date).toLocaleDateString()}</td>
              <td>${o.total_units}</td>
              <td>${money(o.total_amount)}</td>
              <td>${badge(o.status, o.status === 'Cancelled')}</td>
              <td>
                <button class="secondary" data-detail="${o.order_id}">
                  Details
                </button>

                ${o.status !== 'Cancelled' ? `
                  <button class="danger" data-cancel="${o.order_id}">
                    Cancel
                  </button>
                ` : ''}
              </td>
            </tr>
          `).join('') || `
            <tr>
              <td colspan="7" class="empty">No orders yet.</td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `);
}

// Reports page
function reports() {
  const d = S.data.dashboard || { stats: {} };
  const s = d.stats || {};

  head('Reports', 'Inventory and sales summaries.');

  const stockValue = (S.data.products || []).reduce(
    (total, p) => total + Number(p.price) * Number(p.stock_quantity),
    0
  );

  $('#content').innerHTML = `
    <div class="grid">
      ${panel('Inventory snapshot', `
        <div class="panelbody">
          <h2>${s.total_products || 0} products</h2>
          <p>${s.stock_units || 0} units in stock</p>
          <h2>${money(stockValue)}</h2>
          <p>Current retail stock value</p>
        </div>
      `)}

      ${panel('Sales snapshot', `
        <div class="panelbody">
          <h2>${money(s.order_value)}</h2>
          <p>Non-cancelled order value</p>
          <h2>${s.total_orders || 0}</h2>
          <p>Total orders</p>
        </div>
      `)}
    </div>`;
}

// Open create forms
async function openCreate(page) {
  try {
    if (page === 'orders') {
      await load(['customers', 'products']);
      orderModal();
      return;
    }

    if (page === 'products') {
      await load(['categories', 'suppliers']);
    }

    record(page, null);
  } catch (error) {
    toast(error.message, true);
  }
}

// Add/edit forms
function record(page, recordData) {
  const config = cfg[page];

  if (!config) return;

  S.edit = recordData ? recordData[config.id] : null;

  const fields = config.fields.map(([key, label, type]) => {
    let input;

    if (type === 'category' || type === 'supplier') {
      const isCategory = type === 'category';
      const list = S.data[isCategory ? 'categories' : 'suppliers'] || [];
      const idField = isCategory ? 'category_id' : 'supplier_id';
      const nameField = isCategory ? 'category_name' : 'supplier_name';

      input = `
        <select name="${key}" required>
          ${list.map(item => `
            <option
              value="${item[idField]}"
              ${recordData && recordData[key] === item[idField] ? 'selected' : ''}
            >
              ${esc(item[nameField])}
            </option>
          `).join('')}
        </select>`;
    } else {
      const value = recordData?.[key] ?? '';
      const required = key === 'email' || key === 'phone'
        ? ''
        : 'required';

      input = `
        <input
          name="${key}"
          type="${type}"
          ${type === 'number' ? 'min="0" step="any"' : ''}
          value="${esc(value)}"
          ${required}
        >`;
    }

    return `
      <div class="field">
        <label>${esc(label)}</label>
        ${input}
      </div>`;
  }).join('');

  $('#modal').innerHTML = `
    <div class="modalback">
      <section class="modal">
        <div class="modalhead">
          <h2>${recordData ? 'Edit' : 'Add'} ${config.name}</h2>
          <button type="button" data-close>×</button>
        </div>

        <form class="form" id="record-form">
          ${fields}

          <div class="formfoot">
            <button type="button" class="secondary" data-close>
              Cancel
            </button>
            <button class="primary" type="submit">Save</button>
          </div>
        </form>
      </section>
    </div>`;

  $('#modal').querySelectorAll('[data-close]').forEach(button => {
    button.onclick = close;
  });

  $('#record-form').onsubmit = async event => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {};

    config.fields.forEach(([key, , type]) => {
      const value = formData.get(key);

      data[key] = ['number', 'category', 'supplier'].includes(type)
        ? Number(value)
        : (value || null);
    });

    if (page === 'products') {
      data.is_active = recordData?.is_active ?? true;
    }

    try {
      await api('/' + page + (S.edit ? '/' + S.edit : ''), {
        method: S.edit ? 'PUT' : 'POST',
        body: JSON.stringify(data)
      });

      close();
      await refresh();
      toast('Saved successfully');
    } catch (error) {
      toast(error.message, true);
    }
  };
}

function close() {
  $('#modal').innerHTML = '';
}

// Create an order with multiple items
function orderModal() {
  const products = (S.data.products || []).filter(p => p.is_active);
  const customers = S.data.customers || [];

  if (!customers.length) {
    toast('Add a customer before creating an order.', true);
    return;
  }

  if (!products.length) {
    toast('Add an active product before creating an order.', true);
    return;
  }

  S.lines = [{ product_id: '', quantity: 1 }];

  const options = products.map(p => `
    <option value="${p.product_id}">
      ${esc(p.product_name)} — ${money(p.price)} (${p.stock_quantity} in stock)
    </option>
  `).join('');

  $('#modal').innerHTML = `
    <div class="modalback">
      <section class="modal">
        <div class="modalhead">
          <h2>Create order</h2>
          <button type="button" data-close>×</button>
        </div>

        <form class="form" id="order-form">
          <div class="field">
            <label>CUSTOMER</label>
            <select name="customer_id" required>
              ${customers.map(c => `
                <option value="${c.customer_id}">
                  ${esc(c.customer_name)}
                </option>
              `).join('')}
            </select>
          </div>

          <button type="button" class="secondary" id="add-line">
            ＋ Add item
          </button>

          <div id="order-lines"></div>

          <div class="formfoot">
            <button type="button" class="secondary" data-close>
              Cancel
            </button>
            <button class="primary" type="submit">Create order</button>
          </div>
        </form>
      </section>
    </div>`;

  function drawLines() {
    $('#order-lines').innerHTML = S.lines.map((line, index) => `
      <div class="formgrid">
        <div class="field">
          <label>PRODUCT</label>
          <select data-product="${index}" required>
            <option value="">Select product</option>
            ${options}
          </select>
        </div>

        <div class="field">
          <label>QUANTITY</label>
          <input
            data-quantity="${index}"
            type="number"
            min="1"
            value="${line.quantity}"
            required
          >
        </div>
      </div>
    `).join('');

    S.lines.forEach((line, index) => {
      if (line.product_id) {
        $(`[data-product="${index}"]`).value = line.product_id;
      }
    });
  }

  drawLines();

  $('#add-line').onclick = () => {
    S.lines.push({ product_id: '', quantity: 1 });
    drawLines();
  };

  $('#order-lines').onchange = event => {
    const productIndex = event.target.dataset.product;
    const quantityIndex = event.target.dataset.quantity;

    if (productIndex !== undefined) {
      S.lines[Number(productIndex)].product_id = event.target.value;
    }

    if (quantityIndex !== undefined) {
      S.lines[Number(quantityIndex)].quantity = Number(event.target.value);
    }
  };

  $('#modal').querySelectorAll('[data-close]').forEach(button => {
    button.onclick = close;
  });

  $('#order-form').onsubmit = async event => {
    event.preventDefault();

    const items = S.lines.map(line => ({
      product_id: Number(line.product_id),
      quantity: Number(line.quantity)
    }));

    if (items.some(item =>
      !Number.isInteger(item.product_id) ||
      item.product_id <= 0 ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1
    )) {
      toast('Choose a product and valid quantity for every item.', true);
      return;
    }

    try {
      const customerId = Number(
        new FormData(event.target).get('customer_id')
      );

      const result = await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: customerId,
          items
        })
      });

      close();
      S.page = 'orders';
      S.search = '';
      await refresh();

      toast('Order #' + result.order_id + ' created; stock updated.');
    } catch (error) {
      toast(error.message, true);
    }
  };
}

// Edit and delete
async function edit(page, id) {
  try {
    if (page === 'products') {
      await load(['categories', 'suppliers']);
    }

    const recordData = (S.data[page] || []).find(
      item => item[cfg[page].id] === id
    );

    if (!recordData) {
      throw new Error('Record not found. Refresh and try again.');
    }

    record(page, recordData);
  } catch (error) {
    toast(error.message, true);
  }
}

async function del(page, id) {
  if (!confirm('Delete this record? Foreign keys may prevent deletion.')) {
    return;
  }

  try {
    await api('/' + page + '/' + id, { method: 'DELETE' });
    await refresh();
    toast('Deleted successfully');
  } catch (error) {
    toast(error.message, true);
  }
}

// View order details
async function detail(id) {
  try {
    const order = await api('/orders/' + id);

    $('#modal').innerHTML = `
      <div class="modalback">
        <section class="modal">
          <div class="modalhead">
            <h2>Order #${order.order_id}</h2>
            <button type="button" data-close>×</button>
          </div>

          <div class="panelbody">
            <p>${esc(order.customer_name)} · ${esc(order.status)}</p>

            ${order.items.map(item => `
              <p>
                ${esc(item.product_name)} × ${item.quantity}
                — ${money(item.line_total)}
              </p>
            `).join('')}

            <h3>Total: ${money(order.total_amount)}</h3>
          </div>
        </section>
      </div>`;

    $('#modal').querySelector('[data-close]').onclick = close;
  } catch (error) {
    toast(error.message, true);
  }
}

// Cancel order and restore stock
async function cancel(id) {
  if (!confirm('Cancel this order and restore its stock?')) {
    return;
  }

  try {
    await api('/orders/' + id + '/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Cancelled' })
    });

    await refresh();
    toast('Order cancelled; stock restored');
  } catch (error) {
    toast(error.message, true);
  }
}

// Navigation
$('#nav').onclick = async event => {
  const button = event.target.closest('[data-page]');

  if (button) {
    S.page = button.dataset.page;
    S.search = '';
    await refresh();
  }
};

// Add button
const addButton = $('#add');

if (addButton) {
  addButton.onclick = async () => {
    try {
      await openCreate(S.page);
    } catch (error) {
      toast(error.message, true);
    }
  };
}

// Handle buttons inside page content
$('#content').onclick = event => {
  const button = event.target.closest('button');

  if (!button) return;

  if (button.dataset.create) {
    openCreate(button.dataset.create);
  } else if (button.dataset.edit) {
    const [page, id] = button.dataset.edit.split(':');
    edit(page, Number(id));
  } else if (button.dataset.del) {
    const [page, id] = button.dataset.del.split(':');
    del(page, Number(id));
  } else if (button.dataset.detail) {
    detail(Number(button.dataset.detail));
  } else if (button.dataset.cancel) {
    cancel(Number(button.dataset.cancel));
  }
};

// Today's date, if the HTML includes this element
if ($('#today')) {
  $('#today').textContent = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date());
}

// Start the application
refresh();