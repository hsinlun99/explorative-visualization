/* * main.js
 * Mobile Usage Spiral - Core D3 Code
 */

// Load D3.js from CDN (ESM)
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/* --- 1. Static Configuration (Constants & Setup) --- */

const margin = { top: 40, right: 40, bottom: 40, left: 40 };

// Spiral configuration
const WEEK_SEGMENTS = 7; 
const DAY_ANGLE = (2 * Math.PI) / WEEK_SEGMENTS;
const MONDAY_OFFSET = -Math.PI / 2;
const DAY_SEGMENT_HEIGHT = 25;
const DOTS_PER_DAY = 100;
const DOT_RADIUS = 3;
const ANIMATION_DAY_DELAY = 50;

// [修改] Timeline configuration
const TIMELINE_PADDING = 30;
const TIMELINE_DAY_HEIGHT = 50; // [修改] 增加每日高度

// Color scale
const colorScale = d3.scaleQuantize()
    .range([
        "#cce5df", "#aee1d4", "#86d1c0", "#5cbea9", "#00a688"
    ]);

// DOM element selection
const visContainer = d3.select("#vis-container");
const legendContainer = d3.select("#legend");
const modal = d3.select("#modal");

const timelineContainer = d3.select("#timeline-container");
const timelineModal = d3.select("#timeline-modal"); // 選取 Modal (不論它在哪)

// Helper functions for formatting
const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    let parts = [];
    if (h > 0) parts.push(`${h} hour${h > 1 ? 's' : ''}`);
    if (m > 0) parts.push(`${m} minute${m > 1 ? 's' : ''}`);
    if (parts.length === 0 && s >= 0) parts.push(`${s} second${s > 1 ? 's' : ''}`);
    return parts.join(' ');
};

const formatDate = d3.timeFormat("%Y-%m-%d, %A");
// [新增] Timeline date label format
const formatTimelineDate = d3.timeFormat("%m/%d"); // e.g., "09/29"

/**
 * [NEW] 解析 Unlock 資料
 * 將寬格式 CSV 轉為 Map<DateString, Count>
 * Key 為 "乾淨的日期字串" (e.g., "October 26, 2025")
 */
function parseUnlockData(unlockRaw) {
    const unlockMap = new Map();
    
    // 取得所有日期欄位 (排除非日期的 Metadata 欄位)
    // 假設 unlock.csv 的欄位結構與 app_usage 類似，日期在欄位上
    const dateColumns = unlockRaw.columns.filter(col => 
        col !== "Unnamed: 0" && col !== "Total Usage"
    );

    dateColumns.forEach(rawDateStr => {
        // 清理日期字串 (移除可能的 .1, .2 後綴) 以便與 Usage 資料對齊
        const cleanDateStr = rawDateStr.split('.')[0];

        // 計算該欄位(日期)的總和
        // 以防 CSV 有多列資料，我們將該欄的所有數值加總
        const totalUnlocks = d3.sum(unlockRaw, d => parseFloat(d[rawDateStr] || 0));
        
        // 如果該日期已經存在 (因為 .1 .2 的關係)，則累加
        const currentVal = unlockMap.get(cleanDateStr) || 0;
        unlockMap.set(cleanDateStr, currentVal + totalUnlocks);
    });

    console.log(`Parsed ${unlockMap.size} days of unlock data.`);
    return unlockMap;
}


/* --- 2. Core Data Transformation (Unchanged) --- */

async function transformData(rawData, unlockMap) {
    const dateColumns = rawData.columns.filter(col => 
        col !== "App name" && col !== "Device" && col !== "Total Usage (seconds)"
    );
    const dailyDataMap = new Map();
    rawData.forEach(appRow => {
        const appName = appRow["App name"];
        dateColumns.forEach(dateStr => {
            const usageSeconds = parseInt(appRow[dateStr] || 0, 10);
            if (!dailyDataMap.has(dateStr)) {
                dailyDataMap.set(dateStr, {
                    dateString: dateStr,
                    totalUsageSeconds: 0,
                    apps: []
                });
            }
            const dayData = dailyDataMap.get(dateStr);
            dayData.totalUsageSeconds += usageSeconds;
            if (usageSeconds > 0) {
                dayData.apps.push({
                    name: appName,
                    usage: usageSeconds
                });
            }
        });
    });

    let processedData = Array.from(dailyDataMap.values());
    const parseDate = d3.timeParse("%B %d, %Y");
    
    let processedDataWithNulls = processedData.map(d => {
        const cleanedDateString = d.dateString.split('.')[0]; 
        const dateObj = parseDate(cleanedDateString);

        if (!dateObj) {
            console.warn(`Skipping unparseable date column: ${d.dateString}`);
            return null; 
        }
        const dayOfWeek = (dateObj.getDay() + 6) % 7;

        // 從 unlockMap 取得對應的解鎖次數，若無則預設為 0
        const unlockCount = unlockMap.get(cleanedDateString) || 0;
        
        return {
            ...d, 
            dateObj: dateObj,
            cleanedDateString: cleanedDateString,
            dayOfWeek: dayOfWeek,
            unlockCount: unlockCount, // 新增解鎖次數屬性
            apps: d.apps.sort((a, b) => b.usage - a.usage) 
        };
    });

    processedData = processedDataWithNulls.filter(d => d !== null);
    processedData.sort((a, b) => a.dateObj - b.dateObj);
    
    if (processedData.length === 0) {
        console.error("No valid data found after transform.");
        return [];
    }

    const startDate = processedData[0].dateObj;
    processedData.forEach((d, index) => {
        const dayDiff = d3.timeDay.count(startDate, d.dateObj);
        d.weekNumber = Math.floor(dayDiff / 7);
        d.dayIndex = index;
    });

    console.log("Processed Data:", processedData);
    return processedData;
}

/**
 * (Unchanged) Generates dot data for the spiral
 */
function generateDotData(dayData, radiusScale, colorScale) {
    const allDots = [];
    dayData.forEach((day) => {
        const i = day.dayIndex;
        const innerR = radiusScale(i);
        const outerR = radiusScale(i) + DAY_SEGMENT_HEIGHT;
        const startAngle = day.dayOfWeek * DAY_ANGLE + MONDAY_OFFSET;
        const endAngle = (day.dayOfWeek + 1) * DAY_ANGLE + MONDAY_OFFSET;
        const dayColor = colorScale(day.totalUsageSeconds);
        for (let j = 0; j < DOTS_PER_DAY; j++) {
            const randomAngle = Math.random() * (endAngle - startAngle) + startAngle;
            const randomT = Math.sqrt(Math.random());
            const randomRadius = innerR + randomT * (outerR - innerR);
            const x = randomRadius * Math.cos(randomAngle);
            const y = randomRadius * Math.sin(randomAngle);
            allDots.push({ x: x, y: y, color: dayColor, dayIndex: i });
        }
    });
    return allDots;
}


/* --- 3. Render Visualization (Spiral - Unchanged) --- */

function renderSpiral(data, svg) {
    const containerRect = visContainer.node().getBoundingClientRect();
    const width = containerRect.width - margin.left - margin.right;
    const height = containerRect.height - margin.top - margin.bottom;
    const radius = Math.min(width, height) / 2;
    
    const g = svg
        .attr("viewBox", `0 0 ${containerRect.width} ${containerRect.height}`)
        .html(null)
        .append("g")
        .attr("transform", `translate(${containerRect.width / 2}, ${containerRect.height / 2})`);

    const innerRadiusStart = 40;
    const maxDayIndex = data.length - 1;
    const radiusScale = d3.scaleLinear()
        .domain([0, maxDayIndex])
        .range([innerRadiusStart, radius - DAY_SEGMENT_HEIGHT]);

    const maxUsage = d3.max(data, d => d.totalUsageSeconds);
    colorScale.domain([0, maxUsage]);
    
    const dotData = generateDotData(data, radiusScale, colorScale);

    const arcGenerator = d3.arc()
        .innerRadius(d => radiusScale(d.dayIndex))
        .outerRadius(d => radiusScale(d.dayIndex) + DAY_SEGMENT_HEIGHT)
        .startAngle(d => d.dayOfWeek * DAY_ANGLE)
        .endAngle(d => (d.dayOfWeek + 1) * DAY_ANGLE)
        .cornerRadius(0);

    g.selectAll("path.day-segment")
        .data(data)
        .join("path")
        .attr("class", "day-segment")
        .attr("d", arcGenerator)
        .attr("fill", "none")
        .on("mouseover", (event, d) => {
            showModal(event, d);
        })
        .on("mouseout", () => {
            hideModal();
        });

    g.selectAll("circle.dot")
        .data(dotData)
        .join("circle")
            .attr("class", "dot")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", DOT_RADIUS)
            .attr("fill", d => d.color)
            .style("pointer-events", "none")
            .style("opacity", 0)
        .transition()
            .duration(500) 
            .delay(d => d.dayIndex * ANIMATION_DAY_DELAY)
            .style("opacity", 1);

    renderLegend(colorScale);
}


/* --- 4. [MODIFIED] Render Timeline --- */

const ARROW_UP_PATH = "M4 12 L12 4 L20 12";
const ARROW_DOWN_PATH = "M4 12 L12 20 L20 12";

// Store timeline Y-position globally to persist across resizes
let currentTimelineY = undefined;

/**
 * [MODIFIED] Renders the draggable vertical timeline
 */
function renderTimeline(data, svg) {
    // 1. Get dimensions (from 90vh container)
    const containerRect = timelineContainer.node().getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;
    
    // 2. Define content height and Y-scale
    const contentHeight = data.length * TIMELINE_DAY_HEIGHT + TIMELINE_PADDING * 2;
    const yDomain = d3.extent(data, d => d.dateObj);
    const yScale = d3.scaleTime()
        .domain(yDomain)
        .range([contentHeight - TIMELINE_PADDING, TIMELINE_PADDING]); // [Bottom, Top]

    // 3. [MODIFIED] Define drag boundaries and centering
    const contentOverflow = contentHeight - height;
    let maxDragY, minDragY;

    if (contentOverflow <= 0) {
        // Content is shorter than container: Center it and disable drag
        maxDragY = (height - contentHeight) / 2;
        minDragY = maxDragY;
    } else {
        // Content is longer: Enable drag
        maxDragY = 0;
        minDragY = -contentOverflow; // e.g., - (1200 - 800) = -400
    }
    
    // Clamp currentTimelineY to new bounds (handles init and resize)
    // On first load (currentTimelineY is undefined), set to maxDragY
    // (This centers short content, or starts long content at the top)
    currentTimelineY = Math.max(minDragY, Math.min(maxDragY, (currentTimelineY === undefined ? maxDragY : currentTimelineY)));

    let isDragging = false;
    
    // 4. Clear SVG and setup structure
    svg.html(null);

    // Append arrows (fixed position relative to SVG viewport)
    svg.append("path")
        .attr("class", "timeline-arrow")
        .attr("id", "timeline-arrow-up")
        .attr("d", ARROW_UP_PATH)
        .attr("stroke", "#333")
        .attr("stroke-width", 2)
        .attr("fill", "none")
        .style("transform", `translate(${width / 2 - 12}px, 5px)`);

    svg.append("path")
        .attr("class", "timeline-arrow")
        .attr("id", "timeline-arrow-down")
        .attr("d", ARROW_DOWN_PATH)
        .attr("stroke", "#333")
        .attr("stroke-width", 2)
        .attr("fill", "none")
        .style("transform", `translate(${width / 2 - 12}px, ${height - 20}px)`);

    // Append draggable content group
    const g = svg.append("g")
        .attr("id", "timeline-content-group")
        .attr("transform", `translate(0, ${currentTimelineY})`);

    // 5. Define Drag Handler
    const dragHandler = d3.drag()
        .on("start", (event) => {
            // Only allow drag if content is scrollable
            if (minDragY === maxDragY) return;
            isDragging = true;
            g.style("cursor", "grabbing");
        })
        .on("drag", (event) => {
            if (!isDragging) return;
            
            const newY = currentTimelineY + event.dy;
            currentTimelineY = Math.max(minDragY, Math.min(maxDragY, newY));
            g.attr("transform", `translate(0, ${currentTimelineY})`);
            updateTimelineArrows(svg, currentTimelineY, minDragY, maxDragY);
        })
        .on("end", () => {
            if (!isDragging) return;
            isDragging = false;
            g.style("cursor", "grab");
        });

    svg.call(dragHandler);

    // 6. Draw axis line
    g.append("line")
        .attr("class", "timeline-axis-line")
        .attr("x1", width / 2)
        .attr("x2", width / 2)
        .attr("y1", TIMELINE_PADDING)
        .attr("y2", contentHeight - TIMELINE_PADDING);

    // 7. Draw timeline dots
    g.selectAll("circle.timeline-dot")
        .data(data)
        .join("circle")
        .attr("class", "timeline-dot")
        .attr("cx", width / 2)
        .attr("cy", d => yScale(d.dateObj))
        .attr("r", 5)
        .on("mouseover", (event, d) => {
            if (isDragging) return;
            document.body.dispatchEvent(new CustomEvent('datehover', { detail: d }));
        })
        .on("mouseout", () => {
            if (isDragging) return;
            document.body.dispatchEvent(new CustomEvent('dateout'));
        });

    // 8. [NEW] Draw date labels
    g.selectAll("text.timeline-label")
        .data(data)
        .join("text")
        .attr("class", "timeline-label")
        .attr("x", width / 2 + 12) // Position right of the dot
        .attr("y", d => yScale(d.dateObj))
        .attr("dy", "0.35em") // Vertically center text
        .text(d => formatTimelineDate(d.dateObj)); // Use "MM/DD" format

    // 9. Set initial arrow state
    updateTimelineArrows(svg, currentTimelineY, minDragY, maxDragY);
}

/**
 * [MODIFIED] Show/hide timeline drag indicator arrows
 */
function updateTimelineArrows(svg, currentY, minY, maxY) {
    // Only show arrows if dragging is possible (minY !== maxY)
    const canDrag = minY !== maxY;
    
    // Show up arrow if we can drag and are not at the top
    svg.select("#timeline-arrow-up")
        .style("display", canDrag && currentY < maxY ? "block" : "none");

    // Show down arrow if we can drag and are not at the bottom
    svg.select("#timeline-arrow-down")
        .style("display", canDrag && currentY > minY ? "block" : "none");
}


/* --- 5. Interaction Helper Functions (Unchanged Logic) --- */

function showModal(event, d) {
    modal.classed("visible", true);
    const [x, y] = d3.pointer(event, document.body);
    modal
        .style("left", `${x + 15}px`)
        .style("top", `${y + 15}px`);
    modal.select("#modal-date").text(formatDate(d.dateObj));
    modal.select("#modal-total-usage").text(formatTime(d.totalUsageSeconds));
    const appList = modal.select("#modal-app-list");
    appList.html(null);
    d.apps.slice(0, 10).forEach(app => {
        appList.append("div")
            .attr("class", "app-item")
            .html(`
                <span class="app-name">${app.name}</span>
                <span class="app-usage">${formatTime(app.usage)}</span>
            `);
    });
    if (d.apps.length > 10) {
        appList.append("div").style("margin-top", "5px").style("color", "#999").text("...and other apps");
    }
}

function hideModal() {
    modal.classed("visible", false);
}

function showTimelineModal(d) {
    timelineModal.classed("visible", true);
    timelineModal.select("#timeline-modal-date").text(formatDate(d.dateObj));
    timelineModal.select("#timeline-modal-total-usage").text(formatTime(d.totalUsageSeconds));
    const appList = timelineModal.select("#timeline-modal-app-list");
    appList.html(null);
    d.apps.slice(0, 10).forEach(app => {
        appList.append("div")
            .attr("class", "app-item")
            .html(`
                <span class="app-name">${app.name}</span>
                <span class="app-usage">${formatTime(app.usage)}</span>
            `);
    });
    if (d.apps.length > 10) {
        appList.append("div").style("margin-top", "5px").style("color", "#999").text("...and other apps");
    }
}

function hideTimelineModal() {
    timelineModal.classed("visible", false);
}

function renderLegend(scale) {
    legendContainer.html("<h4>Daily Usage Time</h4>"); 
    scale.range().forEach(color => {
        const extent = scale.invertExtent(color);
        const text = `${formatTime(Math.round(extent[0]))} - ${formatTime(Math.round(extent[1]))}`;
        const item = legendContainer.append("div").attr("class", "legend-item");
        item.append("div").attr("class", "legend-color-box").style("background-color", color);
        item.append("span").text(text);
    });
}

/**
 * [NEW] Sets up global event listeners (Unchanged Logic)
 */
function setupAppEventListeners(spiralSvg) {
    document.body.addEventListener('datehover', (e) => {
        const hoveredData = e.detail;
        showTimelineModal(hoveredData);
        spiralSvg.selectAll(".day-segment")
            .classed("dimmed", d => d.dateObj !== hoveredData.dateObj)
            .classed("highlighted", d => d.dateObj === hoveredData.dateObj);
    });

    document.body.addEventListener('dateout', () => {
        hideTimelineModal();
        spiralSvg.selectAll(".day-segment")
            .classed("dimmed", false)
            .classed("highlighted", false);
    });
}


/* --- 6. Main Program Execution (Modified) --- */

async function main() {
    try {
        const [rawData, unlockRaw] = await Promise.all([
            d3.csv("app_usage.csv"),
            d3.csv("unlock.csv")
        ]);

        console.log("Raw Data Loaded:", rawData, unlockRaw);

        const unlockMap = parseUnlockData(unlockRaw);
        const processedData = await transformData(rawData, unlockMap);
        
        if (processedData.length === 0) {
            visContainer.text("No data to display. Check CSV file or console.");
            return;
        }
        
        console.log("--- Check transformed data (processedData) ---");
        console.log("Total days:", processedData.length);

        // [修改] Select the correct SVGs
        const spiralSvg = visContainer.append("svg");
        const timelineSvg = d3.select("#timeline-svg");
        
        // Initial Render
        renderSpiral(processedData, spiralSvg);
        renderTimeline(processedData, timelineSvg);

        // Setup cross-component listeners
        setupAppEventListeners(spiralSvg);

        // Setup resize handler
        let resizeTimer;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                console.log("Resizing...");
                renderSpiral(processedData, spiralSvg);
                renderTimeline(processedData, timelineSvg);
            }, 200);
        });

    } catch (error) {
        console.error("Error loading or rendering chart:", error);
        visContainer.text("Data loading failed. Please check if app_usage.csv exists, or check browser console for errors.");
    }
}

// Let's go!
main();