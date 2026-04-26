/**
 * 倒數計時器模組
 * 用於顯示優惠活動倒數時間
 */

// 設定優惠活動資訊
const salesInfo = {
  name: "早鳥",
  endDate: "2025/7/15 23:59:59", // 優惠結束日期
  discount: "9折"
};

// DOM元素
let dayElement;
let hourElement;
let minuteElement;
let secondsElement;
let timeoverElement;
let salesNameElements;
let salesDateElement;

// 初始化倒數計時器
function initCountdown() {
  // 獲取DOM元素
  dayElement = document.querySelector('.day');
  hourElement = document.querySelector('.hour');
  minuteElement = document.querySelector('.minute');
  secondsElement = document.querySelector('.seconds');
  timeoverElement = document.querySelector('.timeover');
  salesNameElements = document.querySelectorAll('.salesname');
  salesDateElement = document.querySelector('.salesdate');
  
  // 設定優惠名稱
  salesNameElements.forEach(element => {
    element.textContent = salesInfo.name;
  });
  
  // 設定優惠結束日期
  if (salesDateElement) {
    salesDateElement.textContent = salesInfo.endDate.split(' ')[0];
  }
  
  // 開始倒數計時
  startCountdown();
}

// 開始倒數計時
function startCountdown() {
  // 設定目標時間
  const targetDate = new Date(salesInfo.endDate).getTime();
  
  // 更新倒數計時
  function updateCountdown() {
    // 獲取當前時間
    const now = new Date().getTime();
    
    // 計算剩餘時間
    const distance = targetDate - now;
    
    // 如果時間已到，顯示優惠結束訊息
    if (distance < 0) {
      clearInterval(countdownInterval);
      
      if (dayElement) dayElement.textContent = "0";
      if (hourElement) hourElement.textContent = "0";
      if (minuteElement) minuteElement.textContent = "0";
      if (secondsElement) secondsElement.textContent = "0";
      
      if (timeoverElement) {
        timeoverElement.textContent = "優惠已結束！";
      }
      
      return;
    }
    
    // 計算天、時、分、秒
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
    // 更新DOM元素
    if (dayElement) dayElement.textContent = days;
    if (hourElement) hourElement.textContent = hours;
    if (minuteElement) minuteElement.textContent = minutes;
    if (secondsElement) secondsElement.textContent = seconds;
  }
  
  // 立即執行一次
  updateCountdown();
  
  // 設定每秒更新一次
  const countdownInterval = setInterval(updateCountdown, 1000);
}

// 當DOM載入完成後初始化倒數計時器
document.addEventListener('DOMContentLoaded', initCountdown);
