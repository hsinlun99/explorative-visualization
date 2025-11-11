/* * main.js
 * 手機使用時間螺旋圖 - 核心 D3 程式碼
 */

// 從 CDN 載入 D3.js (ESM)
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/* --- 1. 靜態設定 (Constants & Setup) --- */

// SVG 畫布的邊界設定
const margin = { top: 40, right: 40, bottom: 40, left: 40 };

// 螺旋圖設定
const WEEK_SEGMENTS = 7; // 一週 7 天
const DAY_ANGLE = (2 * Math.PI) / WEEK_SEGMENTS; // 每一天的角度
const MONDAY_OFFSET = -Math.PI / 2; // 將星期一 (12點鐘方向) 設為起始點
const DAY_SEGMENT_HEIGHT = 25; // 每天區塊的「厚度」
const DOTS_PER_DAY = 100; // 每個區塊生成的點數。警告：此數字 > 100 可能會導致顯著的效能下降 (卡頓)。

// 每個點的半徑 (像素)
const DOT_RADIUS = 3;

// 動畫設定：每天的動畫延遲 (毫秒)
// 總動畫時長約為：ANIMATION_DAY_DELAY * (總天數)
const ANIMATION_DAY_DELAY = 40; // 40ms * 38 天 ≈ 1.5 秒動畫

// 顏色比例尺 (Quantize Scale): 將使用時間 (連續) 映射到 5 個離散的顏色
const colorScale = d3.scaleQuantize()
    .range([
        "#cce5df", // 非常低
        "#aee1d4", // 低
        "#86d1c0", // 中
        "#5cbea9", // 高
        "#00a688"  // 非常高 (這是我選的一個色階，您可以替換)
        // 您也可以用 d3.schemeBlues[5] 或 d3.schemeGreens[5]
    ]);

// DOM 元素選取
const visContainer = d3.select("#vis-container");
const modal = d3.select("#modal");
const legendContainer = d3.select("#legend");

// 格式化函式 (Helper functions)
const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    let parts = [];
    if (h > 0) parts.push(`${h} 小時`);
    if (m > 0) parts.push(`${m} 分鐘`);
    if (parts.length === 0 && s >= 0) parts.push(`${s} 秒`);
    return parts.join(' ');
};

const formatDate = d3.timeFormat("%Y-%m-%d, %A"); // e.g., "2025-09-29, Monday"


/* --- 2. 核心資料轉換 (Option A) --- */

/**
 * 將 "寬格式" CSV 資料轉換為 "長格式" 以便 D3 使用
 * @param {Array} rawData - 從 d3.csv() 載入的原始資料
 * @returns {Array} - 處理過的每日資料陣列
 */
async function transformData(rawData) {
    // 1. 取得所有日期的欄位名稱
    // 排除 'App name', 'Device', 和 'Total Usage (seconds)'
    const dateColumns = rawData.columns.filter(col => 
        col !== "App name" && col !== "Device" && col !== "Total Usage (seconds)"
    );

    // 2. 建立一個 Map 來匯總每日資料
    const dailyDataMap = new Map();

    // 3. 遍歷所有 App (每一列)
    rawData.forEach(appRow => {
        const appName = appRow["App name"];
        
        // 4. 遍歷所有日期 (每一欄)
        dateColumns.forEach(dateStr => {
            const usageSeconds = parseInt(appRow[dateStr] || 0, 10);

            // 如果當天沒有這筆資料，先初始化
            if (!dailyDataMap.has(dateStr)) {
                dailyDataMap.set(dateStr, {
                    dateString: dateStr,
                    totalUsageSeconds: 0,
                    apps: []
                });
            }

            // 取得該日的資料並更新
            const dayData = dailyDataMap.get(dateStr);
            dayData.totalUsageSeconds += usageSeconds;

            // 只在有使用時才加入 App 列表，避免列表過長
            if (usageSeconds > 0) {
                dayData.apps.push({
                    name: appName,
                    usage: usageSeconds
                });
            }
        });
    });

    // 5. 將 Map 轉換為陣列，並計算 d3.js 需要的屬性
    let processedData = Array.from(dailyDataMap.values());

    // 6. 解析日期、排序、並計算 'dayOfWeek' 和 'weekNumber'
    const parseDate = d3.timeParse("%B %d, %Y"); // e.g., "September 29, 2025"
    
    let processedDataWithNulls = processedData.map(d => {
        const cleanedDateString = d.dateString.split('.')[0];
        const dateObj = parseDate(cleanedDateString);

        if (!dateObj) {
            console.warn(`跳過無法解析的日期欄位: ${d.dateString}`);
            return null; 
        }
        const dayOfWeek = (dateObj.getDay() + 6) % 7; 
        
        return {
            ...d, 
            dateObj: dateObj,
            dayOfWeek: dayOfWeek,
            apps: d.apps.sort((a, b) => b.usage - a.usage) 
        };
    });

    // (步驟 2: Filter - 移除 null)
    processedData = processedDataWithNulls.filter(d => d !== null);

    // (步驟 3: Sort - *** 必須在 filter 之後 ***)
    //          這樣才能確保 processedData[0] 是有效的日期
    processedData.sort((a, b) => a.dateObj - b.dateObj);

    // (步驟 4: 按照規格書限制資料範圍 - 只保留到 November 4, 2025)
    const endDate = parseDate("November 4, 2025");
    processedData = processedData.filter(d => d.dateObj <= endDate);

    // 5. 計算 weekNumber - *** 必須在 sort 和 filter 之後 ***
    const startDate = processedData[0].dateObj; // 現在這裡是安全的
    
    processedData.forEach(d => {
        // d3.timeDay.count 會計算相差多少天
        const dayDiff = d3.timeDay.count(startDate, d.dateObj);
        d.weekNumber = Math.floor(dayDiff / 7); // 0 = 第一週, 1 = 第二週...
    });

    console.log("Processed Data:", processedData);
    return processedData;
}

/**
 * 根據每日資料，在 d3.arc 區塊內生成隨機分佈的點。
 * @param {Array} dayData - 處理過的 38 天資料
 * @param {d3.ScaleLinear} radiusScale - D3 半徑比例尺
 * @param {d3.ScaleQuantize} colorScale - D3 顏色比例尺
 * @returns {Array} - 一個包含所有點 (e.g., 38*50=1900 個) 的扁平陣列
 */
function generateDotData(dayData, radiusScale, colorScale) {
    const allDots = [];

    dayData.forEach((day, i) => {
        // 取得該日的邊界
        const innerR = radiusScale(i);
        const outerR = radiusScale(i) + DAY_SEGMENT_HEIGHT;
        const startAngle = day.dayOfWeek * DAY_ANGLE + MONDAY_OFFSET;
        const endAngle = (day.dayOfWeek + 1) * DAY_ANGLE + MONDAY_OFFSET;
        
        const dayColor = colorScale(day.totalUsageSeconds);

        // 為這一天生成 DOTS_PER_DAY 個點
        for (let j = 0; j < DOTS_PER_DAY; j++) {
            
            // 1. 取得隨機角度
            const randomAngle = Math.random() * (endAngle - startAngle) + startAngle;
            
            // 2. 取得隨機半徑
            // 關鍵：使用 Math.sqrt(Math.random()) 
            // 確保點在「面積」上均勻分佈，而不是在「半徑」上
            const randomT = Math.sqrt(Math.random());
            const randomRadius = innerR + randomT * (outerR - innerR);
            
            // 3. 將極座標 (r, angle) 轉換為笛卡爾座標 (x, y)
            // D3/SVG 的角度 0 是 3 點鐘方向，-PI/2 是 12 點鐘方向
            const x = randomRadius * Math.cos(randomAngle);
            const y = randomRadius * Math.sin(randomAngle);

            allDots.push({
                x: x,
                y: y,
                color: dayColor,
                dayIndex: i // 儲存天的索引，用於動畫延遲
            });
        }
    });

    return allDots;
}


/* --- 3. 繪製視覺化 (Render Function) --- */

/**
 * 繪製主螺旋圖
 * @param {Array} data - 處理過的每日資料
 * @param {d3.Selection} svg - D3 的 SVG 選擇器
 */
function renderSpiral(data, svg) {
    
    // 取得容器的當前寬高，以實現響應式
    const containerRect = visContainer.node().getBoundingClientRect();
    const width = containerRect.width - margin.left - margin.right;
    const height = containerRect.height - margin.top - margin.bottom;
    const radius = Math.min(width, height) / 2;

    // 將 SVG 中心點移到畫布中央
    const g = svg
        .attr("viewBox", `0 0 ${containerRect.width} ${containerRect.height}`) // 響應式關鍵
        .html(null) // 清空舊圖表 (用於重繪)
        .append("g")
        .attr("transform", `translate(${containerRect.width / 2}, ${containerRect.height / 2})`);

    // --- 設定比例尺 (Scales) ---

    // 1. 半徑 (Radius) 比例尺 (邏輯不變)
    const innerRadiusStart = 40;
    const maxDayIndex = data.length - 1;
    const radiusScale = d3.scaleLinear()
        .domain([0, maxDayIndex])
        .range([innerRadiusStart, radius - DAY_SEGMENT_HEIGHT]);

    // 2. 顏色 (Color) 比例尺 (邏輯不變)
    const maxUsage = d3.max(data, d => d.totalUsageSeconds);
    colorScale.domain([0, maxUsage]);
    
    // --- [ 新增 ] 產生點資料 ---
    const dotData = generateDotData(data, radiusScale, colorScale);

    // --- 繪製 Arc (弧形) - [ 已修改 ] ---
    // 這些 <path> 現在是「隱形」的互動層

    // 1. 建立 Arc 產生器 (邏輯不變)
    const arcGenerator = d3.arc()
        .innerRadius((d, i) => radiusScale(i))
        .outerRadius((d, i) => radiusScale(i) + DAY_SEGMENT_HEIGHT)
        .startAngle(d => d.dayOfWeek * DAY_ANGLE + MONDAY_OFFSET)
        .endAngle(d => (d.dayOfWeek + 1) * DAY_ANGLE + MONDAY_OFFSET)
        .cornerRadius(0); // 方案 B (接縫連續)

    // 2. 資料綁定 (Data Join) - [ 已修改 ]
    g.selectAll("path.day-segment")
        .data(data)
        .join("path")
        .attr("class", "day-segment") // style.css 會給它 stroke
        .attr("d", (d, i) => arcGenerator(d, i))
        .attr("fill", "none") // [ 修改 ] 設為透明！
        // 互動 (Interactivity) - (邏輯不變)
        .on("mouseover", (event, d) => {
            showModal(event, d);
        })
        .on("mouseout", () => {
            hideModal();
        });

    // --- [ 新增 ] 繪製點 (Dots) ---
    // 這是新的「視覺層」
    
    g.selectAll("circle.dot")
        .data(dotData)
        .join("circle")
            .attr("class", "dot")
            // 設定點的位置和樣式
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", DOT_RADIUS)
            .attr("fill", d => d.color)
            // 關鍵：讓點「穿透」滑鼠事件，
            // 這樣滑鼠才能 hover 到底下的 .day-segment 路徑
            .style("pointer-events", "none")
            
            // [ 新增 ] 動畫效果
            .style("opacity", 0) // 初始狀態：完全透明
        .transition()
            // 每個點的動畫持續 500ms
            .duration(500) 
            // 根據「天」的索引 (dayIndex) 來設定延遲
            // 這會產生「由內至外」依序填滿的動畫效果
            .delay(d => d.dayIndex * ANIMATION_DAY_DELAY)
            .style("opacity", 1); // 最終狀態：完全不透明

    // 3. 繪製圖例 (This remains the same)
    renderLegend(colorScale);
}


/* --- 4. 互動輔助函式 (Modal & Legend) --- */

/**
 * 顯示互動視窗 (Modal)
 * @param {Event} event - D3 的滑鼠事件
 * @param {object} d - 綁定的當日資料
 */
function showModal(event, d) {
    modal.classed("visible", true);
    
    // 根據滑鼠位置動態定位 Modal
    // 讓 modal 出現在滑鼠的右下方
    const [x, y] = d3.pointer(event, document.body);
    modal
        .style("left", `${x + 15}px`)
        .style("top", `${y + 15}px`);

    // 填充 Modal 內容
    modal.select("#modal-date").text(formatDate(d.dateObj));
    modal.select("#modal-total-usage").text(formatTime(d.totalUsageSeconds));

    // 動態生成 App 列表
    const appList = modal.select("#modal-app-list");
    appList.html(null); // 清空舊列表

    d.apps.slice(0, 10).forEach(app => { // 最多顯示前 10 名
        appList.append("div")
            .attr("class", "app-item")
            .html(`
                <span class="app-name">${app.name}</span>
                <span class="app-usage">${formatTime(app.usage)}</span>
            `);
    });
    
    if (d.apps.length > 10) {
        appList.append("div").style("margin-top", "5px").style("color", "#999").text("...等其他 App");
    }
}

/**
 * 隱藏互動視窗 (Modal)
 */
function hideModal() {
    modal.classed("visible", false);
}

/**
 * 繪製顏色圖例
 * @param {d3.ScaleQuantize} scale - 使用的顏色比例尺
 */
function renderLegend(scale) {
    legendContainer.html("<h4>每日使用時間</h4>"); // 清空並重設標題

    // Quantize scale (量化) 需要用 .thresholds() 或 .quantiles()
    // 為了簡單起見，我們直接使用 scale.range() 和 scale.invertExtent()
    
    scale.range().forEach(color => {
        const extent = scale.invertExtent(color); // 找到這個顏色對應的範圍 [min, max]
        const text = `${formatTime(Math.round(extent[0]))} - ${formatTime(Math.round(extent[1]))}`;

        const item = legendContainer.append("div")
            .attr("class", "legend-item");
            
        item.append("div")
            .attr("class", "legend-color-box")
            .style("background-color", color);
            
        item.append("span")
            .text(text);
    });
}


/* --- 5. 執行主程式 (Main Execution) --- */

/**
 * 主執行函式 (async)
 */
async function main() {
    try {
        // 1. 載入資料
        const rawData = await d3.csv("app_usage.csv");
        
        // 2. 轉換資料 (Option A)
        const processedData = await transformData(rawData);
        
        console.log("--- 檢查轉換後的資料 (processedData) ---");
        console.log(processedData);

        // 3. 繪製圖表
        // 建立 SVG 畫布
        const svg = visContainer.append("svg");
        
        renderSpiral(processedData, svg);

        // 4. (可選) 監聽視窗大小變動，重新繪製
        // 為了效能，使用 debounce (簡易版)
        let resizeTimer;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                renderSpiral(processedData, svg); // 重繪
            }, 200);
        });

    } catch (error) {
        console.error("載入或繪製圖表時發生錯誤:", error);
        visContainer.text("資料載入失敗，請檢查 app_usage.csv 檔案是否存在，或檢查瀏覽器主控台。");
    }
}

// 啟動！
main();