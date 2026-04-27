//通用課程報名系統 JavaScript - 統一版本
const GAS_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbzBf4UjIHIBswafVht5lHqq7TQpu0eFQk_qdikWR3F-HX3DAoNrmxcQai8dIQm10dQwPw/exec';

const gasSubmitState = {
  isSubmitting: false,
  callbackTriggered: false,
  fallbackTimer: null,
};

//清除按鈕用
document.querySelectorAll('.chooseCourse .item').forEach((item) => {
  const radios = item.querySelectorAll('input[type="radio"]');
  const clearBtn = item.querySelector('.clearRadio');

  // 點選任一 radio，顯示清除按鈕
  radios.forEach((radio) => {
    radio.addEventListener('change', () => {
      clearBtn.style.display = 'inline-block';
    });
  });

  // 點清除按鈕
  clearBtn.addEventListener('click', (event) => {
    event.preventDefault(); // 阻止預設的錨點行為
    radios.forEach((radio) => {
      radio.checked = false;
    });
    clearBtn.style.display = 'none'; // 清除後再隱藏按鈕
  });
});

//UX設定，驗證通過icon轉換
document.addEventListener('DOMContentLoaded', () => {
  const items = document.querySelectorAll('.item'); // 確保選取所有 .item 節點

  function updateOkIcons(item) {
    const ok = item.querySelector('.ok');
    if (!ok) return; // 如果 .ok 節點不存在，直接返回

    const inputs = item.querySelectorAll('input, select'); // 包含所有 input 和 select

    let allValid = true;
    
    // 檢查是否為必填的 checkbox 群組（mediaSourceGroup 或 materialGroup）
    const isRequiredCheckboxGroup = item.classList.contains('required') && 
    (item.classList.contains('mediaSourceGroup') || item.classList.contains('materialGroup'));
    
    if (isRequiredCheckboxGroup) {
      // 對於必填的 checkbox 群組，檢查是否至少有一個被選中
      const checkboxes = item.querySelectorAll('input[type="checkbox"]');
      const hasChecked = Array.from(checkboxes).some((checkbox) => checkbox.checked);
      if (!hasChecked) {
        allValid = false;
      }
    }
    
    inputs.forEach((input) => {
      if (input.type === 'radio') {
        // 檢查同組 radio 是否有被選中
        const radioGroup = item.querySelectorAll(`input[name="${input.name}"]`);
        const isChecked = Array.from(radioGroup).some((radio) => radio.checked);
        if (!isChecked) {
          allValid = false;
        }
      } else if (input.type !== 'checkbox' && !input.checkValidity()) {
        // 對於非 checkbox 的 input，使用原生驗證
        // checkbox 的驗證已經在上面的 isRequiredCheckboxGroup 中處理了
        allValid = false;
      }
    });

    const error = ok.querySelector('i:nth-child(1)');
    const correct = ok.querySelector('i:nth-child(2)');

    if (allValid) {
      error.style['visibility'] = 'hidden';
      error.style['opacity'] = '0';
      error.style['transform'] = 'rotate(180deg)';
      correct.style['visibility'] = 'visible';
      correct.style['opacity'] = '1';
      correct.style['transform'] = 'rotate(0deg)';
    } else {
      error.style['visibility'] = 'visible';
      error.style['opacity'] = '1';
      error.style['transform'] = 'rotate(0deg)';
      correct.style['visibility'] = 'hidden';
      correct.style['opacity'] = '0';
      correct.style['transform'] = 'rotate(-180deg)';
    }
  }

  items.forEach((item) => {
    const inputs = item.querySelectorAll('input, select');
    inputs.forEach((input) => {
      input.addEventListener('input', () => updateOkIcons(item));
      input.addEventListener('change', () => updateOkIcons(item));
    });

    // 初始化時更新 icon 狀態
    updateOkIcons(item);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const recaptchaButtons = document.querySelectorAll('.g-recaptcha');
  recaptchaButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      scheduleRecaptchaFallbackSubmit();
    });
  });
});

document.addEventListener('DOMContentLoaded', () => {

    // 0. 取得填表日期
  const doneFormYear = new Date().getFullYear() - 1911;
  const doneFormMonth = new Date().getMonth() + 1;
  const doneFormDate = new Date().getDate();
  //console.log(doneFromYear + "年" + doneFormMonth + "月" + doneFromDate + "日");

  mainForm.elements.doneFormYear.value = doneFormYear;
  mainForm.elements.doneFormMonth.value = doneFormMonth;
  mainForm.elements.doneFormDate.value = doneFormDate;

  // 1.確認被按下
  $('#checkBtn').click(() => {
    // 1-1(單報).套用媒體來源多選規則，要選最少一個選項
    if ($('div.mediaSourceGroup.required :checkbox:checked').length > 0) {
      $('div.mediaSourceGroup.required :checkbox').prop('required', false);
    } else {
      $('div.mediaSourceGroup.required :checkbox').prop('required', true);
    }

    // 1-1(套票).套用教材選擇多選規則，要選最少一個選項
    if ($('div.materialGroup.required :checkbox:checked').length > 0) {
      $('div.materialGroup.required :checkbox').prop('required', false);
    } else {
      $('div.materialGroup.required :checkbox').prop('required', true);
    }

    // 1-1.觸發 form 的 checkValidity()，觸發後，若有未填寫的必填欄位，會自動 focus 到該欄位
    let form = document.forms['mainForm'];
    let pass = form.checkValidity();

    // 1-2.完整性檢測結果提示
    if (pass) {
      Swal.fire({
        icon: 'info',
        title: 'Ok~',
        text: '填寫無誤，請再次確認並送出資料',
      }).then(() => {
        // 1-3.將資料寫入至確認框中
        writeDataToModal();

        // 2.顯示確認框
        $('#Modal').modal('show');
      });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Oops...',
        text: '請確認資料是否確實填寫及填寫正確',
        returnFocus: false,
      }).then(() => {
        // 1-4.錯誤處理
        form.reportValidity();
      });
    }
  });
});

// 寫入Data至Modal中
function writeDataToModal() {
  
  //layout1
  const kidsName = mainForm.elements.kidsName
    ? mainForm.elements.kidsName.value
    : '';
  const customerName = mainForm.elements.customerName
    ? mainForm.elements.customerName.value
    : '';
  const finalName = kidsName || customerName;

  if (document.querySelector('.checkKidsName')) {
    document.querySelector('.checkKidsName').innerHTML = finalName;
  }
  if (document.querySelector('.checkCustomerName')) {
    document.querySelector('.checkCustomerName').innerHTML = finalName;
  }

  const gender = mainForm.elements.gender ? mainForm.elements.gender.value : '';
  if (document.querySelector('.checkGender')) {
    document.querySelector('.checkGender').innerHTML = gender;
  }

  //brithday
  const year = mainForm.elements.year ? mainForm.elements.year.value : '';
  const month = mainForm.elements.month ? mainForm.elements.month.value : '';
  const day = mainForm.elements.day ? mainForm.elements.day.value : '';
  const birthday = `${year}/${month}/${day}`;
  if (document.querySelector('.checkBirthday')) {
    document.querySelector('.checkBirthday').innerHTML = birthday;
  }

  const schoolName = mainForm.elements.schoolName
    ? mainForm.elements.schoolName.value
    : '';
  if (document.querySelector('.checkSchoolName')) {
    document.querySelector('.checkSchoolName').innerHTML = schoolName;
  }

  const grade = mainForm.elements.grade ? mainForm.elements.grade.value : '';
  if (document.querySelector('.checkGrade')) {
    document.querySelector('.checkGrade').innerHTML = grade;
  }

  //身分證字號 (可空值)
  const nationalNo = mainForm.elements.nationalNo
    ? mainForm.elements.nationalNo.value
    : '';
  if (document.querySelector('.checkId')) {
    document.querySelector('.checkId').innerHTML = 
    nationalNo === '' ? null : nationalNo;
  }

  const emergencyPhone = mainForm.elements.emergencyPhone
    ? mainForm.elements.emergencyPhone.value
    : '';
  if (document.querySelector('.checkEmergencyPhone')) {
    document.querySelector('.checkEmergencyPhone').innerHTML = emergencyPhone;
  }

  //address
  let c_city = mainForm.elements.commCity
    ? mainForm.elements.commCity.value
    : '';
  let c_addr = mainForm.elements.commAddr
    ? mainForm.elements.commAddr.value
    : '';
  const commAddr = c_city + c_addr;
  if (document.querySelector('.checkCommAddr')) {
    document.querySelector('.checkCommAddr').innerHTML = commAddr;
  }

  //午餐
  const lunch = mainForm.elements.lunch ? mainForm.elements.lunch.value : '';
  if (document.querySelector('.checkLunch')) {
    document.querySelector('.checkLunch').innerHTML = lunch;
  }

  //過敏食物 (可空值)
  const allergyFood = mainForm.elements.allergyFood
    ? mainForm.elements.allergyFood.value
    : '';
  if (document.querySelector('.checkAllergyFood')) {
    document.querySelector('.checkAllergyFood').innerHTML =
      allergyFood === '' ? '無' : allergyFood;
  }

  //layout2
  const parentName = mainForm.elements.parentName
    ? mainForm.elements.parentName.value
    : '';
  if (document.querySelector('.checkParentName')) {
    document.querySelector('.checkParentName').innerHTML = parentName;
  }

  const cellPhone = mainForm.elements.cellPhone
    ? mainForm.elements.cellPhone.value
    : '';
  if (document.querySelector('.checkCellphone')) {
    document.querySelector('.checkCellphone').innerHTML = cellPhone;
  }

  const relation = mainForm.elements.relation
    ? mainForm.elements.relation.value
    : '';
  if (document.querySelector('.checkRelation')) {
    document.querySelector('.checkRelation').innerHTML = relation;
  }

  const email = mainForm.elements.email ? mainForm.elements.email.value : '';
  if (document.querySelector('.checkEmail')) {
    document.querySelector('.checkEmail').innerHTML = email;
  }

  //media (用來確認checkedbox必填部分)
  const mediaSource = getMediaArr();
  const mediaSourceOther = mainForm.elements.mediaSourceOther
    ? mainForm.elements.mediaSourceOther.value
    : '';
  if (document.querySelector('.checkMediaSource')) {
    document.querySelector('.checkMediaSource').innerHTML =
      mediaSource + mediaSourceOther;
  }

  //layout3
  const itSchool = mainForm.elements.itSchool
    ? mainForm.elements.itSchool.value
    : '';
  if (document.querySelector('.checkItSchool')) {
    document.querySelector('.checkItSchool').innerHTML = itSchool;
  }

  //營隊報名表專用 => 課程選擇區塊(可重複，值 !== null) - 動態處理所有可能的週次
  const campWeeks = [];
  for (let i = 1; i <= 10; i++) {
    const campWeekField = `campWeek${i}`;
    if (mainForm.elements[campWeekField]) {
      const weekValue = mainForm.elements[campWeekField].value;
      if (weekValue) {
        campWeeks.push(weekValue);
      }
    }
  }

  //程式常態報名表專用 => 課程選擇區塊(可重複，值 !== null) - 動態處理所有可能的時間
  const weekend = [];
  for (let i = 1; i <= 4; i++) {
    const weekendField = `weekend${i}`;
    if (mainForm.elements[weekendField]) {
      const weekendValue = mainForm.elements[weekendField].value;
      if (weekendValue) {
        weekend.push(weekendValue);
      }
    }
  }

  //MPM數學報名表專用 => 課程選擇區塊(不可重複，所以僅會有一個值)
  const mathTime = mainForm.elements.mathTime ? mainForm.elements.mathTime.value : '';

  const chooseCourse = campWeeks.join(' , ') || weekend.join(' , ')  || mathTime;
  if (document.querySelector('.checkChooseCouse')) {
    document.querySelector('.checkChooseCouse').innerHTML =
      chooseCourse || '未選擇梯次或時數方案';
  }

  //MPM數學報名表專用 => 上課時段
  //chooseTime1
  const chooseDay1 = mainForm.elements.chooseDay1 ? mainForm.elements.chooseDay1.value : '';
  const chooseStartTime1 = mainForm.elements.chooseStartTime1 ? mainForm.elements.chooseStartTime1.value : '';
  const chooseEndTime1 = mainForm.elements.chooseEndTime1 ? mainForm.elements.chooseEndTime1.value : '';
  const chooseTime1 = `${chooseDay1} ${chooseStartTime1} - ${chooseEndTime1}`;
  if (document.querySelector('.checkChooseTime1')) {
    document.querySelector('.checkChooseTime1').innerHTML = chooseTime1;
  }

  //chooseTime2
  const chooseDay2 = mainForm.elements.chooseDay2 ? mainForm.elements.chooseDay2.value : '';
  const chooseStartTime2 = mainForm.elements.chooseStartTime2 ? mainForm.elements.chooseStartTime2.value : '';
  const chooseEndTime2 = mainForm.elements.chooseEndTime2 ? mainForm.elements.chooseEndTime2.value : '';
  const chooseTime2 = `${chooseDay2} ${chooseStartTime2} - ${chooseEndTime2}`;
  if (document.querySelector('.checkChooseTime2')) {
    document.querySelector('.checkChooseTime2').innerHTML = chooseTime2;
  }
  

  const sales = mainForm.elements.sales ? mainForm.elements.sales.value : '';
  if (document.querySelector('.checkSales')) {
    document.querySelector('.checkSales').innerHTML = sales;
  }

  const mealExpenses = mainForm.elements.mealExpenses ? mainForm.elements.mealExpenses.value : '';
  if (document.querySelector('.checkMealExpenses')) {
    document.querySelector('.checkMealExpenses').innerHTML = mealExpenses;
  }

  const minecraftID = mainForm.elements.minecraftID ? mainForm.elements.minecraftID.value : '';
  if (document.querySelector('.checkMinecraftID')) {
    document.querySelector('.checkMinecraftID').innerHTML = minecraftID;
  }

  const material = getMaterialArr();
  if (document.querySelector('.checkMaterial')) {
    document.querySelector('.checkMaterial').innerHTML = material;
  }

  //加購區塊
  const extraMathCourse = mainForm.elements.extraMathCourse
    ? mainForm.elements.extraMathCourse.value
    : '';
  if (document.querySelector('.checkExtraMathCourse')) {
    document.querySelector('.checkExtraMathCourse').innerHTML = extraMathCourse;
  }

  const extraProgramCourse = mainForm.elements.extraProgramCourse
    ? mainForm.elements.extraProgramCourse.value
    : '';
  if (document.querySelector('.checkExtraProgramCourse')) {
    document.querySelector('.checkExtraProgramCourse').innerHTML =
      extraProgramCourse;
  }

  const together = mainForm.elements.together
    ? mainForm.elements.together.checked
      ? mainForm.elements.together.value
      : ''
    : '';
  const togetherName = mainForm.elements.togetherName
    ? mainForm.elements.togetherName.value
    : '';
  const togetherSales =
    together === '' && togetherName === ''
      ? '不使用團報方案'
      : together + ' , 團報姓名 : ' + togetherName;
  if (document.querySelector('.checkTogether')) {
    document.querySelector('.checkTogether').innerHTML = togetherSales;
  }

  const mgm = mainForm.elements.mgm
    ? mainForm.elements.mgm.checked
      ? mainForm.elements.mgm.value
      : ''
    : '';
  const mgmName = mainForm.elements.mgmName
    ? mainForm.elements.mgmName.value
    : '';
  const mgmSales =
    mgm === '' && mgmName === ''
      ? '無推薦人'
      : mgm + ' , 推薦人姓名 : ' + mgmName;
  if (document.querySelector('.checkMgm')) {
    document.querySelector('.checkMgm').innerHTML = mgmSales;
  }

  const pay = mainForm.elements.pay ? mainForm.elements.pay.value : '';
  if (document.querySelector('.checkPay')) {
    document.querySelector('.checkPay').innerHTML = pay;
  }

  const extraInfo = mainForm.elements.extraInfo ? mainForm.elements.extraInfo.value : '';
  const extraInfoDetail = mainForm.elements.extraInfoDetail ? mainForm.elements.extraInfoDetail.value : '';
  const extraInfoText = `${extraInfo} ${extraInfoDetail}`;
  if (document.querySelector('.checkExtraInfo')) {
    document.querySelector('.checkExtraInfo').innerHTML = extraInfoText;
  }

  const doneFormTime = mainForm.elements.doneFormYear.value + "年" + mainForm.elements.doneFormMonth.value + "月" + mainForm.elements.doneFormDate.value + "日";
  document.querySelector('.checkDoneFormDate').innerHTML = doneFormTime;
}

// 2-2.接收 recaptcha Callback and Token
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function onSubmit(token) {
  gasSubmitState.callbackTriggered = true;
  if (gasSubmitState.fallbackTimer) {
    clearTimeout(gasSubmitState.fallbackTimer);
    gasSubmitState.fallbackTimer = null;
  }

  if (gasSubmitState.isSubmitting) {
    console.warn('送出流程進行中，略過重複觸發。');
    return;
  }
  gasSubmitState.isSubmitting = true;

  console.log(`Sent with token: ${token}!!`);

  // Use javascript get full formdata and transform to JSON
  const mainForm = document.forms['mainForm'];
  const fd = new FormData(mainForm);
  // 將 FormData 轉換為 JSON
  const formDataObj = {};
  fd.forEach((value, key) => {
    if (key === 'mediaSource' || key === 'material') {
      if (!formDataObj[key]) {
        formDataObj[key] = [];
      }
      formDataObj[key].push(value);
    } else {
      formDataObj[key] = formDataObj[key]
        ? [].concat(formDataObj[key], value)
        : value;
    }
  });

  const getStudentNoFallback = () => {
    const fromFormInput = String(
      (mainForm.elements.studentNo && mainForm.elements.studentNo.value) ||
        formDataObj.studentNo ||
        '',
    )
      .trim()
      .toUpperCase();
    if (fromFormInput) return fromFormInput;

    const fromSession = String(sessionStorage.getItem('camp_student_id') || '')
      .trim()
      .toUpperCase();
    if (fromSession) return fromSession;

    try {
      const prefillRaw = sessionStorage.getItem('camp_prefill');
      if (!prefillRaw) return '';
      const prefill = JSON.parse(prefillRaw);
      return String(
        (prefill &&
          (prefill.student_no || prefill.student_id || prefill.studentNo)) ||
          '',
      )
        .trim()
        .toUpperCase();
    } catch (e) {
      console.warn('camp_prefill 解析失敗，無法回填 studentNo：', e);
      return '';
    }
  };

  const resolvedStudentNo = getStudentNoFallback();
  if (resolvedStudentNo) {
    formDataObj.studentNo = resolvedStudentNo;
    if (!formDataObj.student_id) {
      formDataObj.student_id = resolvedStudentNo;
    }
  }
  console.info('[submit] resolved studentNo:', resolvedStudentNo || '(empty)');

  // 定義通用schema
  var schema = {
    // templateDocPath 不在此處，將由後台UI動態設定
    // 這是實際提供給 docxtpl 的數據上下文指令
    dataContext: {
      //取得填寫日期
      doneFormYear: { type: 'text', template_key: 'doneform_year' },
      doneFormMonth: { type: 'text', template_key: 'doneform_month' },
      doneFormDate: { type: 'text', template_key: 'doneform_date' },

      //兼容性字段處理 - 支援kidsName和customerName
      customerName: { type: 'text', template_key: 'customer_name' },
      kidsName: { type: 'text', template_key: 'customer_name' },
      gender: {
        type: 'single_choice_checkbox',
        template_key: 'gender_',
        options: ['男', '女'],
      },
      year: { type: 'text', template_key: 'year' },
      month: { type: 'text', template_key: 'month' },
      day: { type: 'text', template_key: 'day' },
      schoolName: { type: 'text', template_key: 'school_name' },
      grade: { type: 'text', template_key: 'grade' },
      nationalNo: { type: 'text', template_key: 'national_no' },
      emergencyPhone: { type: 'text', template_key: 'emergency_phone' },
      commCity: { type: 'text', template_key: 'comm_city' },
      commAddr: { type: 'text', template_key: 'comm_addr' },
      lunch: {
        type: 'single_choice_checkbox',
        template_key: 'lunch_',
        options: ['葷', '素'],
      },
      allergyFood: {
        type: 'text',
        template_key: 'allergy_food',
        default_value: '無',
      },
      parentName: { type: 'text', template_key: 'parent_name' },
      cellPhone: { type: 'text', template_key: 'cell_phone' },
      relation: { type: 'text', template_key: 'relation' },
      email: { type: 'text', template_key: 'email' },
      mediaSource: {
        type: 'text',
        template_key: 'media_source_',
        details_mapping: { 其他: 'mediaSourceOther' },
      },
      itSchool: { type: 'text', template_key: 'it_school' },
      chooseDay1: { type: 'text', template_key: 'choose_day_1' },
      chooseStartTime1: { type: 'text', template_key: 'choose_start_time_1' },
      chooseEndTime1: { type: 'text', template_key: 'choose_end_time_1' },
      chooseDay2: { type: 'text', template_key: 'choose_day_2' },
      chooseStartTime2: { type: 'text', template_key: 'choose_start_time_2' },
      chooseEndTime2: { type: 'text', template_key: 'choose_end_time_2' },
      sales: { type: 'text', template_key: 'sales' },
      minecraftID: {
        type: 'single_choice_checkbox',
        template_key: 'minecraft_id_',
        options: ['無', '共享帳號', '獨立帳號'],
      },
      material: { type: 'text', template_key: 'material_' },
      mealExpenses: { type: 'text', template_key: 'meal_expenses' },

      extraMathCourse: { type: 'text', template_key: 'extra_math_course' },
      extraProgramCourse: {
        type: 'text',
        template_key: 'extra_program_course',
      },
      together: {
        type: 'single_choice_checkbox',
        template_key: 'together_',
        options: ['使用團報'],
      },
      togetherName: { type: 'text', template_key: 'together_name' },
      mgm: {
        type: 'single_choice_checkbox',
        template_key: 'mgm_',
        options: ['有'],
      },
      mgmName: { type: 'text', template_key: 'mgm_name' },
      
      pay: { type: 'text', template_key: 'pay' },
      extraInfoText: { type: 'text', template_key: 'extra_info' },
      formType: { type: 'text', template_key: 'form_type' },
      formName: { type: 'text', template_key: 'form_name' },
      formVersion: { type: 'text', template_key: 'form_version' },
      // 營隊專用 => 動態處理所有可能的課程週次
      campWeek1: { type: 'text', template_key: 'camp_week_1' },
      campWeek2: { type: 'text', template_key: 'camp_week_2' },
      campWeek3: { type: 'text', template_key: 'camp_week_3' },
      campWeek4: { type: 'text', template_key: 'camp_week_4' },
      campWeek5: { type: 'text', template_key: 'camp_week_5' },
      campWeek6: { type: 'text', template_key: 'camp_week_6' },
      campWeek7: { type: 'text', template_key: 'camp_week_7' },
      campWeek8: { type: 'text', template_key: 'camp_week_8' },
      campWeek9: { type: 'text', template_key: 'camp_week_9' },
      campWeek10: { type: 'text', template_key: 'camp_week_10' },
      campWeek11: { type: 'text', template_key: 'camp_week_11' },
      campWeek12: { type: 'text', template_key: 'camp_week_12' },
      // 常態專用 => 動態處理所有可能的課程梯次
      weekend1: { type: 'text', template_key: 'weekend_1' },
      weekend2: { type: 'text', template_key: 'weekend_2' },
      weekend3: { type: 'text', template_key: 'weekend_3' },
      weekend4: { type: 'text', template_key: 'weekend_4' },
      // 數學專用
      mathTime: { type: 'text', template_key: 'math_time' },
    },
    // 這些是為了處理特定類型字段的通用配置，例如 checkbox 的默認值
    defaultCheckboxChecked: '■',
    defaultCheckboxUnchecked: '☐',
  };

  formDataObj['schema'] = schema; // 將 schema 新增到 formDataObj 中
  console.log(formDataObj);

  Swal.fire({
    title: '送出中，請稍後...',
    didOpen: () => {
      Swal.showLoading();
      // 暫時停用原本送單機制（保留程式碼供後續恢復）
      // $.ajax({
      //   headers: {
      //     Recaptcha: token,
      //   },
      //   type: 'POST',
      //   url: 'https://form.ittraining.com.tw:3005/product/submit',
      //   data: formDataObj,
      //   mimeType: 'application/json',
      //   success: (response) => {
      //     console.log(response);
      //     postToGasForSheet(formDataObj);
      //     window.location.href = 'https://www.beyond-coding.org.tw/course-registration-system/done-page.html';
      //   },
      //   error: (thrownError) => {
      //     console.error(thrownError);
      //     let responseObj = {};
      //     try {
      //       responseObj = thrownError.responseText
      //         ? JSON.parse(thrownError.responseText)
      //         : {};
      //     } catch (e) {
      //       console.error('Failed to parse error response:', e);
      //     }
      //     Swal.hideLoading();
      //     Swal.showValidationMessage(
      //       `發生異常😥: ${responseObj.statusCode || ''} ${
      //         thrownError.statusText || ''
      //       } - ${responseObj.message || '請稍後再試'}`,
      //     );
      //   },
      // });

      pingGasConnectivity()
        .then((pingResult) => {
          console.log('GAS ping 成功：', pingResult);
          return postToGasForSheet(formDataObj);
        })
        .then((gasResult) => {
          console.log('Google Sheet 寫入送出：', gasResult);
          sessionStorage.removeItem('camp_student_id');
          sessionStorage.removeItem('camp_prefill');
          window.location.href = 'https://www.beyond-coding.org.tw/course-registration-system/done-page.html';
        })
        .catch((error) => {
          console.error('Google Sheet 寫入失敗：', error);
          gasSubmitState.isSubmitting = false;
          Swal.hideLoading();
          Swal.showValidationMessage(
            `寫入 Google Sheet 失敗：${error && error.message ? error.message : '請稍後再試'}`,
          );
        });
    },
  });
}

function scheduleRecaptchaFallbackSubmit() {
  gasSubmitState.callbackTriggered = false;

  if (gasSubmitState.fallbackTimer) {
    clearTimeout(gasSubmitState.fallbackTimer);
    gasSubmitState.fallbackTimer = null;
  }

  gasSubmitState.fallbackTimer = setTimeout(() => {
    if (gasSubmitState.callbackTriggered || gasSubmitState.isSubmitting) return;
    console.warn('reCAPTCHA callback 未觸發，啟用手動 fallback 送出。');
    onSubmit('manual-fallback-no-recaptcha');
  }, 1200);
}

function pingGasConnectivity() {
  const callbackName = `gasPing_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const params = {
    action: 'ping',
    source: 'course-registration-system',
    callback: callbackName,
  };
  const query = new URLSearchParams(params).toString();
  const src = `${GAS_WEB_APP_URL}?${query}`;

  return new Promise((resolve, reject) => {
    let timer = null;
    const script = document.createElement('script');

    function cleanup() {
      if (timer) clearTimeout(timer);
      if (script.parentNode) script.parentNode.removeChild(script);
      delete window[callbackName];
    }

    window[callbackName] = (data) => {
      cleanup();
      if (!data || !data.success || data.action !== 'ping') {
        reject(new Error('Ping 回應異常'));
        return;
      }
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Ping 請求失敗，可能 URL 或部署設定不正確'));
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error('Ping 逾時（10 秒）'));
    }, 10000);

    script.src = src;
    document.body.appendChild(script);
  });
}

function postToGasForSheet(formDataObj) {
  if (!formDataObj || typeof formDataObj !== 'object') return;

  const payload = {
    action: 'write_form_submission',
    source: 'course-registration-system',
    submitted_at: new Date().toISOString(),
    trace_id: `trace_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    formDataPayload: JSON.stringify(formDataObj),
  };

  const body = new URLSearchParams(payload).toString();

  return fetch(GAS_WEB_APP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body,
    credentials: 'omit',
    redirect: 'follow',
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (parseErr) {
        throw new Error(`GAS 回傳非 JSON：${parseErr && parseErr.message ? parseErr.message : parseErr}`);
      }

      if (!data || !data.success) {
        throw new Error(
          `GAS 寫入失敗：${data && data.message ? data.message : '未知錯誤'}`,
        );
      }

      return { ...data, mode: 'fetch_post' };
    })
    .catch((fetchError) => {
      console.warn('fetch 送出失敗，改用 iframe fallback：', fetchError);
      return postToGasForSheetViaIframe(payload);
    });
}

function postToGasForSheetViaIframe(payload) {
  return new Promise((resolve, reject) => {
    const iframeName = `gasSheetSubmit_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const iframe = document.createElement('iframe');
    const form = document.createElement('form');
    let done = false;

    iframe.name = iframeName;
    iframe.style.display = 'none';

    form.method = 'POST';
    form.action = GAS_WEB_APP_URL;
    form.target = iframeName;
    form.style.display = 'none';

    Object.keys(payload).forEach((key) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = payload[key];
      form.appendChild(input);
    });

    const cleanup = () => {
      if (form.parentNode) form.parentNode.removeChild(form);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error('GAS 寫入逾時（iframe form post）'));
    }, 15000);

    iframe.onload = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cleanup();
      resolve({ success: true, mode: 'iframe_form_post', trace_id: payload.trace_id });
    };

    document.body.appendChild(iframe);
    document.body.appendChild(form);
    form.submit();
  });
}

function getMediaArr() {
  let array = [];
  let checkboxes = mainForm.querySelectorAll(
    'input[name=mediaSource][type=checkbox]:checked',
  );

  for (let i = 0; i < checkboxes.length; i++) {
    array.push(checkboxes[i].value);
  }

  return array;
}

function getMaterialArr() {
  let array = [];
  let checkboxes = mainForm.querySelectorAll(
    'input[name=material][type=checkbox]:checked',
  );

  for (let i = 0; i < checkboxes.length; i++) {
    array.push(checkboxes[i].value);
  }

  return array;
}
