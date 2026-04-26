const SPREADSHEET_ID = '1hBO7Dd6O0CpvWNby9gJ0PetltLYjMB5uYgl4xIY1LH4';
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1hBO7Dd6O0CpvWNby9gJ0PetltLYjMB5uYgl4xIY1LH4/edit';
const SHEET_NAME = 'student';

function doGet(e) {
  const requestData = (e && e.parameter) ? e.parameter : {};
  const result = handleLookupOldStudentData(requestData);

  const callback = requestData.callback ? String(requestData.callback).trim() : '';
  if (callback && isValidJsonpCallback(callback)) {
    return createJsonpResponse(result, callback);
  }

  return createJsonResponse(result);
}

function doPost(e) {
  let requestData = {};

  try {
    const contentType = (e && e.postData && e.postData.type)
      ? e.postData.type.toString().toLowerCase()
      : '';

    if (contentType.indexOf('application/json') !== -1) {
      requestData = (e && e.postData && e.postData.contents)
        ? JSON.parse(e.postData.contents)
        : {};
    } else if (e && e.parameter) {
      requestData = e.parameter;
    }
  } catch (error) {
    return createJsonResponse({
      success: false,
      error_code: "BAD_REQUEST",
      message: "Invalid JSON payload."
    });
  }

  return createJsonResponse(handleLookupOldStudentData(requestData || {}));
}

function handleLookupOldStudentData(requestData) {
  try {
    if (requestData.action !== 'lookup_old_student') {
      return {
        success: false,
        error_code: "INVALID_ACTION",
        message: "Unknown action."
      };
    }

    const studentId = normalizeStudentId(requestData.student_id || '');
    const birthdayMmd = requestData.birthday_mmdd
      ? requestData.birthday_mmdd.toString().trim()
      : (requestData.birthday ? extractMmd(requestData.birthday) : '');

    if (!studentId || !birthdayMmd) {
      return {
        success: false,
        error_code: "MISSING_PARAMS",
        message: "Missing student_id or birthday_mmdd."
      };
    }

    if (!/^\d{4}$/.test(birthdayMmd)) {
      return {
        success: false,
        error_code: "INVALID_BIRTHDAY_MMDD",
        message: "birthday_mmdd must be 4 digits (MMDD)."
      };
    }

    let spreadsheet;
    try {
      // Prefer URL to avoid accidental ID mismatch issues
      spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    } catch (openErr) {
      return {
        success: false,
        error_code: "OPEN_SPREADSHEET_FAILED",
        message: "無法開啟試算表，請確認 Apps Script 執行帳號是否有權限。",
        debug: {
          spreadsheet_id: SPREADSHEET_ID,
          spreadsheet_url: SPREADSHEET_URL,
          detail: openErr && openErr.toString ? openErr.toString() : String(openErr)
        }
      };
    }

    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) {
      return {
        success: false,
        error_code: "SHEET_NOT_FOUND",
        message: `找不到工作表「${SHEET_NAME}」，請確認分頁名稱。`
      };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return {
        success: true,
        matched: false,
        message: "No records in database."
      };
    }

    const headers = data[0].map(h => h.toString().trim());
    const idIndex = findHeaderIndexByAliases(headers, ['student_no', 'studentno', 'student_id', 'studentid', '學號', '學生編號', '學生代號']);
    const birthdayIndex = findHeaderIndexByAliases(headers, ['birthday', 'birthdate', 'birth_day', 'birth', '生日', '出生日期']);
    const activeIndex = findHeaderIndexByAliases(headers, ['active', '啟用', '是否啟用']);

    if (idIndex === -1 || birthdayIndex === -1) {
      return {
        success: false,
        error_code: "SERVER_ERROR",
        message: "Database configuration error: Missing required columns (student_id, birthday).",
        debug: {
          headers: headers,
          matched_headers: {
            student_id: idIndex >= 0 ? headers[idIndex] : '',
            birthday: birthdayIndex >= 0 ? headers[birthdayIndex] : '',
            active: activeIndex >= 0 ? headers[activeIndex] : ''
          }
        }
      };
    }

    let matchedRecord = null;
    let matchedBirthdayRaw = null;
    const debugSamples = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowId = normalizeStudentId(row[idIndex]);
      const rowBirthdayMmd = extractMmd(row[birthdayIndex]);

      if (debugSamples.length < 5) {
        debugSamples.push({
          row: i + 1,
          student_id: rowId,
          birthday_mmdd: rowBirthdayMmd
        });
      }

      if (rowId === studentId && rowBirthdayMmd === birthdayMmd) {
        if (activeIndex !== -1 && !isActiveValue(row[activeIndex])) {
          continue;
        }

        matchedRecord = row;
        matchedBirthdayRaw = row[birthdayIndex];
        break;
      }
    }

    if (!matchedRecord) {
      return {
        success: true,
        matched: false,
        message: "找不到符合的舊生資料，請確認資料是否正確。",
        debug: {
          headers: headers,
          matched_headers: {
            student_id: headers[idIndex],
            birthday: headers[birthdayIndex],
            active: activeIndex >= 0 ? headers[activeIndex] : ''
          },
          input_student_id: studentId,
          input_birthday_mmdd: birthdayMmd,
          sample_rows: debugSamples
        }
      };
    }

    const prefill = {};
    const mappingFieldAliases = {
      student_id: ['student_no', 'studentno', 'student_id', 'studentid', '學號', '學生編號', '學生代號'],
      student_name: ['student_name', 'studentname', 'childName', 'child_name', 'name', '學生姓名', '姓名'],
      gender: ['gender', 'sex', '性別'],
      school_name: ['school_name', 'schoolname', 'school', '學校', '學校名稱'],
      grade: ['grade', '年級'],
      id_number: ['id_number', 'idnumber', 'idNumber', '身分證字號', '身份證字號', '身分證號'],
      emergency_phone: ['emergency_phone', 'emergencyphone', '緊急聯絡電話', '緊急電話'],
      city: ['city', 'City', '縣市', '通訊地址縣市區域'],
      address: ['address', '地址'],
      lunch_type: ['lunch_type', 'lunchtype', 'lunch', '午餐', '餐食', '葷素'],
      food_allergy: ['food_allergy', 'foodallergy', 'allergyFood', '過敏', '食物過敏'],
      parent_name: ['parent_name', 'parentname', '家長姓名', '聯絡人姓名'],
      parent_phone: ['parent_phone', 'parentphone', '家長電話', '聯絡人電話'],
      relationship: ['relationship', 'Relations', 'relation', '關係'],
      parent_email: ['parent_email', 'parentemail', 'parents_email', '家長信箱', '聯絡人信箱', 'email'],
      medium: ['medium', 'mediaSource', '如何得知我們的消息'],
      medium_desc: ['medium_desc', 'mediaSourceOther', '如何得知我們的消息(其他)'],
      branch: ['branch', '分校', '校區']
    };

    Object.keys(mappingFieldAliases).forEach(field => {
      const idx = findHeaderIndexByAliases(headers, mappingFieldAliases[field]);
      if (idx !== -1) {
        prefill[field] = matchedRecord[idx] !== undefined && matchedRecord[idx] !== null
          ? matchedRecord[idx].toString()
          : '';
      }
    });

    const birthParts = extractBirthParts(matchedBirthdayRaw);
    if (birthParts) {
      prefill['birth_year'] = birthParts.year;
      prefill['birth_month'] = birthParts.month;
      prefill['birth_day'] = birthParts.day;
    }

    return {
      success: true,
      matched: true,
      prefill: prefill
    };

  } catch (error) {
    return {
      success: false,
      error_code: "SERVER_ERROR",
      message: error.toString()
    };
  }
}

function normalizeHeaderKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s\-()（）]/g, '');
}

function findHeaderIndexByAliases(headers, aliases) {
  if (!headers || !headers.length || !aliases || !aliases.length) return -1;

  const normalizedHeaders = headers.map(h => normalizeHeaderKey(h));

  // 先做精準比對
  for (let i = 0; i < aliases.length; i++) {
    const normalizedAlias = normalizeHeaderKey(aliases[i]);
    const idx = normalizedHeaders.indexOf(normalizedAlias);
    if (idx !== -1) return idx;
  }

  // 再做包含比對（支援像 studentNo(學號) 這種欄名）
  for (let i = 0; i < aliases.length; i++) {
    const normalizedAlias = normalizeHeaderKey(aliases[i]);
    if (!normalizedAlias) continue;
    const idx = normalizedHeaders.findIndex(h => h.indexOf(normalizedAlias) !== -1);
    if (idx !== -1) return idx;
  }

  return -1;
}

function isValidJsonpCallback(callback) {
  return /^[a-zA-Z_$][0-9a-zA-Z_$\.]*$/.test(callback);
}

function createJsonpResponse(responseObject, callbackName) {
  const payload = `${callbackName}(${JSON.stringify(responseObject)});`;
  return ContentService.createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function isActiveValue(value) {
  if (value === true) return true;
  const normalized = (value || '').toString().trim().toUpperCase();
  return ['TRUE', '1', 'Y', 'YES', 'V'].includes(normalized);
}

function parseDateLike(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'number' && isFinite(value)) {
    const dateFromSerial = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (!isNaN(dateFromSerial.getTime())) {
      return dateFromSerial;
    }
  }

  if (value === undefined || value === null) return null;

  const raw = value.toString().trim();
  if (!raw) return null;

  if (/^\d{5,6}$/.test(raw)) {
    const serial = Number(raw);
    if (isFinite(serial)) {
      const dateFromSerialStr = new Date(Math.round((serial - 25569) * 86400 * 1000));
      if (!isNaN(dateFromSerialStr.getTime())) {
        return dateFromSerialStr;
      }
    }
  }

  const normalized = raw.replace(/[\.\/-]/g, '-');
  const ymd = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    const month = parseInt(ymd[2], 10);
    const day = parseInt(ymd[3], 10);
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  const compactYmd = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactYmd) {
    const year = parseInt(compactYmd[1], 10);
    const month = parseInt(compactYmd[2], 10);
    const day = parseInt(compactYmd[3], 10);
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // e.g. Tue Jan 06 1998 00:00:00 GMT+0800 (台北標準時間)
  const sanitized = raw.replace(/\s*\([^)]*\)\s*$/, '');
  const parsed = new Date(sanitized);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

function extractMmd(value) {
  const parsedDate = parseDateLike(value);
  if (parsedDate) {
    return Utilities.formatDate(parsedDate, 'Asia/Taipei', 'MMdd');
  }

  if (value === undefined || value === null) return '';

  const raw = value.toString().trim();
  if (!raw) return '';

  if (/^\d{4}$/.test(raw)) return raw;

  return '';
}

function normalizeStudentId(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/\u3000/g, ' ')
    .trim()
    .toUpperCase();
}

function extractBirthParts(value) {
  const parsedDate = parseDateLike(value);
  if (parsedDate) {
    return {
      year: parsedDate.getFullYear().toString(),
      month: (parsedDate.getMonth() + 1).toString(),
      day: parsedDate.getDate().toString()
    };
  }

  return null;
}

function createJsonResponse(responseObject) {
  return ContentService.createTextOutput(JSON.stringify(responseObject))
    .setMimeType(ContentService.MimeType.JSON);
}
