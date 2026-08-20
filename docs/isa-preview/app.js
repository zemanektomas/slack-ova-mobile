// App logic — vanilla JS, žádný framework.

// ============ TAB SWITCHING ============
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// ============ CARDS RENDER ============
function renderCards() {
  const list = document.getElementById('cards-list');
  const catFilter = document.getElementById('filter-category').value;
  const weightFilter = parseInt(document.getElementById('filter-weight').value);
  const statusFilter = document.getElementById('filter-status').value;

  const filtered = CARDS.filter(c =>
    (catFilter === 'all' || c.category === catFilter) &&
    (c.weight >= weightFilter) &&
    (statusFilter === 'all' || c.status === statusFilter)
  );

  // Sort: weight desc, then category, then title
  filtered.sort((a, b) => b.weight - a.weight || a.category.localeCompare(b.category) || a.title.localeCompare(b.title));

  if (filtered.length === 0) {
    list.innerHTML = '<p style="color: var(--text-dim); text-align: center; padding: 40px;">Žádné karty pro tuto kombinaci filtrů.</p>';
    return;
  }

  list.innerHTML = filtered.map(c => `
    <div class="card ${c.status === 'new' ? 'new' : ''}" data-card-id="${c.id}">
      <div class="card-header">
        <div class="card-pictogram">${c.pictogram}</div>
        <div class="card-title-block">
          <div class="card-title">${c.title}</div>
          <div class="card-meta">
            <span class="badge badge-weight-${c.weight}">váha ${c.weight}</span>
            <span class="badge badge-category">${CATEGORY_LABELS[c.category] || c.category}</span>
            ${c.status === 'new' ? '<span class="badge badge-new">NÁVRH</span>' : '<span class="badge badge-existing">v apce</span>'}
            <span>${c.subtitle}</span>
          </div>
        </div>
        <div class="card-toggle">▶</div>
      </div>
      <div class="card-body">
        <h4>Body</h4>
        <ul>
          ${c.points.map(p => `
            <li>
              <strong>${p.label}</strong>
              ${p.detail ? ` — ${p.detail}` : ''}
            </li>
          `).join('')}
        </ul>
        <div class="references"><strong>Zdroj:</strong> ${c.references}</div>
        ${c.postCert ? `<div class="post-cert-note ${c.postCertCritical ? 'critical' : ''}"><strong>${c.postCertCritical ? '⚠️ POST-CERT KRITICKÉ: ' : '📝 Post-cert note: '}</strong>${c.postCert}</div>` : ''}
      </div>
    </div>
  `).join('');

  // Attach expand handlers
  document.querySelectorAll('.card-header').forEach(header => {
    header.addEventListener('click', () => {
      header.parentElement.classList.toggle('expanded');
    });
  });
}

// ============ CALCULATORS RENDER ============
function renderCalculators() {
  const list = document.getElementById('calculators-list');
  list.innerHTML = CALCULATORS.map(c => `
    <div class="calculator" data-calc-id="${c.id}">
      <div class="calculator-header">
        <div class="calculator-pictogram">${c.pictogram}</div>
        <div class="calculator-title">${c.title}</div>
        <span class="badge badge-weight-${c.weight}">váha ${c.weight}</span>
        ${c.status === 'new' ? '<span class="badge badge-new">NÁVRH</span>' : '<span class="badge badge-existing">v apce</span>'}
      </div>
      <div class="calculator-description">${c.description}</div>
      <div class="calc-inputs">
        ${c.inputs.map(input => renderInput(c.id, input)).join('')}
      </div>
      <div class="calc-output" id="output-${c.id}"></div>
      ${c.notes ? `<div class="calc-note"><strong>Poznámky:</strong><ul>${c.notes.map(n => `<li>${n}</li>`).join('')}</ul></div>` : ''}
      <div class="references" style="margin-top: 10px;"><strong>Zdroj:</strong> ${c.references}</div>
    </div>
  `).join('');

  // Attach input handlers + init compute
  CALCULATORS.forEach(c => {
    const compute = () => {
      const values = {};
      c.inputs.forEach(input => {
        const el = document.getElementById(`input-${c.id}-${input.id}`);
        if (input.type === 'number' || input.type === 'range') {
          values[input.id] = parseFloat(el.value);
        } else {
          values[input.id] = el.value;
        }
        // Update value display for range inputs
        const valDisplay = document.getElementById(`value-${c.id}-${input.id}`);
        if (valDisplay) valDisplay.textContent = el.value;
      });
      const result = c.compute(values);
      const outputEl = document.getElementById(`output-${c.id}`);
      outputEl.innerHTML = `
        <span class="calc-output-value">${result.value}</span>
        <span class="calc-output-unit">${result.unit}</span>
        <span class="calc-output-rating rating-${result.rating}">${result.ratingLabel}</span>
      `;
    };
    c.inputs.forEach(input => {
      const el = document.getElementById(`input-${c.id}-${input.id}`);
      el.addEventListener('input', compute);
    });
    compute(); // init
  });
}

function renderInput(calcId, input) {
  const inputId = `input-${calcId}-${input.id}`;
  if (input.type === 'range') {
    return `
      <div class="calc-input">
        <label for="${inputId}">${input.label}: <span class="calc-value" id="value-${calcId}-${input.id}">${input.default}</span></label>
        <input type="range" id="${inputId}" min="${input.min}" max="${input.max}" step="${input.step || 1}" value="${input.default}">
      </div>
    `;
  } else if (input.type === 'select') {
    return `
      <div class="calc-input">
        <label for="${inputId}">${input.label}</label>
        <select id="${inputId}">
          ${input.options.map(o => `<option value="${o.value}" ${o.value === input.default ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </div>
    `;
  } else {
    return `
      <div class="calc-input">
        <label for="${inputId}">${input.label}</label>
        <input type="number" id="${inputId}" min="${input.min}" max="${input.max}" step="${input.step || 1}" value="${input.default}">
      </div>
    `;
  }
}

// ============ INIT + FILTERS ============
['filter-category', 'filter-weight', 'filter-status'].forEach(id => {
  document.getElementById(id).addEventListener('change', renderCards);
});

renderCards();
renderCalculators();
