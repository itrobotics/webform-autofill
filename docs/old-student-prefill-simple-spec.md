# 舊生快速帶入（簡版規格）

## 1. Project Goal
- 建立「舊生快速帶入」流程：家長先驗證舊生身分，再自動帶入報名表核心資料。
- 不改動既有送單主流程（`app.js` 送出邏輯維持原樣）。
- 統一 5 張表單使用同一支 prefill loader，降低維護成本。

## 2. User Scenario
1. 使用者從 `course-registration-system/index.html` 進入：
   - `camp/camp.html`（非套票 / 套票）
   - `theme/theme.html`（單報 / 套票）
   - `math/math.html`（單一入口）
2. 舊生可點「舊生快速帶入」連到 `camp/normal/old-student-login.html?target=xxx`。
3. 輸入「學生編號 + 生日末四碼（MMDD）」後查詢。
4. 成功：寫入 `sessionStorage.camp_prefill`，導向目標表單並自動帶入。
5. 失敗：顯示錯誤，可改走直接填寫。

## 3. Functional Requirements
- FR-001：入口分流
  - Description：各分類入口頁提供對應舊生快速帶入按鈕。
  - Input：使用者點擊不同入口按鈕。
  - Output：帶 `target` 參數進入 `old-student-login.html`。
  - Rule：`target` 必須映射至對應表單路徑。
  - Error Handling：未知 `target` 回退 `camp-normal`。

- FR-002：舊生查詢
  - Description：用學號 + 生日末四碼查舊生。
  - Input：`student_id`, `birthday_mmdd`。
  - Output：`matched + prefill` 或錯誤訊息。
  - Rule：優先 POST，失敗 fallback JSONP。
  - Error Handling：格式錯誤、查無資料、網路錯誤需顯示訊息。

- FR-003：跨頁帶入
  - Description：查詢成功後把資料暫存並導頁。
  - Input：GAS 回傳 `prefill`。
  - Output：`sessionStorage.camp_prefill`。
  - Rule：導到 `target` 對應表單。
  - Error Handling：JSON 解析失敗時不中斷頁面可操作。

- FR-004：表單預填
  - Description：5 張表單共用 `js/prefill-loader.js`。
  - Input：`sessionStorage.camp_prefill`。
  - Output：姓名、生日、地址、家長聯絡資料等欄位帶入。
  - Rule：支援 alias、select/radio/checkbox 模糊匹配、台/臺正規化。
  - Error Handling：找不到欄位時跳過並不中斷。

## 4. Non-Functional Requirements
- 安全性：不在 URL 放個資，僅用 `sessionStorage`。
- 可維護性：單一 loader（`js/prefill-loader.js`）集中維護。
- 相容性：維持既有純 HTML + JS 架構。
- 體驗：手機版入口按鈕需可點、流程不中斷。
- 錯誤可讀性：使用者可理解的中文提示。

## 5. Modules / Components
- Module：入口頁分流
  - Related Files：
    - `course-registration-system/index.html`
    - `course-registration-system/camp/camp.html`
    - `course-registration-system/theme/theme.html`
    - `course-registration-system/math/math.html`

- Module：舊生登入查詢
  - Related Files：
    - `course-registration-system/camp/normal/old-student-login.html`
    - `course-registration-system/camp/normal/old-student-login.js`
  - Important Functions：`getTargetFormUrl`, `initSkipLink`, `jsonpRequest`

- Module：預填引擎
  - Related Files：
    - `course-registration-system/js/prefill-loader.js`
    - 使用此檔的 5 張表單：
      - `camp/normal/camp-form.html`
      - `camp/member/camp-form.html`
      - `theme/normal/theme-form.html`
      - `theme/member/theme-form.html`
      - `math/normal/math-form.html`

- Module：後端查詢 API（GAS）
  - Related File：`course-registration-system/gas_script.gs`

## 6. Data Structure
```json
{
  "action": "lookup_old_student",
  "student_id": "S12345",
  "birthday_mmdd": "1225"
}
```

```json
{
  "success": true,
  "matched": true,
  "prefill": {
    "student_name": "王小明",
    "childName": "王小明",
    "City": "台北市",
    "medium": "Facebook,其他",
    "medium_desc": "親友推薦"
  }
}
```

## 7. API Specification
- Endpoint：GAS Web App URL（部署後網址）
- Method：POST（主）、GET + JSONP（fallback）
- Request Format：`application/x-www-form-urlencoded`
- Response Format：
  - 成功命中：`{ success:true, matched:true, prefill:{} }`
  - 成功查無：`{ success:true, matched:false, message:"..." }`
  - 失敗：`{ success:false, error_code:"...", message:"..." }`
- CORS 注意：本機開發可能遇到 CORS，前端需保留 JSONP fallback。
- Auth：無完整會員驗證（本次為輕量舊生識別）。

## 8. UI / UX Specification
- 頁面：
  - `camp/camp.html`、`theme/theme.html`、`math/math.html`：顯示舊生快速帶入入口。
  - `camp/normal/old-student-login.html`：輸入學號 + 生日末四碼。
- 狀態：
  - Loading：按鈕顯示「查詢中...」。
  - Success：導向對應表單並顯示已帶入提示。
  - Error：顯示中文錯誤。
  - Empty：無資料時可直接填寫。

## 9. Business Rules
- 舊生識別條件：`student_id + birthday_mmdd`。
- `target` 導向規則：
  - `camp-normal` -> `camp/normal/camp-form.html`
  - `camp-member` -> `camp/member/camp-form.html`
  - `theme-normal` -> `theme/normal/theme-form.html`
  - `theme-member` -> `theme/member/theme-form.html`
  - `math-normal` -> `math/normal/math-form.html`
- `medium_desc` 有值時，需自動勾選「其他」。

## 10. Edge Cases
1. `target` 不存在或拼錯。
2. `birthday_mmdd` 非 4 碼。
3. 學號有大小寫/空白。
4. POST 被 CORS 擋下。
5. JSONP 請求逾時。
6. GAS 回傳格式異常。
7. `sessionStorage` 資料損毀 JSON parse 失敗。
8. 表單欄位名稱改版（alias 不足）。
9. 縣市台/臺字形不一致。
10. `medium` 空白但 `medium_desc` 有值。

## 11. Implementation Plan
- Step 1
  - Goal：完成入口分流（camp/theme/math）
  - Files：`camp.html`, `theme.html`, `math.html`
  - Action：新增舊生快速帶入按鈕與正確 `target`

- Step 2
  - Goal：完成舊生查詢與導流
  - Files：`old-student-login.js`, `gas_script.gs`
  - Action：查詢 API、成功寫入 storage、導向 target

- Step 3
  - Goal：統一 prefill 架構
  - Files：`js/prefill-loader.js` + 5 張 form html
  - Action：全部改引用共用 loader

- Step 4
  - Goal：清理舊架構
  - Files：`camp/normal/camp-prefill-loader.js`
  - Action：刪除舊檔並確認無引用

## 12. Acceptance Criteria
- AC-001：從三大入口都可進舊生快速帶入。
- AC-002：查詢成功會導到正確 target 表單。
- AC-003：5 張表單皆由同一支 `js/prefill-loader.js` 帶入。
- AC-004：查無資料時可直接填寫，不阻塞報名。
- AC-005：全專案無 `camp-prefill-loader.js` 殘留引用。

## 13. Suggested Test Cases
1. camp 非套票舊生流程。
2. camp 套票舊生流程。
3. theme 單報舊生流程。
4. theme 套票舊生流程。
5. math 舊生流程。
6. 錯誤生日格式。
7. 查無資料流程。
8. `medium_desc` fallback 是否生效。

## 14. Open Questions
- 是否要對查詢嘗試次數做節流/封鎖？
- 是否要把 debug log 改成可切換旗標？
- 是否要加「最後更新時間」提示給客服檢查 prefill 新舊資料？

## 15. Suggested Next Prompt
```text
請依 docs/old-student-prefill-simple-spec.md，先做一次靜態 code review：
1) 確認 gas_script.gs 的 alias 覆蓋是否完整
2) 確認 js/prefill-loader.js 的欄位映射與 5 張 form 欄位一致
3) 列出需要補的測試案例與風險（不用啟動程式）
```

## Assumptions
- 假設本次不新增 DB/會員系統，沿用 GAS + Sheet。
- 假設既有送單流程穩定，僅做前置查詢與預填。
- 假設 target 分流規則以目前 5 張表單為唯一範圍。