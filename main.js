/* * main.js
 * Mobile Usage Spiral - Core D3 Code
 */

// Load D3.js from CDN (ESM)
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/* --- 1. Static Configuration (Constants & Setup) --- */

// SVG canvas boundary settings
const margin = { top: 40, right: 40, bottom: 40, left: 40 };

// Spiral configuration
const WEEK_SEGMENTS = 7; // 7 days per week
const DAY_ANGLE = (2 * Math.PI) / WEEK_SEGMENTS; // Angle per day
const MONDAY_OFFSET = -Math.PI / 2; // Set Monday (12 o'clock direction) as starting point
const DAY_SEGMENT_HEIGHT = 25; // "Thickness" of each day's block
const DOTS_PER_DAY = 100;
const DOT_RADIUS = 3;
const ANIMATION_DAY_DELAY = 50;

// [New] Timeline configuration
const TIMELINE_PADDING = 30; // Top/Bottom padding for the timeline
const TIMELINE_DAY_HEIGHT = 25; // Vertical space for each day on the timeline

// Color scale
const colorScale = d3.scaleQuantize()
    .range([
        "#cce5df", // very low
        "#aee1d4", // low
        "#86d1c0", // medium
        "#5cbea9", // high
        "#00a688"  // very high
    ]);

// DOM element selection
const visContainer = d3.select("#vis-container");
const legendContainer = d3.select("#legend");
const modal = d3.select("#modal");

// [New] DOM selections for timeline
const timelineContainer = d3.select("#timeline-container");
const timelineModal = d3.select("#timeline-modal");


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

const formatDate = d3.timeFormat("%Y-%m-%d, %A"); // e.g., "2025-09-29, Monday"


/* --- 2. Core Data Transformation --- */

async function transformData(rawData) {
    // ... (Steps 1-4 are unchanged) ...
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

    // 5. Convert Map to array and calculate properties
    let processedData = Array.from(dailyDataMap.values());

    // 6. Parse dates, sort, and calculate properties
    const parseDate = d3.timeParse("%B %d, %Y"); // e.g., "September 29, 2025"
    
    let processedDataWithNulls = processedData.map(d => {
        // [Key change from spec] Use spec's method to merge dates like "Oct 26" and "Oct 26.1"
        const cleanedDateString = d.dateString.split('.')[0]; 
        const dateObj = parseDate(cleanedDateString);

        if (!dateObj) {
            console.warn(`Skipping unparseable date column: ${d.dateString}`);
            return null; 
        }
        const dayOfWeek = (dateObj.getDay() + 6) % 7; // Monday = 0
        
        return {
            ...d, 
            dateObj: dateObj,
            cleanedDateString: cleanedDateString, // Store the cleaned string
            dayOfWeek: dayOfWeek,
            apps: d.apps.sort((a, b) => b.usage - a.usage) 
        };
    });

    // (Step 2: Filter - remove null)
    processedData = processedDataWithNulls.filter(d => d !== null);

    // (Step 3: Sort by date)
    processedData.sort((a, b) => a.dateObj - b.dateObj);

    // [MODIFICATION] Removed the filter that limited data to "November 4, 2025"
    // This allows the timeline to be scrollable with more data, as per new requirements.
    // const endDate = parseDate("November 4, 2025");
    // processedData = processedData.filter(d => d.dateObj <= endDate);

    // 5. Calculate weekNumber and dayIndex - *** must be after sort ***
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

            allDots.push({
                x: x,
                y: y,
                color: dayColor,
                dayIndex: i
            });
        }
    });
    return allDots;
}


/* --- 3. Render Visualization (Spiral) --- */

/**
 * (Unchanged) Render main spiral chart
 */
function renderSpiral(data, svg) {
    
    const containerRect = visContainer.node().getBoundingClientRect();
    const width = containerRect.width - margin.left - margin.right;
    const height = containerRect.height - margin.top - margin.bottom;
    const radius = Math.min(width, height) / 2;

    const g = svg
        .attr("viewBox", `0 0 ${containerRect.width} ${containerRect.height}`)
        .html(null) // Clear old chart
        .append("g")
        .attr("transform", `translate(${containerRect.width / 2}, ${containerRect.height / 2})`);

    // --- Set up scales ---
    const innerRadiusStart = 40;
    const maxDayIndex = data.length - 1;
    const radiusScale = d3.scaleLinear()
        .domain([0, maxDayIndex])
        .range([innerRadiusStart, radius - DAY_SEGMENT_HEIGHT]);

    const maxUsage = d3.max(data, d => d.totalUsageSeconds);
    colorScale.domain([0, maxUsage]);
    
    const dotData = generateDotData(data, radiusScale, colorScale);

    // --- Render Arc (Interaction Layer) ---
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

    // --- Render dots (Visual Layer) ---
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


/* --- 4. [NEW] Render Timeline --- */

// Define arrow paths
const ARROW_UP_PATH = "M4 12 L12 4 L20 12";
const ARROW_DOWN_PATH = "M4 12 L12 20 L20 12";

// State variable to store timeline drag position
let currentTimelineY = 0;

/**
 * [NEW] Renders the draggable vertical timeline
 * @param {Array} data - Processed daily data
 * @param {d3.Selection} svg - The timeline's SVG element
 */
function renderTimeline(data, svg) {
    // 1. Get dimensions
    const containerRect = timelineContainer.node().getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;
    
    // 2. Define content height and Y-scale
    // Oldest date at bottom, newest at top
    const contentHeight = data.length * TIMELINE_DAY_HEIGHT + TIMELINE_PADDING * 2;
    const yDomain = d3.extent(data, d => d.dateObj);
    const yScale = d3.scaleTime()
        .domain(yDomain)
        .range([contentHeight - TIMELINE_PADDING, TIMELINE_PADDING]); // [Bottom, Top]

    // 3. Define drag boundaries
    const maxDragY = 0;
    const minDragY = Math.min(0, height - contentHeight); // Will be 0 or negative
    let isDragging = false;
    
    // Ensure currentTimelineY is within new bounds (on resize)
    currentTimelineY = Math.max(minDragY, Math.min(maxDragY, currentTimelineY));

    // 4. Clear SVG and setup structure
    svg.html(null); // Clear on redraw

    // Append arrows (fixed position)
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
            isDragging = true;
            g.style("cursor", "grabbing");
        })
        .on("drag", (event) => {
            // Calculate new Y, clamped within boundaries
            const newY = currentTimelineY + event.dy;
            currentTimelineY = Math.max(minDragY, Math.min(maxDragY, newY));
            g.attr("transform", `translate(0, ${currentTimelineY})`);
            
            // Update arrows based on new position
            updateTimelineArrows(svg, currentTimelineY, minDragY, maxDragY);
        })
        .on("end", () => {
            isDragging = false;
            g.style("cursor", "grab");
        });

    svg.call(dragHandler); // Apply drag to the whole SVG

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
            if (isDragging) return; // [Key] Don't trigger hover while dragging
            
            // Dispatch custom event for cross-component communication
            document.body.dispatchEvent(new CustomEvent('datehover', {
                detail: d // Pass the day's data
            }));
        })
        .on("mouseout", () => {
            if (isDragging) return;
            
            document.body.dispatchEvent(new CustomEvent('dateout'));
        });

    // 8. Set initial arrow state
    updateTimelineArrows(svg, currentTimelineY, minDragY, maxDragY);
}

/**
 * [NEW] Show/hide timeline drag indicator arrows
 */
function updateTimelineArrows(svg, currentY, minY, maxY) {
    // Show up arrow if we are not at the top
    svg.select("#timeline-arrow-up")
        .style("display", currentY < maxY ? "block" : "none");

    // Show down arrow if we are not at the bottom
    svg.select("#timeline-arrow-down")
        .style("display", currentY > minY ? "block" : "none");
}


/* --- 5. Interaction Helper Functions --- */

/**
 * (Unchanged) Show interaction modal for Spiral
 */
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

/**
 * (Unchanged) Hide interaction modal for Spiral
 */
function hideModal() {
    modal.classed("visible", false);
}

/**
 * [NEW] Show fixed modal for Timeline
 */
function showTimelineModal(d) {
    timelineModal.classed("visible", true);
    
    // Position is fixed by CSS, just fill content
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

/**
 * [NEW] Hide fixed modal for Timeline
 */
function hideTimelineModal() {
    timelineModal.classed("visible", false);
}


/**
 * (Unchanged) Render color legend
 */
function renderLegend(scale) {
    legendContainer.html("<h4>Daily Usage Time</h4>"); 

    scale.range().forEach(color => {
        const extent = scale.invertExtent(color);
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

/**
 * [NEW] Sets up global event listeners for cross-component communication
 * @param {d3.Selection} spiralSvg - The spiral chart's SVG element
 */
function setupAppEventListeners(spiralSvg) {
    
    // Listen for hover events FROM the timeline
    document.body.addEventListener('datehover', (e) => {
        const hoveredData = e.detail;
        
        // 1. Show the timeline modal
        showTimelineModal(hoveredData);
        
        // 2. Highlight/Dim the spiral chart
        spiralSvg.selectAll(".day-segment")
            .classed("dimmed", d => d.dateObj !== hoveredData.dateObj)
            .classed("highlighted", d => d.dateObj === hoveredData.dateObj);
    });

    // Listen for mouseout events FROM the timeline
    document.body.addEventListener('dateout', () => {
        // 1. Hide the timeline modal
        hideTimelineModal();
        
        // 2. Reset the spiral chart styles
        spiralSvg.selectAll(".day-segment")
            .classed("dimmed", false)
            .classed("highlighted", false);
    });
}


/* --- 6. Main Program Execution --- */

/**
 * [MODIFIED] Main execution function
 */
async function main() {
    try {
        // 1. Load and transform data
        const rawData = await d3.csv("app_usage.csv");
        const processedData = await transformData(rawData);
        
        if (processedData.length === 0) {
            visContainer.text("No data to display. Check CSV file or console.");
            return;
        }

        console.log("--- Check transformed data (processedData) ---");
        console.log("Total days:", processedData.length);
        console.log("First day:", processedData[0].cleanedDateString, processedData[0].dayOfWeek);
        console.log("Last day:", processedData[processedData.length-1].cleanedDateString, processedData[processedData.length-1].dayOfWeek);

        // 3. Create SVG canvases
        const spiralSvg = visContainer.append("svg");
        const timelineSvg = d3.select("#timeline-svg"); // Select existing SVG from HTML
        
        // 4. Initial Render
        renderSpiral(processedData, spiralSvg);
        renderTimeline(processedData, timelineSvg);

        // 5. [NEW] Setup cross-component listeners
        setupAppEventListeners(spiralSvg);

        // 6. [MODIFIED] Setup resize handler
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