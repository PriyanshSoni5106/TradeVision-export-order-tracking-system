
let csrf = '';

function esc(value) {
    return String(value ?? '').replace(
        /[&<>"']/g,
        c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c])
    );
}

function usd(n) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(Number(n));
}

function message(text, error = false) {
    const el = document.getElementById('message');

    el.className = 'alert ' + (
        error ? 'alert-danger' : 'alert-success'
    );

    el.textContent = text;

    el.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
    });
}

async function api(path, method = 'GET', body) {
    const r = await fetch('/api' + path, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrf
        },
        body: body === undefined
            ? undefined
            : JSON.stringify(body)
    });

    const data = await r.json();

    if (!r.ok) {
        if (
            r.status === 401 &&
            location.pathname !== '/login.html'
        ) {
            location.href = '/login.html';
        }

        throw Error(data.error || 'Request failed.');
    }

    return data;
}

const ready = (async () => {
    try {
        const s = await api('/session');

        csrf = s.csrf;

        if (
            !s.authenticated &&
            location.pathname !== '/login.html'
        ) {
            location.href = '/login.html';
            return false;
        }

        if (
            s.authenticated &&
            location.pathname === '/login.html'
        ) {
            location.href = '/dashboard.html';
            return false;
        }

        return true;

    } catch (e) {
        message(e.message, true);
        return false;
    }
})();

document.getElementById('logout')?.addEventListener(
    'click',
    async () => {
        try {
            await api('/logout', 'POST', {});
            location.href = '/login.html';

        } catch (e) {
            message(e.message, true);
        }
    }
);

function empty(
    cols,
    label = 'No records yet. Add your first record above.'
) {
    return `
        <tr>
            <td class="empty" colspan="${cols}">
                ${esc(label)}
            </td>
        </tr>
    `;
}

async function crud(type, renderRow, columns) {
    if (!await ready) return;

    let rows = [];

    const form = document.getElementById('editor');
    const title = document.getElementById('form-title');
    const initialTitle = title.textContent;
    const save = document.getElementById('save');

    function render() {
        const q = document
            .getElementById('search')
            .value.toLowerCase();

        const shown = rows.filter(r =>
            Object.values(r)
                .join(' ')
                .toLowerCase()
                .includes(q)
        );

        document.getElementById('rows').innerHTML =
            shown.map(renderRow).join('') ||
            empty(
                columns,
                q ? 'No matching records.' : undefined
            );
    }

    async function load() {
        rows = await api('/' + type);
        render();
    }

    function clear() {
        form.reset();
        form.elements.id.value = '';
        title.textContent = initialTitle;
        save.textContent = 'Save';
    }

    document
        .getElementById('search')
        .addEventListener('input', render);

    document
        .getElementById('cancel')
        .addEventListener('click', clear);

    form.addEventListener('submit', async e => {
        e.preventDefault();
        save.disabled = true;

        try {
            const b = Object.fromEntries(
                new FormData(form)
            );

            const id = b.id;
            delete b.id;

            await api(
                '/' + type + (id ? '/' + id : ''),
                id ? 'PUT' : 'POST',
                b
            );

            clear();
            await load();
            message('Saved successfully.');

        } catch (e) {
            message(e.message, true);

        } finally {
            save.disabled = false;
        }
    });

    document
        .getElementById('rows')
        .addEventListener('click', async e => {
            const b = e.target.closest('button[data-id]');

            if (!b) return;

            const r = rows.find(
                x => x.id === Number(b.dataset.id)
            );

            if (!r) return;

            if (b.dataset.action === 'edit') {
                for (const [k, val] of Object.entries(r)) {
                    if (form.elements[k]) {
                        form.elements[k].value = val;
                    }
                }

                title.textContent =
                    'Edit ' + (
                        type === 'products'
                            ? 'product'
                            : 'customer'
                    );

                save.textContent = 'Update';

                form.scrollIntoView({
                    behavior: 'smooth'
                });

                form.elements.name.focus();

            } else if (
                confirm(
                    `Delete ${r.name}? Records linked to orders cannot be deleted.`
                )
            ) {
                b.disabled = true;

                try {
                    await api(
                        '/' + type + '/' + r.id,
                        'DELETE'
                    );

                    await load();
                    clear();
                    message('Deleted successfully.');

                } catch (e) {
                    message(e.message, true);
                    b.disabled = false;
                }
            }
        });

    try {
        await load();

    } catch (e) {
        message(e.message, true);

        document.getElementById('rows').innerHTML =
            empty(
                columns,
                'Unable to load records. Refresh to retry.'
            );
    }
}

function actions(id) {
    return `
        <div class="actions">
            <button
                class="btn btn-outline-secondary"
                data-action="edit"
                data-id="${id}"
            >
                Edit
            </button>

            <button
                class="btn btn-outline-danger"
                data-action="delete"
                data-id="${id}"
            >
                Delete
            </button>
        </div>
    `;
}
