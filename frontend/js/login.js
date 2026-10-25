
document.getElementById('login-form').addEventListener(
    'submit',
    async e => {
        e.preventDefault();

        if (!await ready) return;

        const b = document.getElementById('sign-in');
        b.disabled = true;

        try {
            await api(
                '/login',
                'POST',
                Object.fromEntries(new FormData(e.target))
            );

            location.href = '/dashboard.html';

        } catch (e) {
            message(e.message, true);

        } finally {
            b.disabled = false;
        }
    }
);
