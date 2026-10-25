
crud(
    'customers',
    r => `
        <tr>
            <td>
                <strong>${esc(r.name)}</strong>
            </td>
            <td>${esc(r.company)}</td>
            <td>${esc(r.country)}</td>
            <td>
                ${esc(r.email)}
                <span class="sub">${esc(r.phone)}</span>
            </td>
            <td>${actions(r.id)}</td>
        </tr>
    `,
    5
);
