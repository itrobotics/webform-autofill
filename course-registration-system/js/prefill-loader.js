document.addEventListener('DOMContentLoaded', () => {
    const prefillDataStr = sessionStorage.getItem('camp_prefill');
    if (!prefillDataStr) return;

    try {
        const prefill = JSON.parse(prefillDataStr);
        console.info('[camp-prefill-loader] prefill from sessionStorage:', prefill);

        // --- Mapping definition ---
        // sourceKeys: 支援新舊 payload 欄位名稱
        const FIELD_MAP = [
            { key: 'student_name', sourceKeys: ['student_name', 'childName'], type: 'text', name: 'kidsName' },
            { key: 'gender', sourceKeys: ['gender'], type: 'radio', name: 'gender' },
            { key: 'birth_year', sourceKeys: ['birth_year'], type: 'select', name: 'year' },
            { key: 'birth_month', sourceKeys: ['birth_month'], type: 'select', name: 'month' },
            { key: 'birth_day', sourceKeys: ['birth_day'], type: 'select', name: 'day' },
            { key: 'school_name', sourceKeys: ['school_name'], type: 'text', name: 'schoolName' },
            { key: 'grade', sourceKeys: ['grade'], type: 'select', name: 'grade' },
            { key: 'id_number', sourceKeys: ['id_number', 'idNumber'], type: 'text', name: 'nationalNo' },
            { key: 'emergency_phone', sourceKeys: ['emergency_phone'], type: 'text', name: 'emergencyPhone' },
            { key: 'city', sourceKeys: ['city', 'City'], type: 'select', name: 'commCity' },
            { key: 'address', sourceKeys: ['address'], type: 'text', name: 'commAddr' },
            { key: 'lunch_type', sourceKeys: ['lunch_type', 'lunch'], type: 'radio', name: 'lunch' },
            { key: 'food_allergy', sourceKeys: ['food_allergy', 'allergyFood'], type: 'text', name: 'allergyFood' },
            { key: 'parent_name', sourceKeys: ['parent_name'], type: 'text', name: 'parentName' },
            { key: 'parent_phone', sourceKeys: ['parent_phone'], type: 'text', name: 'cellPhone' },
            { key: 'relationship', sourceKeys: ['relationship', 'Relations'], type: 'text', name: 'relation' },
            { key: 'parent_email', sourceKeys: ['parent_email', 'parents_email'], type: 'text', name: 'email' },
            { key: 'medium', sourceKeys: ['medium'], type: 'checkbox', name: 'mediaSource' },
            { key: 'medium_desc', sourceKeys: ['medium_desc'], type: 'text', name: 'mediaSourceOther' },
            { key: 'branch', sourceKeys: ['branch'], type: 'radio', name: 'itSchool' }
        ];

        const getPrefillValue = (sourceKeys) => {
            for (const key of sourceKeys) {
                const value = prefill[key];
                if (value !== undefined && value !== null && value !== '') {
                    return value;
                }
            }
            return undefined;
        };

        const normalizeValue = (jsonKey, val) => {
            const raw = String(val).trim();

            if (jsonKey === 'gender') {
                const upper = raw.toUpperCase();
                if (upper === 'M') return '男';
                if (upper === 'F') return '女';
                return raw;
            }

            if (jsonKey === 'lunch_type') {
                if (raw === '葷食') return '葷';
                if (raw === '素食') return '素';
                return raw;
            }

            if (jsonKey === 'grade') {
                const m = raw.match(/^升\s*(\d+)年級$/);
                if (m) return `升${m[1]}`;
                return raw;
            }

            return raw;
        };

        const parseCheckboxValues = (val) => {
            if (Array.isArray(val)) {
                return val.map(v => String(v).trim()).filter(Boolean);
            }

            const raw = String(val || '').trim();
            if (!raw) return [];

            return raw
                .split(/[;,，、\n]/)
                .map(v => v.trim())
                .filter(Boolean);
        };

        const isOptionMatched = (optionValue, targetValue) => {
            const normalizeText = (v) => String(v || '')
                .trim()
                .replace(/台/g, '臺');

            const option = normalizeText(optionValue);
            const target = normalizeText(targetValue);
            if (!option || !target) return false;
            return option === target || option.includes(target) || target.includes(option);
        };

        // --- Execute Prefill ---
        for (const mapping of FIELD_MAP) {
            const val = getPrefillValue(mapping.sourceKeys);
            if (val === undefined || val === null || val === '') continue;
            const normalizedVal = normalizeValue(mapping.key, val);

            try {
                if (mapping.type === 'text') {
                    const el = document.querySelector(`input[name="${mapping.name}"]`);
                    if (el) {
                        el.value = normalizedVal;
                        if (['city', 'medium_desc'].includes(mapping.key)) {
                            console.info(`[camp-prefill-loader] text applied: ${mapping.key} -> ${mapping.name}`, normalizedVal);
                        }
                    }
                } else if (mapping.type === 'select') {
                    const el = document.querySelector(`select[name="${mapping.name}"]`);
                    if (el) {
                        // 先嘗試精準匹配，再嘗試模糊匹配（例如 City 含有縣市+區域）
                        el.value = normalizedVal;
                        if (el.value !== normalizedVal) {
                            for (const option of Array.from(el.options || [])) {
                                if (isOptionMatched(option.value, normalizedVal)) {
                                    el.value = option.value;
                                    break;
                                }
                            }
                        }
                        el.dispatchEvent(new Event('change'));
                        if (mapping.key === 'city') {
                            console.info('[camp-prefill-loader] select applied: city -> commCity', {
                                input: normalizedVal,
                                selected: el.value
                            });
                        }
                    }
                } else if (mapping.type === 'radio') {
                    const els = document.querySelectorAll(`input[type="radio"][name="${mapping.name}"]`);
                    for (const el of els) {
                        if (isOptionMatched(el.value, normalizedVal)) {
                            el.checked = true;
                            el.dispatchEvent(new Event('change'));
                            break;
                        }
                    }
                } else if (mapping.type === 'checkbox') {
                    const values = parseCheckboxValues(normalizedVal);
                    if (!values.length) continue;

                    const els = document.querySelectorAll(`input[type="checkbox"][name="${mapping.name}"]`);
                    for (const target of values) {
                        for (const el of els) {
                            if (isOptionMatched(el.value, target)) {
                                el.checked = true;
                                el.dispatchEvent(new Event('change'));
                            }
                        }
                    }
                    if (mapping.key === 'medium') {
                        console.info('[camp-prefill-loader] checkbox applied: medium -> mediaSource', values);
                    }
                }
            } catch (err) {
                console.warn(`Failed to prefill ${mapping.key}`, err);
            }
        }

        // medium_desc 有值但 medium 空白時，仍自動勾選「其他」
        const mediumDesc = getPrefillValue(['medium_desc']);
        if (mediumDesc !== undefined && mediumDesc !== null && String(mediumDesc).trim() !== '') {
            const otherCheckboxes = document.querySelectorAll('input[type="checkbox"][name="mediaSource"]');
            let otherChecked = false;
            for (const checkbox of otherCheckboxes) {
                if (isOptionMatched(checkbox.value, '其他')) {
                    checkbox.checked = true;
                    checkbox.dispatchEvent(new Event('change'));
                    otherChecked = true;
                    break;
                }
            }
            console.info('[camp-prefill-loader] medium_desc fallback -> 勾選其他', {
                medium_desc: String(mediumDesc).trim(),
                otherChecked
            });
        }

        // Show a little banner or alert
        const header = document.querySelector('.header');
        if (header) {
            const banner = document.createElement('div');
            banner.style.backgroundColor = '#d4edda';
            banner.style.color = '#155724';
            banner.style.padding = '10px';
            banner.style.textAlign = 'center';
            banner.style.borderRadius = '5px';
            banner.style.marginBottom = '15px';
            banner.textContent = '✅ 已成功帶入舊生基本資料，請確認內容並繼續填寫報名選項。';
            header.after(banner);
        }

    } catch (e) {
        console.error('Error parsing prefill data:', e);
    } finally {
        // Clear storage after applying
        sessionStorage.removeItem('camp_prefill');
    }
});
