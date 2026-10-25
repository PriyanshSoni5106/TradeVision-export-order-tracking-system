
crud(
    'products',
    r => `
        <tr>
            <td>
                <strong>${esc(r.name)}</strong>
            </td>
            <td>${esc(r.description)}</td>
            <td>${usd(r.unit_price)}</td>
            <td>${actions(r.id)}</td>
        </tr>
    `,
    4
);
