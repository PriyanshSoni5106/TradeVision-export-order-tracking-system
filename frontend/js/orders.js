
(async () => {
    if (!await ready) return;

    const form = document.getElementById('editor');
    const save = document.getElementById('save');

    let orders = [];
    let products = [];

    const states = [
        'Pending',
        'Processing',
        'Shipped',
        'Delivered'
    ];

    function reset() {
        form.reset();

        document.getElementById('order_date').value = (() => {
            const d = new Date();

            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })();

        estimate();
    }

    function estimate() {
        const p = products.find(
            p => p.id === Number(form.elements.product_id.value)
        );

        document.getElementById('estimate').textContent = usd(
            (p ? Number(p.unit_price) : 0) *
            (Number(form.elements.quantity.value) || 0)
        );
    }

    function render() {
        const q = document.getElementById('search').value.toLowerCase();
        const status = document.getElementById('status-filter').value;

        const rows = orders.filter(
            o =>
                (!status || o.status === status) &&
                Object.values(o)
                    .join(' ')
                    .toLowerCase()
                    .includes(q)
        );

        document.getElementById('rows').innerHTML =
            rows.map(o => `
                <tr>
                    <td>
                        <strong>
                            #TV-${String(o.id).padStart(4, '0')}
                        </strong>
                        <span class="sub">
                            ${esc(o.order_date)}
                        </span>
                    </td>

                    <td>
                        ${esc(o.customer_name)}
                        <span class="sub">
                            ${esc(o.country)}
                        </span>
                    </td>

                    <td>${esc(o.product_name)}</td>

                    <td>${o.quantity}</td>

                    <td>${usd(o.order_price)}</td>

                    <td>
                        <strong>
                            ${usd(o.total_amount)}
                        </strong>
                    </td>

                    <td>
                        <select
                            class="form-select status"
                            aria-label="Status for order ${o.id}"
                            data-id="${o.id}"
                        >
                            ${states.map(s => `
                                <option ${s === o.status ? 'selected' : ''}>
                                    ${s}
                                </option>
                            `).join('')}
                        </select>
                    </td>

                    <td>
                        ${o.status === 'Pending'
                            ? `
                                <button
                                    class="btn btn-outline-danger"
                                    data-delete="${o.id}"
                                >
                                    Delete
                                </button>
                            `
                            : `
                                <span class="status-note">
                                    Tracked
                                </span>
                            `
                        }
                    </td>
                </tr>
            `).join('') ||
            empty(8, 'No matching orders. Create an order above.');
    }

    async function load() {
        orders = await api('/orders');
        render();
    }

    document
        .getElementById('search')
        .addEventListener('input', render);

    document
        .getElementById('status-filter')
        .addEventListener('change', render);

    form.addEventListener('input', estimate);

    document
        .getElementById('cancel')
        .addEventListener('click', reset);

    form.addEventListener('submit', async e => {
        e.preventDefault();

        save.disabled = true;

        try {
            await api(
                '/orders',
                'POST',
                Object.fromEntries(new FormData(form))
            );

            reset();
            await load();

            message('Order created successfully.');

        } catch (e) {
            message(e.message, true);

        } finally {
            save.disabled = false;
        }
    });

    document
        .getElementById('rows')
        .addEventListener('change', async e => {
            if (!e.target.matches('select[data-id]')) return;

            const el = e.target;
            el.disabled = true;

            try {
                await api(
                    '/orders/' + el.dataset.id + '/status',
                    'PATCH',
                    {
                        status: el.value
                    }
                );

                await load();

                message('Shipment status updated.');

            } catch (e) {
                message(e.message, true);
                render();
            }
        });

    document
        .getElementById('rows')
        .addEventListener('click', async e => {
            const b = e.target.closest('[data-delete]');

            if (
                !b ||
                !confirm('Delete this Pending order permanently?')
            ) {
                return;
            }

            b.disabled = true;

            try {
                await api(
                    '/orders/' + b.dataset.delete,
                    'DELETE'
                );

                await load();

                message('Order deleted.');

            } catch (e) {
                message(e.message, true);
                b.disabled = false;
            }
        });

    try {
        const [ps, cs] = await Promise.all([
            api('/products'),
            api('/customers')
        ]);

        products = ps;

        form.elements.product_id.innerHTML =
            '<option value="">Select product</option>' +
            ps.map(p => `
                <option value="${p.id}">
                    ${esc(p.name)} — ${usd(p.unit_price)}
                </option>
            `).join('');

        form.elements.customer_id.innerHTML =
            '<option value="">Select customer</option>' +
            cs.map(c => `
                <option value="${c.id}">
                    ${esc(c.company)} · ${esc(c.country)}
                </option>
            `).join('');

        if (!ps.length || !cs.length) {
            save.disabled = true;

            message(
                'Add at least one product and one customer before creating an order.'
            );
        }

        reset();
        await load();

    } catch (e) {
        save.disabled = true;

        message(e.message, true);

        document.getElementById('rows').innerHTML =
            empty(
                8,
                'Unable to load orders. Refresh to retry.'
            );
    }
})();
