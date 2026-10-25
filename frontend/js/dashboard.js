
(async () => {
    if (!await ready) return;

    try {
        const d = await api('/dashboard');

        document.getElementById('cards').innerHTML = [
            ['Customers', d.total_customers],
            ['Total orders', d.total_orders],
            ['Pending orders', d.pending_orders],
            ['Total order value', usd(d.total_value)]
        ].map(([label, value]) => `
            <div class="col-sm-6 col-xl-3">
                <section class="stat">
                    <div class="stat-label">
                        ${label}
                    </div>
                    <div class="stat-value stat-number">
                        ${esc(value)}
                    </div>
                </section>
            </div>
        `).join('');

        document.getElementById('monthly').innerHTML =
            d.monthly.map(r => `
                <tr>
                    <td>${esc(r.month)}</td>
                    <td>${r.orders}</td>
                    <td>${usd(r.value)}</td>
                </tr>
            `).join('') ||
            empty(3, 'Create an order to see monthly totals.');

        document.getElementById('countries').innerHTML =
            d.countries.map(r => `
                <tr>
                    <td>${esc(r.country)}</td>
                    <td>${r.orders}</td>
                    <td>${usd(r.value)}</td>
                </tr>
            `).join('') ||
            empty(3, 'No destination data yet.');

    } catch (e) {
        message(e.message, true);

        document.getElementById('cards').textContent =
            'Summary unavailable. Refresh to retry.';
    }
})();
