# Project Architecture Plan

## 1. Initial Project Structure
- `index.html`: Main HTML file.
- `style.css`: CSS for styling.
- `main.js`: Core JavaScript for D3.js visualization and interactivity.
- `app_usage.csv`: Data file (already exists in the root directory).

## 2. Development Todo List

### Phase 1: Setup and Data Loading
- [ ] Create `index.html` with basic structure, SVG container, and links to CSS/JS.
- [ ] Link D3.js via CDN in `index.html`.
- [ ] Create `style.css` with initial global styles.
- [ ] In `main.js`, implement `d3.csv()` to load `app_usage.csv`.
- [ ] Verify data loading and structure in the browser console.

### Phase 2: Visualization Core - Spiral Layout
- [ ] Implement D3.js scales and layout for the spiral arrangement.
- [ ] Map dates to positions on the spiral, ensuring one week per turn and Monday at 12 o'clock.
- [ ] Draw basic shapes (e.g., arcs or rectangles) for each day, with consistent length/area.
- [ ] Apply color encoding based on daily usage activity.

### Phase 3: Interactivity and Details
- [ ] Implement hover functionality for each day.
- [ ] Create a modal (tooltip) to display detailed app usage and individual times on hover.
- [ ] Ensure the modal is dynamically populated with data for the hovered day.

### Phase 4: Responsiveness and Refinements
- [ ] Implement responsive design for the visualization to adapt to different screen sizes.
- [ ] Refine visual styles in `style.css` for a clean and modern look.
- [ ] Add any necessary labels, axes, or legends for clarity.

## 3. Environment
- Use a local server (e.g., `http-server`) to serve the files and avoid CORS issues during development.