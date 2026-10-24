(() => {
    const supabaseUrl = 'https://bchsayylzxzqevxydlet.supabase.co';
    const supabaseKey = 'sb_publishable_4X9F_Pw_gswGnO6OcDnuXw_qI_ETiYK';

    document.documentElement.classList.add('auth-checking');
    const visibilityStyle = document.createElement('style');
    visibilityStyle.textContent = 'html.auth-checking body { visibility: hidden; }';
    document.head.appendChild(visibilityStyle);

    function goToLogin(reason) {
        const next = `${location.pathname}${location.search}${location.hash}`;
        const query = new URLSearchParams({ next, reason });
        location.replace(`login.html?${query.toString()}`);
    }

    async function verifyAccess() {
        if (!window.supabase) {
            throw new Error('Authentication service did not load.');
        }

        const client = window.supabase.createClient(supabaseUrl, supabaseKey);
        client.auth.onAuthStateChange(event => {
            if (event === 'SIGNED_OUT') goToLogin('sign-in');
        });

        const { data: { session }, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
            goToLogin('sign-in');
            return;
        }

        const { data: profile, error: profileError } = await client
            .from('profiles')
            .select('is_active')
            .eq('id', session.user.id)
            .maybeSingle();
        if (profileError) throw profileError;
        if (!profile || profile.is_active !== true) {
            await client.auth.signOut();
            goToLogin('not-authorized');
            return;
        }

        document.documentElement.classList.add('auth-authorized');
        document.documentElement.classList.remove('auth-checking');
    }

    verifyAccess().catch(error => {
        console.error('Access verification failed:', error);
        goToLogin('verification-failed');
    });
})();
