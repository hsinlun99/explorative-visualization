# Development Specification (Updated: 2025-11-12)

## 1. 專案總覽 (Project Overview)

### 專案目標 (Goal)
透過 d3.js 視覺化呈現個人手機使用數據，**核心敘事 (Core Narrative) 是「日積月累」**。旨在讓使用者直觀地意識到，零碎的手機使用時間累積起來的總量是多麼可觀。

### 目標受眾 (Audience)
任何對自己的數位健康（Digital Wellbeing）感興趣，或對數據視覺化感興趣的一般大眾。

### 最終產出 (Deliverables)
一個可互動的、單頁式的網頁視覺化作品（Web-based data visualization）。

## 2. 資料規格 (Data Specification)

### 資料來源 (Data Source)
透過開發者的 Andriod 手機，藉由 StayFree 這個 App monitor 並匯出的 CSV 資料 (`app_usage.csv`)。

### 原始資料結構 (Raw Data Schema)
CSV 資料為「**寬格式 (Wide Format)**」。
* 每一**列 (Row)** 代表一個 **App** (e.g., "Instagram")。
* 每一**欄 (Column)** 代表一個 **日期** (e.g., "September 29, 2025")。
* 儲存格中的值為該 App 於該日的**使用秒數 (int64)**。

### 資料前處理 (Data Preprocessing)
**[ 關鍵 ]** 原始資料格式 (寬格式) 不符合 D3.js 繪製螺旋圖的需求 (長格式)。因此，此專案在 `main.js` 中執行一個 `transformData` 函式，於瀏覽器端即時進行資料轉換。

此函式執行以下任務：

1.  **寬轉長 (Pivot/Melt):** 將 (Apps x N 天) 的資料，轉換為 (N 天) 的資料陣列。
2.  **建立「每日物件」:** * 使用 `Map` 結構，以「日期字串」為 `key`，來匯總當日的 `totalUsageSeconds` 和 `apps` 陣列。
    * **日期清理 (Date Cleaning):** 為處理 CSV 中重複的日期欄位 (e.g., `"October 26, 2025"` 和 `"October 26, 2025.1"` )，`transformData` 會使用 `dateString.split('.')[0]` 來取得乾淨的 `key`，從而自動將重複日期的資料**合併累加**到同一個「每日物件」中。
    * **保留 0-Usage 日子:** 此函式**會**保留 `totalUsageSeconds === 0` 的日子，以便在圖表上正確呈現（顯示為邊框和最淺色的點）。
3.  **計算屬性:**
    * **日期解析:** 使用 `d3.timeParse()` 將 `dateString` 轉為 JavaScript `Date` 物件 (儲存為 `dateObj`)。
    * **排序:** **(重要)** 必須先依 `dateObj` 將所有日子**正確排序**。
    * **計算 `dayOfWeek`:** 計算星期幾 (e.g., 週一=0, 週二=1 ... 週日=6)，用於 `d3.arc` 的角度計算。
    * **(註)** `weekNumber` 已被移除，不再需要。

## 3. 視覺化設計與敘事 (Visualization Design & Narrative)

### 視覺風格 (Visual Style)
簡潔、現代。核心視覺從「單調色塊」改為「**點陣紋理 (Stippled Texture)**」，增加視覺豐富性。色階應清晰易讀，代表從「低使用量」到「高使用量」的強度。

## 4. 技術堆疊 (Tech Stack)

### 核心函式庫 (Core Library)
* **D3.js (v7)**: 透過 ESM + CDN 方式載入 (`"https://cdn.jsdelivr.net/npm/d3@7/+esm"`)。

### 檔案職責 (File Responsibilities)

* `index.html`:
    * **職責:** 提供網頁的基本 HTML 結構。
    * **內容:** 包含 `<body>`、`<header>`，以及 D3 視覺化的主要掛載點 `<div id="vis-container"></div>`。
    * **互動元素:** 包含預先定義好、但預設隱藏的互動視窗 `<div id="modal"></div>` 和圖例容器 `<div id="legend"></div>`。

* `style.css`:
    * **職責:** 負責所有視覺樣式與佈局。
    * **互動樣式:**
        * 定義 `#modal` 的外觀與顯示/隱藏。
        * **[ 關鍵 ]** 定義 `.day-segment` 的 `stroke`（邊框）樣式。
        * **[ 關鍵 ]** 為 `.day-segment` 增加 `pointer-events: fill;` 屬性，以確保 `fill: "none"` 的隱形路徑也能大範圍觸發 `hover` 事件。

* `main.js`:
    * **職責:** 專案的「大腦」，處理所有 D3.js 相關的資料處理、繪圖與互動邏輯。
    * **內容:**
        1.  **常數:**
            * `DOTS_PER_DAY`: (e.g., 50) 每個區塊生成的點數（效能關鍵）。
            * `DOT_RADIUS`: (e.g., 1.5) 每個點的半徑。
            * `ANIMATION_DAY_DELAY`: (e.g., 40) 每日動畫的延遲毫秒。
        2.  **資料處理:** 包含並執行 `transformData` 函式 (詳見 2.3 節)。
        3.  **輔助函式 (New):**
            * `generateDotData`: 一個新函式，負責在 `d3.arc` 邊界內生成隨機的 `(x, y)` 點座標。使用 `Math.sqrt(Math.random())` 來確保點在「面積」上均勻分佈。
        4.  **比例尺 (Scales):**
            * `d3.scaleQuantize()`: `colorScale`，將 `totalUsageSeconds` 映射到離散的顏色。
            * `d3.scaleLinear()`: `radiusScale`，將「每日索引 `i`」映射到 `innerRadius`。
        5.  **繪圖 (Render):**
            * `renderSpiral()` 函式現在採用「**雙層結構**」繪圖：
                * **互動層 (Interaction Layer):** 繪製 38 個 `<path class="day-segment">` 元素。它們被設為 `fill: "none"`，僅保留 `stroke` (邊框)，並負責 `mouseover` 事件。
                * **視覺層 (Visual Layer):** 繪製 (38 * `DOTS_PER_DAY`) 個 `<circle class="dot">` 元素。它們的 `fill` 由 `colorScale` 決定，並被設為 `pointer-events: none` 以「穿透」滑鼠事件。
        6.  **互動:** `showModal` / `hideModal` / `renderLegend`。
        7.  **動畫:** `renderSpiral` 函式中的 `.transition()` 和 `.delay()` 負責點的依序浮現動畫。

### 開發環境 (Environment)
使用本地伺服器（如 VS Code "Live Server"）以避免 `d3.csv()` 的 CORS 錯誤。

## 5. 呈現與互動功能 (Key Features & Interactivity)

此視覺化是一個**連續的、點陣填充的螺旋圖 (A Continuous, Stippled Spiral Chart)**。

* **核心佈局 (Layout):**
    * **技術:** `d3.arc()` 產生器。
    * **變更:** 佈局已從「每週同心圓」改為「**單一連續螺旋**」。

* **螺旋結構 (Spiral Structure):**
    * **半徑 (Radius):** `innerRadius` 和 `outerRadius` **不再**由 `weekNumber` 決定。而是由 `d3.scaleLinear()` 將**每日索引 (i)**（0 到 37）映射到一個連續增長的半徑，形成平滑的螺旋。
    * **角度 (Angle):** `d3.arc` 的 `startAngle` 和 `endAngle` 由 `dayOfWeek` (0-6) 決定。
    * **接縫 (Seams) - 角度:** `DAY_PADDING` 已被移除。每一天的 `endAngle` 與下一天的 `startAngle` 數學上相等，確保角度上**無縫**。
    * **接縫 (Seams) - 形狀:** `arcGenerator` 使用 `.cornerRadius(0)`。這確保了區塊間的「接縫」是**平坦且完美連續的**（方案 B），消除了「香腸串」般的區段感。代價是螺旋的內/外側邊緣是多邊形（鋸齒狀）的。
    * **方向:** `MONDAY_OFFSET` 確保 `dayOfWeek: 0` (星期一) 始終位於 12 點鐘方向。

* **資料編碼 (Data Encoding):**
    * **[ 關鍵 ] 填色 (Fill):** **不使用**實色 `fill`。
    * **技術:** 視覺化由數千個 `<circle class="dot">` 元素構成。
    * **邏輯:** `generateDotData` 函式在每個 `d3.arc` 區塊的面積內，隨機撒上 `DOTS_PER_DAY` 個小點。
    * **顏色 (Color):** **每一個小點**的顏色由該日區塊的 `totalUsageSeconds` 透過 `colorScale` 決定。
    * **區塊邊框 (Stroke):** 隱形的 `<path>` 元素保留了 `stroke` 屬性，在視覺上仍為每一天提供了邊界。

* **圖例 (Legend):**
    * **位置:** 畫面左下角。
    * **功能:** `renderLegend()` 動態生成，顯示 `colorScale` 的顏色方塊及其對應的使用時間範圍。

* **互動：懸停詳情 (Hover for Details):**
    * **觸發:** 使用者滑鼠 `mouseover` 懸停在任一天的**完整區域**上時。
    * **技術:** `hover` 事件被一個隱形的 `<path class="day-segment">` 偵聽。
    * **[ 關鍵修復 ]** `style.css` 中的 `pointer-events: fill;` 屬性確保了 `fill: "none"` 的路徑也能偵測到大範圍的 `hover`。
    * **反應:** 觸發 `showModal()` 函式，顯示該日的**日期**、**星期**、**總使用時數**，以及使用時間**前 10 名**的 App 列表。

* **動畫：依序填滿 (Fill-in Animation):**
    * **觸發:** 頁面載入時。
    * **邏輯:** 所有的 `<circle class="dot">` 元素初始 `opacity: 0`（透明）。
    * **效果:** 透過 D3 `transition().delay(d => d.dayIndex * ANIMATION_DAY_DELAY)`，點會根據其所屬的「天 (`dayIndex`)」依序、延遲地淡入 (fade in)，創造出螺旋圖由內至外「逐漸被上色」的動畫效果。

* **響應式設計 (Responsive Design):**
    * **技術:** SVG 元素使用 `viewBox` 屬性。
    * **行為:** 當瀏覽器視窗大小改變時 (`resize` 事件)，`renderSpiral()` 函式會被重新呼叫，D3 會根據新的容器大小重新計算半徑 (`radius`) 和中心點，使圖表平滑縮放。