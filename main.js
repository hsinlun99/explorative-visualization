// Constants and configuration
const config = {
    margin: { top: 50, right: 50, bottom: 50, left: 50 },
    spiralSpacing: 30,  // Space between spiral turns
    daySize: 15,        // Size of each day marker
    startAngle: -Math.PI / 2  // Start at 12 o'clock position
};

// Utility functions
const parseDate = d3.timeParse('%B %d, %Y');
const formatDate = d3.timeFormat('%Y-%m-%d');
const formatTooltipDate = d3.timeFormat('%B %d, %Y');

// Main visualization class
class AppUsageVisualization {
    constructor() {
        this.svg = d3.select('#spiral');
        this.tooltip = d3.select('#tooltip');
        this.data = null;
        this.processedData = null;
        this.width = 0;
        this.height = 0;
        this.colorScale = null;

        // Initialize the visualization
        this.initialize();
    }

    // Initialize the visualization
    initialize() {
        // Set up responsive SVG
        this.setupSVG();
        
        // Load and process data
        this.loadData().then(() => {
            this.processData();
            this.createScales();
            this.render();
            
            // Add window resize handler
            window.addEventListener('resize', () => {
                this.setupSVG();
                this.render();
            });
        });
    }

    // Set up SVG dimensions
    setupSVG() {
        const container = document.getElementById('visualization');
        this.width = container.clientWidth - config.margin.left - config.margin.right;
        this.height = container.clientHeight - config.margin.top - config.margin.bottom;

        this.svg
            .attr('width', this.width + config.margin.left + config.margin.right)
            .attr('height', this.height + config.margin.top + config.margin.bottom);
    }

    // Load data from CSV file
    async loadData() {
        try {
            const rawData = await d3.csv('app_usage.csv');
            this.data = rawData;
            console.log('Data loaded successfully:', this.data);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    // Process and transform the data
    processData() {
        // Get all dates from column headers (skip first two columns: App name and Device)
        const dateColumns = Object.keys(this.data[0]).slice(2, -1);
        
        // Calculate total usage per day
        this.processedData = dateColumns.map(date => {
            const dailyTotal = this.data.reduce((sum, app) => {
                return sum + (parseInt(app[date]) || 0);
            }, 0);

            return {
                date: parseDate(date),
                totalUsage: dailyTotal,
                details: this.data
                    .filter(app => parseInt(app[date]) > 0)
                    .map(app => ({
                        appName: app['App name'],
                        device: app['Device'],
                        usage: parseInt(app[date])
                    }))
                    .sort((a, b) => b.usage - a.usage)
            };
        }).sort((a, b) => a.date - b.date);
    }

    // Create scales for visualization
    createScales() {
        // Color scale based on usage intensity
        const maxUsage = d3.max(this.processedData, d => d.totalUsage);
        this.colorScale = d3.scaleSequential()
            .domain([0, maxUsage])
            .interpolator(d3.interpolateViridis);
    }

    // Calculate spiral coordinates
    calculateSpiralCoordinates() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const numDays = this.processedData.length;
        const spiralLength = Math.min(this.width, this.height) / 2 - config.margin.top;
        
        return this.processedData.map((d, i) => {
            const angle = config.startAngle + (i * 2 * Math.PI) / 7; // 7 days per turn
            const radius = (Math.floor(i / 7) + 1) * config.spiralSpacing;
            
            return {
                ...d,
                x: centerX + (radius * Math.cos(angle)),
                y: centerY + (radius * Math.sin(angle))
            };
        });
    }

    // Show tooltip with day details
    showTooltip(event, d) {
        const totalMinutes = Math.round(d.totalUsage / 60);
        
        // Create tooltip content
        let content = `
            <h3>${formatTooltipDate(d.date)}</h3>
            <p><strong>Total Usage:</strong> ${totalMinutes} minutes</p>
            <p><strong>Top Apps:</strong></p>
        `;
        
        // Add top 5 apps
        d.details.slice(0, 5).forEach(app => {
            const minutes = Math.round(app.usage / 60);
            content += `<p>${app.appName}: ${minutes} min</p>`;
        });

        this.tooltip
            .html(content)
            .style('display', 'block')
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY + 10) + 'px');
    }

    // Hide tooltip
    hideTooltip() {
        this.tooltip.style('display', 'none');
    }

    // Render the visualization
    render() {
        // Clear previous content
        this.svg.selectAll('*').remove();

        // Create main group element
        const g = this.svg.append('g')
            .attr('transform', `translate(${config.margin.left},${config.margin.top})`);

        // Calculate spiral coordinates
        const spiralData = this.calculateSpiralCoordinates();

        // Draw day markers
        g.selectAll('circle')
            .data(spiralData)
            .enter()
            .append('circle')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', config.daySize)
            .attr('fill', d => this.colorScale(d.totalUsage))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mousemove', (event, d) => {
                this.tooltip
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY + 10) + 'px');
            })
            .on('mouseout', () => this.hideTooltip());
    }
}

// Create visualization instance when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AppUsageVisualization();
});