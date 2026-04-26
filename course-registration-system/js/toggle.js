// 校區選擇出現對應圖片
//抓DOM
const songshan = document.getElementById("songshan");
const daan = document.getElementById("daan");
const dazhi = document.getElementById("dazhi");
const banqiao = document.getElementById("banqiao");
const chongqing = document.getElementById("chongqing");
const songshanCourse = document.querySelectorAll(".songshanCourse");
const daanCourse = document.querySelectorAll(".daanCourse");
const dazhiCourse = document.querySelectorAll(".dazhiCourse");
const banqiaoCourse = document.querySelectorAll(".banqiaoCourse");
const chongqingCourse = document.querySelectorAll(".chongqingCourse");

const schoolArray = [songshan, daan, dazhi, banqiao, chongqing];
const courseArray = [songshanCourse, daanCourse, dazhiCourse, banqiaoCourse , chongqingCourse];

schoolArray.forEach((item, index) => {
    if (!item) return;
    item.addEventListener("change", () => {
        // 全部隱藏
        courseArray.forEach(courseList => {
            courseList.forEach(course => {
                course.style.display = "none";
            });
        });

        // 顯示對應校區課表
        courseArray[index].forEach(course => {
            course.style.display = "block";
        });
    });
});