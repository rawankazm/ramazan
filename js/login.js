(() => {
    const supabaseUrl = 'https://bchsayylzxzqevxydlet.supabase.co';
    const supabaseKey = 'sb_publishable_4X9F_Pw_gswGnO6OcDnuXw_qI_ETiYK';
    const form = document.getElementById('loginForm');
    const submitButton = document.getElementById('submitButton');
    const signOutButton = document.getElementById('signOutButton');
    const message = document.getElementById('message');
    const client = window.supabase?.createClient(supabaseUrl, supabaseKey);

    function showMessage(text, isError = true) {
        message.textContent = text;
        message.dataset.error = String(isError);
    }

    function getSafeNextPath() {
        const requested = new URLSearchParams(location.search).get('next');
        if (!requested) return 'Dashboard.html';

        try {
            const target = new URL(requested, location.href);
            if (target.origin === location.origin && target.pathname !== location.pathname) {
                return `${target.pathname}${target.search}${target.hash}`;
            }
        } catch (error) {
            console.warn('Ignoring invalid post-login destination:', error);
        }
        return 'Dashboard.html';
    }

    async function hasActiveProfile(userId) {
        const { data, error } = await client
            .from('profiles')
            .select('is_active')
            .eq('id', userId)
            .maybeSingle();
        if (error) throw error;
        return data?.is_active === true;
    }

    async function initialize() {
        if (!client) {
            showMessage('خزمەتگوزاری چوونەژوورەوە بارنەبوو. ئینتەرنێت و ڕێکخستنی پەڕە بپشکنە.');
            submitButton.disabled = true;
            return;
        }

        const reason = new URLSearchParams(location.search).get('reason');
        if (reason === 'not-authorized') {
            showMessage('ئەم هەژمارە مۆڵەتی چوونەژوورەوەی نییە. پەیوەندی بە بەڕێوەبەری سیستەم بکە.');
        } else if (reason === 'verification-failed') {
            showMessage('پشتڕاستکردنەوەی دەستگەیشتن سەرکەوتوو نەبوو. ئینتەرنێت و ڕێکخستنی Supabase بپشکنە.');
        } else {
            showMessage('');
        }

        const { data: { session }, error } = await client.auth.getSession();
        if (error) throw error;
        if (session && await hasActiveProfile(session.user.id)) {
            showMessage('ئەم ئامێرە هەژماری ڕێگەپێدراوی تێدایە.', false);
            signOutButton.style.display = 'block';
        }
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!client) return;

        submitButton.disabled = true;
        showMessage('چوونەژوورەوە...');

        const formData = new FormData(form);
        let data;
        let error;
        try {
            ({ data, error } = await client.auth.signInWithPassword({
                email: String(formData.get('email')).trim(),
                password: String(formData.get('password'))
            }));
        } catch (signInError) {
            showMessage('پەیوەندی بە خزمەتگوزاری چوونەژوورەوە نەکرا. ئینتەرنێت بپشکنە و دووبارە هەوڵ بدەرەوە.');
            submitButton.disabled = false;
            console.error('Sign-in request failed:', signInError);
            return;
        }

        if (error) {
            showMessage('چوونەژوورەوە سەرکەوتوو نەبوو. ئیمەیڵ و وشەی نهێنی بپشکنە.');
            submitButton.disabled = false;
            console.error('Sign-in failed:', error);
            return;
        }

        try {
            if (!await hasActiveProfile(data.user.id)) {
                await client.auth.signOut();
                showMessage('ئەم هەژمارە مۆڵەتی چوونەژوورەوەی نییە. پەیوەندی بە بەڕێوەبەری سیستەم بکە.');
                submitButton.disabled = false;
                return;
            }
        } catch (profileError) {
            await client.auth.signOut();
            showMessage('نەتوانرا مۆڵەتی هەژمارەکە پشتڕاست بکرێتەوە. دواتر هەوڵ بدەرەوە.');
            submitButton.disabled = false;
            console.error('Profile verification failed:', profileError);
            return;
        }

        location.replace(getSafeNextPath());
    });

    signOutButton.addEventListener('click', async () => {
        if (!client) return;
        signOutButton.disabled = true;
        let error;
        try {
            ({ error } = await client.auth.signOut());
        } catch (signOutError) {
            signOutButton.disabled = false;
            showMessage('پەیوەندی بۆ چوونەدەرەوە نەکرا. دووبارە هەوڵ بدەرەوە.');
            console.error('Sign-out request failed:', signOutError);
            return;
        }
        if (error) {
            signOutButton.disabled = false;
            showMessage('چوونەدەرەوە سەرکەوتوو نەبوو. دووبارە هەوڵ بدەرەوە.');
            console.error('Sign-out failed:', error);
            return;
        }
        showMessage('بە سەرکەوتوویی چوویتەدەرەوە.', false);
        signOutButton.style.display = 'none';
    });

    initialize().catch(error => {
        showMessage('پشکنینی هەژمار سەرکەوتوو نەبوو. ئینتەرنێت و ڕێکخستنی Supabase بپشکنە.');
        console.error('Login initialization failed:', error);
    });
})();
