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
const DOTS_PER_DAY = 100; // Number of dots generated per block. Warning: This number > 100 may cause significant performance degradation (lag).

// Radius of each dot (pixels)
const DOT_RADIUS = 3;

// Animation configuration: animation delay per day (milliseconds)
// Total animation duration approx: ANIMATION_DAY_DELAY * (total days)
const ANIMATION_DAY_DELAY = 50; // 50ms * 38 days ≈ 1.9 seconds animation

// Color scale (Quantize Scale): Maps usage time (continuous) to 5 discrete colors
const colorScale = d3.scaleQuantize()
    .range([
        "#cce5df", // very low
        "#aee1d4", // low
        "#86d1c0", // medium
        "#5cbea9", // high
        "#00a688"  // very high
        // You can also use d3.schemeBlues[5] or d3.schemeGreens[5]
    ]);

// DOM element selection
const visContainer = d3.select("#vis-container");
const modal = d3.select("#modal");
const legendContainer = d3.select("#legend");

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


/* --- 2. Core Data Transformation (Option A) --- */

/**
 * Convert "wide format" CSV data to "long format" for D3
 * @param {Array} rawData - Raw data loaded from d3.csv()
 * @returns {Array} - Processed daily data array
 */
async function transformData(rawData) {
    // 1. Get all date column names
    // Exclude 'App name', 'Device', and 'Total Usage (seconds)'
    const dateColumns = rawData.columns.filter(col => 
        col !== "App name" && col !== "Device" && col !== "Total Usage (seconds)"
    );

    // 2. Create a Map to aggregate daily data
    const dailyDataMap = new Map();

    // 3. Iterate through all apps (each row)
    rawData.forEach(appRow => {
        const appName = appRow["App name"];
        
        // 4. Iterate through all dates (each column)
        dateColumns.forEach(dateStr => {
            const usageSeconds = parseInt(appRow[dateStr] || 0, 10);

            // Initialize if no data for this date
            if (!dailyDataMap.has(dateStr)) {
                dailyDataMap.set(dateStr, {
                    dateString: dateStr,
                    totalUsageSeconds: 0,
                    apps: []
                });
            }

            // Get the day's data and update
            const dayData = dailyDataMap.get(dateStr);
            dayData.totalUsageSeconds += usageSeconds;

            // Only add to app list if usage > 0 to avoid overly long lists
            if (usageSeconds > 0) {
                dayData.apps.push({
                    name: appName,
                    usage: usageSeconds
                });
            }
        });
    });

    // 5. Convert Map to array and calculate properties needed by d3.js
    let processedData = Array.from(dailyDataMap.values());

    // 6. Parse dates, sort, and calculate 'dayOfWeek' and 'weekNumber'
    const parseDate = d3.timeParse("%B %d, %Y"); // e.g., "September 29, 2025"
    
    let processedDataWithNulls = processedData.map(d => {
        const cleanedDateString = d.dateString.split('.')[0];
        const dateObj = parseDate(cleanedDateString);

        if (!dateObj) {
            console.warn(`Skipping unparseable date column: ${d.dateString}`);
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

    // (Step 2: Filter - remove null)
    processedData = processedDataWithNulls.filter(d => d !== null);

    // (Step 3: Sort - *** must be after filter ***)
    //          This ensures processedData[0] is a valid date
    processedData.sort((a, b) => a.dateObj - b.dateObj);

    // (Step 4: Limit data range per specification - keep only until November 4, 2025)
    const endDate = parseDate("November 4, 2025");
    processedData = processedData.filter(d => d.dateObj <= endDate);

    // 5. Calculate weekNumber and dayIndex - *** must be after sort and filter ***
    const startDate = processedData[0].dateObj; // Safe now

    processedData.forEach((d, index) => {
        // Calculate week number
        const dayDiff = d3.timeDay.count(startDate, d.dateObj);
        d.weekNumber = Math.floor(dayDiff / 7); // 0 = week 1, 1 = week 2...
        
        // Store index to ensure Arc and Dot use the same index system
        d.dayIndex = index; // 0 = day 1, 1 = day 2, ...
    });

    console.log("Processed Data:", processedData);
    return processedData;
}

/**
 * Based on daily data, generate randomly distributed dots within d3.arc blocks.
 * @param {Array} dayData - Processed 38 days of data
 * @param {d3.ScaleLinear} radiusScale - D3 radius scale
 * @param {d3.ScaleQuantize} colorScale - D3 color scale
 * @returns {Array} - A flat array containing all dots (e.g., 38*50=1900)
 */
function generateDotData(dayData, radiusScale, colorScale) {
    const allDots = [];
    console.log("=== generateDotData Debug ===");
    console.log("First 3 days:");
    dayData.slice(0, 3).forEach((day, i) => {
        console.log(`  i=${i}, date=${day.dateString}, dayOfWeek=${day.dayOfWeek}, ` +
                    `innerR=${radiusScale(i).toFixed(1)}, ` +
                    `startAngle=${(day.dayOfWeek * DAY_ANGLE + MONDAY_OFFSET).toFixed(2)}`);
    });
    console.log("Last 3 days:");
    dayData.slice(-3).forEach((day, i) => {
        const actualIndex = dayData.length - 3 + i;
        console.log(`  i=${actualIndex}, date=${day.dateString}, dayOfWeek=${day.dayOfWeek}, ` +
                    `innerR=${radiusScale(actualIndex).toFixed(1)}, ` +
                    `startAngle=${(day.dayOfWeek * DAY_ANGLE + MONDAY_OFFSET).toFixed(2)}`);
    });

    dayData.forEach((day) => {
        // Use dayIndex stored in data object to ensure consistency with Arc
        const i = day.dayIndex;

        // Get the day's boundaries

        const innerR = radiusScale(i);
        const outerR = radiusScale(i) + DAY_SEGMENT_HEIGHT;
        const startAngle = day.dayOfWeek * DAY_ANGLE + MONDAY_OFFSET;
        const endAngle = (day.dayOfWeek + 1) * DAY_ANGLE + MONDAY_OFFSET;
        
        const dayColor = colorScale(day.totalUsageSeconds);

        // Generate DOTS_PER_DAY dots for this day
        for (let j = 0; j < DOTS_PER_DAY; j++) {
            
            // 1. Get random angle
            const randomAngle = Math.random() * (endAngle - startAngle) + startAngle;
            
            // 2. Get random radius
            // Key: Use Math.sqrt(Math.random()) 
            // to ensure dots are uniformly distributed in "area", not in "radius"
            const randomT = Math.sqrt(Math.random());
            const randomRadius = innerR + randomT * (outerR - innerR);
            
            // 3. Convert polar coordinates (r, angle) to Cartesian (x, y)
            // D3/SVG angle 0 is 3 o'clock direction, -PI/2 is 12 o'clock direction
            const x = randomRadius * Math.cos(randomAngle);
            const y = randomRadius * Math.sin(randomAngle);

            allDots.push({
                x: x,
                y: y,
                color: dayColor,
                dayIndex: i // Store day index for animation delay
            });
        }
    });
    console.log("Total dots:", allDots.length);

    return allDots;
}


/* --- 3. Render Visualization (Render Function) --- */

/**
 * Render main spiral chart
 * @param {Array} data - Processed daily data
 * @param {d3.Selection} svg - D3 SVG selector
 */
function renderSpiral(data, svg) {
    
    // Get current container width/height for responsive design
    const containerRect = visContainer.node().getBoundingClientRect();
    const width = containerRect.width - margin.left - margin.right;
    const height = containerRect.height - margin.top - margin.bottom;
    const radius = Math.min(width, height) / 2;

    // Move SVG center point to canvas center
    const g = svg
        .attr("viewBox", `0 0 ${containerRect.width} ${containerRect.height}`) // Responsive key
        .html(null) // Clear old chart (for redraw)
        .append("g")
        .attr("transform", `translate(${containerRect.width / 2}, ${containerRect.height / 2})`);

    // --- Set up scales (Scales) ---

    // 1. Radius (Radius) scale (logic unchanged)
    const innerRadiusStart = 40;
    const maxDayIndex = data.length - 1;
    const radiusScale = d3.scaleLinear()
        .domain([0, maxDayIndex])
        .range([innerRadiusStart, radius - DAY_SEGMENT_HEIGHT]);

    // 2. Color (Color) scale (logic unchanged)
    const maxUsage = d3.max(data, d => d.totalUsageSeconds);
    colorScale.domain([0, maxUsage]);
    
    // --- [ New ] Generate dot data ---
    const dotData = generateDotData(data, radiusScale, colorScale);

    // --- Render Arc (arcs) - [ Modified ] ---
    // These <path> are now "invisible" interactive layers

    // 1. Create Arc generator (logic unchanged)
    // Use dayIndex from data object to ensure consistency with Dot rendering
    const arcGenerator = d3.arc()
        .innerRadius(d => radiusScale(d.dayIndex))
        .outerRadius(d => radiusScale(d.dayIndex) + DAY_SEGMENT_HEIGHT)
        .startAngle(d => d.dayOfWeek * DAY_ANGLE + MONDAY_OFFSET)
        .endAngle(d => (d.dayOfWeek + 1) * DAY_ANGLE + MONDAY_OFFSET)
        .cornerRadius(0); // continuous seams

    // 2. Data binding (Data Join)
    // No longer pass index parameter since arcGenerator reads dayIndex from data object
    g.selectAll("path.day-segment")
        .data(data)
        .join("path")
        .attr("class", "day-segment") // style.css will style it
        .attr("d", d => arcGenerator(d)) // Only pass data object
        .attr("fill", "none") // Set transparent so dots below are visible
        // Interactivity (Interactivity)
        .on("mouseover", (event, d) => {
            showModal(event, d);
        })
        .on("mouseout", () => {
            hideModal();
        });

    // --- Render dots (Dots) ---
    // This is the new "visual layer"
    
    g.selectAll("circle.dot")
        .data(dotData)
        .join("circle")
            .attr("class", "dot")
            // Set dot position and style
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", DOT_RADIUS)
            .attr("fill", d => d.color)
            // Key: Let dots "pass through" mouse events,
            // so mouse can hover over the .day-segment paths below
            .style("pointer-events", "none")
            
            // [ New ] Animation effect
            .style("opacity", 0) // Initial state: fully transparent
        .transition()
            // Animation duration 500ms per dot
            .duration(500) 
            // Set delay based on day index (dayIndex)
            // This creates "fill from inside to outside" animation effect
            .delay(d => d.dayIndex * ANIMATION_DAY_DELAY)
            .style("opacity", 1); // Final state: fully opaque

    // 3. Render legend (This remains the same)
    renderLegend(colorScale);
}


/* --- 4. Interaction Helper Functions (Modal & Legend) --- */

/**
 * Show interaction modal
 * @param {Event} event - D3 mouse event
 * @param {object} d - Bound daily data
 */
function showModal(event, d) {
    modal.classed("visible", true);
    
    // Dynamically position modal based on mouse position
    // Position modal at bottom-right of cursor
    const [x, y] = d3.pointer(event, document.body);
    modal
        .style("left", `${x + 15}px`)
        .style("top", `${y + 15}px`);

    // Fill modal content
    modal.select("#modal-date").text(formatDate(d.dateObj));
    modal.select("#modal-total-usage").text(formatTime(d.totalUsageSeconds));

    // Dynamically generate app list
    const appList = modal.select("#modal-app-list");
    appList.html(null); // Clear old list

    d.apps.slice(0, 10).forEach(app => { // Show max top 10
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
 * Hide interaction modal
 */
function hideModal() {
    modal.classed("visible", false);
}

/**
 * Render color legend
 * @param {d3.ScaleQuantize} scale - Color scale used
 */
function renderLegend(scale) {
    legendContainer.html("<h4>Daily Usage Time</h4>"); // Clear and reset title

    // Quantize scale needs .thresholds() or .quantiles()
    // For simplicity, we directly use scale.range() and scale.invertExtent()
    
    scale.range().forEach(color => {
        const extent = scale.invertExtent(color); // Find range [min, max] for this color
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


/* --- 5. Main Program Execution --- */

/**
 * Main execution function (async)
 */
async function main() {
    try {
        // 1. Load data
        const rawData = await d3.csv("app_usage.csv");
        
        // 2. Transform data (Option A)
        const processedData = await transformData(rawData);
        
        console.log("--- Check transformed data (processedData) ---");
        console.log(processedData);

        console.log("Total days:", processedData.length);
        console.log("First day:", processedData[0].dateString, processedData[0].dayOfWeek);
        console.log("Last day:", processedData[processedData.length-1].dateString, processedData[processedData.length-1].dayOfWeek);

        // 3. Render chart
        // Create SVG canvas
        const svg = visContainer.append("svg");
        
        renderSpiral(processedData, svg);

        // 4. (Optional) Listen for window resize, redraw
        // For performance, use debounce (simple version)
        let resizeTimer;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                renderSpiral(processedData, svg); // Redraw
            }, 200);
        });

    } catch (error) {
        console.error("Error loading or rendering chart:", error);
        visContainer.text("Data loading failed. Please check if app_usage.csv exists, or check browser console for errors.");
    }
}

// Let's go!
main();