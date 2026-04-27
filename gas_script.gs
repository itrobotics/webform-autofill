const SPREADSHEET_ID = '1hBO7Dd6O0CpvWNby9gJ0PetltLYjMB5uYgl4xIY1LH4';
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1hBO7Dd6O0CpvWNby9gJ0PetltLYjMB5uYgl4xIY1LH4/edit';
const SHEET_NAME = 'student';

function doGet(e) {
  const requestData = (e && e.parameter) ? e.parameter : {};
  const result = handleRequestByAction(requestData);

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
    const rawContents = (e && e.postData && e.postData.contents)
      ? String(e.postData.contents)
      : '';

    logDebug('doPost:incoming_meta', {
      contentType: contentType,
      hasPostData: !!(e && e.postData),
      hasParameter: !!(e && e.parameter),
      parameterKeys: (e && e.parameter) ? Object.keys(e.parameter) : [],
      rawPreview: truncateTextForLog(rawContents, 800)
    });

    if (contentType.indexOf('application/json') !== -1) {
      requestData = rawContents
        ? JSON.parse(rawContents)
        : {};
    } else if (e && e.parameter && Object.keys(e.parameter).length > 0) {
      requestData = e.parameter;
    } else if (rawContents) {
      requestData = parseFormUrlEncodedBody(rawContents);

      logDebug('doPost:fallback_parse_form_urlencoded', {
        parsedKeys: Object.keys(requestData)
      });
    }

    logDebug('doPost:parsed_request', {
      action: requestData && requestData.action ? requestData.action : '',
      keys: requestData ? Object.keys(requestData) : []
    });
  } catch (error) {
    logDebug('doPost:parse_error', { error: error && error.toString ? error.toString() : String(error) });
    return createJsonResponse({
      success: false,
      error_code: "BAD_REQUEST",
      message: "Invalid JSON payload."
    });
  }

  const result = handleRequestByAction(requestData || {});
  logDebug('doPost:result', {
    success: !!(result && result.success),
    action: result && result.action ? result.action : '',
    error_code: result && result.error_code ? result.error_code : '',
    message: result && result.message ? result.message : ''
  });

  return createJsonResponse(result);
}

function parseFormUrlEncodedBody(rawContents) {
  const result = {};
  if (!rawContents) return result;

  const pairs = String(rawContents).split('&');
  pairs.forEach(pair => {
    if (!pair) return;
    const idx = pair.indexOf('=');
    const rawKey = idx >= 0 ? pair.slice(0, idx) : pair;
    const rawValue = idx >= 0 ? pair.slice(idx + 1) : '';

    const key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
    const value = decodeURIComponent(rawValue.replace(/\+/g, ' '));

    if (!key) return;
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      result[key] = [].concat(result[key], value);
    } else {
      result[key] = value;
    }
  });

  return result;
}

function handleRequestByAction(requestData) {
  const action = requestData && requestData.action ? String(requestData.action).trim() : '';

  if (action === 'lookup_old_student') {
    return handleLookupOldStudentData(requestData);
  }

  if (action === 'write_form_submission') {
    return handleWriteFormSubmission(requestData);
  }

  if (action === 'ping') {
    return handlePing(requestData);
  }

  if (action === 'debug_target_sheet') {
    return handleDebugTargetSheet(requestData);
  }

  return {
    success: false,
    error_code: 'INVALID_ACTION',
    message: 'Unknown action.'
  };
}

function handleDebugTargetSheet(requestData) {
  try {
    let spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    } catch (openErr) {
      return {
        success: false,
        action: 'debug_target_sheet',
        error_code: 'OPEN_SPREADSHEET_FAILED',
        message: '無法開啟試算表，請確認 Apps Script 執行帳號是否有權限。',
        debug: {
          spreadsheet_id: SPREADSHEET_ID,
          spreadsheet_url: SPREADSHEET_URL,
          detail: openErr && openErr.toString ? openErr.toString() : String(openErr)
        }
      };
    }

    const sheet = getOrCreateSheet(spreadsheet, SHEET_NAME);
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    const headers = lastColumn > 0
      ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
      : [];
    const lastRowValues = (lastRow > 1 && lastColumn > 0)
      ? sheet.getRange(lastRow, 1, 1, lastColumn).getValues()[0]
      : [];

    return {
      success: true,
      action: 'debug_target_sheet',
      source: requestData && requestData.source ? String(requestData.source) : '',
      spreadsheet: {
        id: spreadsheet.getId(),
        url: spreadsheet.getUrl(),
        name: spreadsheet.getName()
      },
      sheet: {
        id: sheet.getSheetId(),
        name: sheet.getName(),
        last_row: lastRow,
        last_column: lastColumn,
        frozen_rows: sheet.getFrozenRows(),
        frozen_columns: sheet.getFrozenColumns()
      },
      headers: headers,
      last_row_values: lastRowValues
    };
  } catch (error) {
    return {
      success: false,
      action: 'debug_target_sheet',
      error_code: 'SERVER_ERROR',
      message: error && error.toString ? error.toString() : String(error)
    };
  }
}

function handlePing(requestData) {
  logDebug('ping:received', {
    action: requestData && requestData.action ? requestData.action : '',
    source: requestData && requestData.source ? requestData.source : ''
  });

  return {
    success: true,
    action: 'ping',
    message: 'pong',
    server_time: Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss')
  };
}

function handleWriteFormSubmission(requestData) {
  try {
    logDebug('write_form_submission:start', {
      request_keys: requestData ? Object.keys(requestData) : []
    });

    let formDataPayload = requestData && requestData.formDataPayload
      ? requestData.formDataPayload
      : null;

    if (typeof formDataPayload === 'string') {
      logDebug('write_form_submission:payload_string_detected', {
        length: formDataPayload.length
      });
      try {
        formDataPayload = JSON.parse(formDataPayload);
      } catch (parseErr) {
        logDebug('write_form_submission:payload_parse_error', {
          error: parseErr && parseErr.toString ? parseErr.toString() : String(parseErr)
        });
        return {
          success: false,
          error_code: 'INVALID_PAYLOAD_JSON',
          message: 'formDataPayload string is not valid JSON.'
        };
      }
    }

    if (!formDataPayload || typeof formDataPayload !== 'object' || Array.isArray(formDataPayload)) {
      logDebug('write_form_submission:invalid_payload', {
        payload_type: typeof formDataPayload,
        is_array: Array.isArray(formDataPayload)
      });
      return {
        success: false,
        error_code: 'INVALID_PAYLOAD',
        message: 'formDataPayload is required and must be an object.'
      };
    }

    let spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    } catch (openErr) {
      return {
        success: false,
        error_code: 'OPEN_SPREADSHEET_FAILED',
        message: '無法開啟試算表，請確認 Apps Script 執行帳號是否有權限。',
        debug: {
          spreadsheet_id: SPREADSHEET_ID,
          spreadsheet_url: SPREADSHEET_URL,
          detail: openErr && openErr.toString ? openErr.toString() : String(openErr)
        }
      };
    }

    const sheet = getOrCreateSheet(spreadsheet, SHEET_NAME);

    logDebug('write_form_submission:target_sheet', {
      spreadsheet_url: SPREADSHEET_URL,
      sheet_name: sheet.getName(),
      last_row_before: sheet.getLastRow(),
      last_col_before: sheet.getLastColumn()
    });

    const normalizedData = normalizeSubmissionPayload(formDataPayload, requestData);
    const normalizedKeys = Object.keys(normalizedData);

    logDebug('write_form_submission:normalized', {
      key_count: normalizedKeys.length,
      sample_keys: normalizedKeys.slice(0, 15)
    });

    if (!normalizedKeys.length) {
      return {
        success: false,
        error_code: 'EMPTY_PAYLOAD',
        message: 'No writable fields in formDataPayload.'
      };
    }

    const syncResult = syncSheetHeaders(sheet, normalizedKeys);
    const finalHeaders = syncResult.headers;
    const rowValues = finalHeaders.map(header => (
      Object.prototype.hasOwnProperty.call(normalizedData, header)
        ? normalizedData[header]
        : ''
    ));

    sheet.appendRow(rowValues);

    logDebug('write_form_submission:append_success', {
      appended_row: sheet.getLastRow(),
      added_headers: syncResult.addedHeaders
    });

    return {
      success: true,
      action: 'write_form_submission',
      sheet: SHEET_NAME,
      appended_row: sheet.getLastRow(),
      added_headers: syncResult.addedHeaders,
      written_fields: normalizedKeys.length
    };
  } catch (error) {
    logDebug('write_form_submission:server_error', {
      error: error && error.toString ? error.toString() : String(error)
    });
    return {
      success: false,
      error_code: 'SERVER_ERROR',
      message: error && error.toString ? error.toString() : String(error)
    };
  }
}

function getOrCreateSheet(spreadsheet, sheetName) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    logDebug('write_form_submission:sheet_created', {
      sheet_name: sheetName
    });
  }
  return sheet;
}

function normalizeSubmissionPayload(formDataPayload, requestData) {
  const result = {};
  const consumedKeys = {};

  const recId = pickPayloadValueByAliases(formDataPayload, ['recId', 'record_id', 'id'], consumedKeys)
    || generateSubmissionRecId();
  const createDate = pickPayloadValueByAliases(formDataPayload, ['createDate', 'create_date', 'created_at'], consumedKeys)
    || Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss');
  const formName = pickPayloadValueByAliases(formDataPayload, ['formName', 'form_name', 'schema_name'], consumedKeys)
    || pickPayloadValueByAliases(formDataPayload, ['schema'], consumedKeys)
    || 'course-registration-system';
  const studentNo = pickPayloadValueByAliases(formDataPayload, ['studentNo', 'student_no', 'student_id', 'studentId'], consumedKeys);
  const childName = pickPayloadValueByAliases(formDataPayload, ['childName', 'kidsName', 'customerName', 'student_name', 'name'], consumedKeys);
  const gender = pickPayloadValueByAliases(formDataPayload, ['gender', 'sex'], consumedKeys);
  const birthday = pickPayloadValueByAliases(formDataPayload, ['birthday', 'birthdate'], consumedKeys)
    || composeBirthdayFromParts(formDataPayload, consumedKeys);
  const schoolName = pickPayloadValueByAliases(formDataPayload, ['schoolName', 'school_name', 'school'], consumedKeys);
  const grade = pickPayloadValueByAliases(formDataPayload, ['grade'], consumedKeys);
  const idNumber = pickPayloadValueByAliases(formDataPayload, ['idNumber', 'id_number', 'nationalNo'], consumedKeys);
  const city = pickPayloadValueByAliases(formDataPayload, ['City', 'city', 'commCity'], consumedKeys);
  const address = pickPayloadValueByAliases(formDataPayload, ['address', 'commAddr', 'commAddress'], consumedKeys);
  const relations = pickPayloadValueByAliases(formDataPayload, ['Relations', 'relation', 'relationship'], consumedKeys);
  const emergencyPhone = pickPayloadValueByAliases(formDataPayload, ['emergencyPhone', 'emergency_phone'], consumedKeys);
  const parentName = pickPayloadValueByAliases(formDataPayload, ['parentName', 'parent_name'], consumedKeys);
  const parentPhone = pickPayloadValueByAliases(formDataPayload, ['parentPhone', 'parent_phone', 'cellPhone'], consumedKeys);
  const lunch = pickPayloadValueByAliases(formDataPayload, ['lunch', 'lunch_type'], consumedKeys);
  const parentEmail = pickPayloadValueByAliases(formDataPayload, ['parents_email', 'parentEmail', 'parent_email', 'email'], consumedKeys);
  const medium = pickPayloadValueByAliases(formDataPayload, ['medium', 'mediaSource'], consumedKeys);
  const mediumDesc = pickPayloadValueByAliases(formDataPayload, ['medium_desc', 'mediaSourceOther'], consumedKeys);
  const allergyFood = pickPayloadValueByAliases(formDataPayload, ['allergyFood', 'food_allergy'], consumedKeys);

  // 優先映射到既有左側欄位（便於肉眼檢查）
  result.recId = toSheetCellValue(recId);
  result.createDate = toSheetCellValue(createDate);
  result.formName = toSheetCellValue(formName);
  result.studentNo = toSheetCellValue(studentNo);
  result.childName = toSheetCellValue(childName);
  result.gender = toSheetCellValue(gender);
  result.birthday = toSheetCellValue(birthday);
  result.schoolName = toSheetCellValue(schoolName);
  result.grade = toSheetCellValue(grade);
  result.idNumber = toSheetCellValue(idNumber);
  result.City = toSheetCellValue(city);
  result.address = toSheetCellValue(address);
  result.Relations = toSheetCellValue(relations);
  result.emergencyPhone = toSheetCellValue(emergencyPhone);
  result.parentName = toSheetCellValue(parentName);
  result.parentPhone = toSheetCellValue(parentPhone);
  result.lunch = toSheetCellValue(lunch);
  result.parents_email = toSheetCellValue(parentEmail);
  result.medium = toSheetCellValue(medium);
  result.medium_desc = toSheetCellValue(mediumDesc);
  result.allergyFood = toSheetCellValue(allergyFood);

  Object.keys(formDataPayload).forEach(key => {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) return;

    if (Object.prototype.hasOwnProperty.call(consumedKeys, key)) return;
    if (Object.prototype.hasOwnProperty.call(result, normalizedKey)) return;

    result[normalizedKey] = toSheetCellValue(formDataPayload[key]);
  });

  result._action = requestData && requestData.action ? String(requestData.action) : '';
  result._source = requestData && requestData.source ? String(requestData.source) : '';
  result._submitted_at = requestData && requestData.submitted_at ? String(requestData.submitted_at) : '';
  result._received_at = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');

  return result;
}

function pickPayloadValueByAliases(payload, aliases, consumedKeys) {
  if (!payload || typeof payload !== 'object') return '';
  const keys = Object.keys(payload);
  if (!keys.length || !aliases || !aliases.length) return '';

  const normalizedAliasSet = aliases.map(alias => normalizeHeaderKey(alias));
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const normalizedKey = normalizeHeaderKey(key);
    if (normalizedAliasSet.indexOf(normalizedKey) === -1) continue;

    consumedKeys[key] = true;
    const value = payload[key];
    if (value === undefined || value === null) return '';
    return value;
  }

  return '';
}

function composeBirthdayFromParts(payload, consumedKeys) {
  const year = pickPayloadValueByAliases(payload, ['year', 'birth_year'], consumedKeys);
  const month = pickPayloadValueByAliases(payload, ['month', 'birth_month'], consumedKeys);
  const day = pickPayloadValueByAliases(payload, ['day', 'birth_day'], consumedKeys);

  if (!year || !month || !day) return '';
  return `${year}/${month}/${day}`;
}

function generateSubmissionRecId() {
  const timestamp = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss');
  const randomPart = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `R${timestamp}${randomPart}`;
}

function toSheetCellValue(value) {
  if (value === undefined || value === null) return '';

  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (item === undefined || item === null) return '';
        if (typeof item === 'object') return JSON.stringify(item);
        return String(item);
      })
      .join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function syncSheetHeaders(sheet, incomingKeys) {
  const lastColumn = sheet.getLastColumn();
  const existingHeaders = lastColumn > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(h => String(h || '').trim())
    : [];

  const missingHeaders = incomingKeys.filter(key => existingHeaders.indexOf(key) === -1);

  if (missingHeaders.length) {
    sheet.getRange(1, lastColumn + 1, 1, missingHeaders.length).setValues([missingHeaders]);
  }

  const finalLastColumn = sheet.getLastColumn();
  const finalHeaders = finalLastColumn > 0
    ? sheet.getRange(1, 1, 1, finalLastColumn).getValues()[0].map(h => String(h || '').trim())
    : [];

  return {
    headers: finalHeaders,
    addedHeaders: missingHeaders
  };
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
    const createDateIndex = findHeaderIndexByAliases(headers, ['createDate', 'create_date', 'created_at', '建立日期', '建檔日期', '建立時間', '建檔時間']);

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

    let matchedCandidate = null;
    const debugSamples = [];

    const isCurrentCandidateNewer = (current, previous) => {
      if (!previous) return true;

      if (current.createDate && previous.createDate) {
        return current.createDate.getTime() > previous.createDate.getTime();
      }

      if (current.createDate && !previous.createDate) return true;
      if (!current.createDate && previous.createDate) return false;

      return current.rowNumber > previous.rowNumber;
    };

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 1;
      const rowId = normalizeStudentId(row[idIndex]);
      const rowBirthdayMmd = extractMmd(row[birthdayIndex]);
      const rowCreateDateRaw = createDateIndex !== -1 ? row[createDateIndex] : '';
      const rowCreateDate = parseDateLike(rowCreateDateRaw);

      if (debugSamples.length < 5) {
        debugSamples.push({
          row: rowNumber,
          student_id: rowId,
          birthday_mmdd: rowBirthdayMmd,
          create_date: rowCreateDateRaw !== undefined && rowCreateDateRaw !== null ? String(rowCreateDateRaw) : ''
        });
      }

      if (rowId === studentId && rowBirthdayMmd === birthdayMmd) {
        if (activeIndex !== -1 && !isActiveValue(row[activeIndex])) {
          continue;
        }

        const candidate = {
          row: row,
          rowNumber: rowNumber,
          birthdayRaw: row[birthdayIndex],
          createDate: rowCreateDate
        };

        if (isCurrentCandidateNewer(candidate, matchedCandidate)) {
          matchedCandidate = candidate;
        }
      }
    }

    if (!matchedCandidate) {
      return {
        success: true,
        matched: false,
        message: "找不到符合的舊生資料，請確認資料是否正確。",
        debug: {
          headers: headers,
          matched_headers: {
            student_id: headers[idIndex],
            birthday: headers[birthdayIndex],
            active: activeIndex >= 0 ? headers[activeIndex] : '',
            createDate: createDateIndex >= 0 ? headers[createDateIndex] : ''
          },
          input_student_id: studentId,
          input_birthday_mmdd: birthdayMmd,
          sample_rows: debugSamples
        }
      };
    }

    const matchedRecord = matchedCandidate.row;
    const matchedBirthdayRaw = matchedCandidate.birthdayRaw;

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

function logDebug(label, data) {
  try {
    console.log(`[${label}] ${JSON.stringify(data)}`);
  } catch (err) {
    console.log(`[${label}] (unserializable)`);
  }
}

function truncateTextForLog(text, maxLength) {
  const raw = String(text || '');
  if (!maxLength || raw.length <= maxLength) return raw;
  return `${raw.slice(0, maxLength)}...(truncated, total=${raw.length})`;
}
