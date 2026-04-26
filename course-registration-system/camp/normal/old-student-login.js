const GAS_URL = 'https://script.google.com/macros/s/AKfycbzBf4UjIHIBswafVht5lHqq7TQpu0eFQk_qdikWR3F-HX3DAoNrmxcQai8dIQm10dQwPw/exec'; // Google Apps Script Web App URL
const TARGET_FORM_MAP = {
    'camp-normal': 'camp-form.html',
    'camp-member': '../member/camp-form.html',
    'theme-normal': '../../theme/normal/theme-form.html',
    'theme-member': '../../theme/member/theme-form.html',
    'math-normal': '../../math/normal/math-form.html'
};

function getTargetFormUrl() {
    const params = new URLSearchParams(window.location.search);
    const target = (params.get('target') || 'camp-normal').trim();
    return TARGET_FORM_MAP[target] || TARGET_FORM_MAP['camp-normal'];
}

function initSkipLink() {
    const skipLink = document.querySelector('.skip-link');
    if (!skipLink) return;
    skipLink.href = getTargetFormUrl();
}

initSkipLink();

document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const studentId = document.getElementById('student_id').value.trim().toUpperCase();
    const birthdayMmd = document.getElementById('birthday').value.trim();
    const errorMsg = document.getElementById('errorMsg');
    const submitBtn = document.getElementById('submitBtn');

    if (!studentId || !birthdayMmd) {
        showError('請輸入學生編號與生日末四碼');
        return;
    }

    if (!/^\d{4}$/.test(birthdayMmd)) {
        showError('生日格式錯誤，請輸入 4 位數字（MMDD），例如 1222。');
        return;
    }

    // Reset UI
    errorMsg.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = '查詢中...';

    try {
        const payload = {
            action: 'lookup_old_student',
            student_id: studentId,
            birthday_mmdd: birthdayMmd
        };

        let data;

        // 先嘗試 POST（同原流程）
        try {
            const formBody = new URLSearchParams(payload);
            const response = await fetch(GAS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                },
                body: formBody.toString()
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`伺服器回應異常 (${response.status})：${errorText || response.statusText}`);
            }

            data = await response.json();
        } catch (postErr) {
            // localhost 開發常見 CORS，改用 JSONP fallback
            console.warn('POST 失敗，改用 JSONP fallback：', postErr);
            data = await jsonpRequest(GAS_URL, payload, 12000);
        }

        if (data.success && data.matched) {
            console.info('[old-student-login] lookup matched prefill:', data.prefill);
            // Save prefill data to sessionStorage
            sessionStorage.setItem('camp_prefill', JSON.stringify(data.prefill));
            // Redirect to form
            window.location.href = getTargetFormUrl();
        } else {
            showError(data.message || '找不到符合的舊生資料，請確認資料是否正確。');
        }
    } catch (err) {
        console.error(err);
        showError(`發生網路錯誤，請稍後重試。${err && err.message ? `（${err.message}）` : ''}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '查詢並帶入資料';
    }
});

function showError(msg) {
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
}

function jsonpRequest(url, params, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
        const callbackName = `campJsonp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const script = document.createElement('script');
        const query = new URLSearchParams(Object.assign({}, params, { callback: callbackName }));
        const src = `${url}?${query.toString()}`;

        let timer = null;

        function cleanup() {
            if (timer) clearTimeout(timer);
            if (script.parentNode) script.parentNode.removeChild(script);
            delete window[callbackName];
        }

        window[callbackName] = (data) => {
            cleanup();
            resolve(data);
        };

        script.onerror = () => {
            cleanup();
            reject(new Error('JSONP 請求失敗'));
        };

        timer = setTimeout(() => {
            cleanup();
            reject(new Error('JSONP 請求逾時'));
        }, timeoutMs);

        script.src = src;
        document.body.appendChild(script);
    });
}
