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
透過開發者的 Andriod 手機，藉由 StayFree 這個 App monitor 並匯出的 CSV 資料。
1.  **`app_usage.csv`**: 記錄各個 App 每日的使用**時長**（秒數）。
2.  **`unlock.csv`**: 記錄每日的手機**解鎖次數**（次數）。

### 原始資料結構 (Raw Data Schema)
兩者 CSV 資料為「**寬格式 (Wide Format)**」。
* 每一**列 (Row)** 代表一個 **App** (e.g., "Instagram")。
* 每一**欄 (Column)** 代表一個 **日期** (e.g., "November 16, 2025")。
* **值 (Values)**: 
    * Usage: 秒數 (int64)。
    * Unlock: 次數 (float64/int)。

### 資料前處理 (Data Preprocessing)
***[ 架構變更 ]** 採用平行載入與 Map 查詢合併策略。

1.  **平行載入 (Parallel Loading):** 使用 `Promise.all()` 同時請求兩個 CSV 檔案，確保資料同步就緒。
2.  **解鎖資料解析 (Unlock Parsing):** * 執行 `parseUnlockData` 函式。
    * 建立 `Map<DateString, Count>` 結構，以「乾淨的日期字串」為 Key，提供 O(1) 的快速查詢。
    * 處理日期欄位可能的重複後綴 (e.g., `.1`) 並進行加總。
3.  **主轉換流程 (Main Transformation):**
    * 在 `transformData` 處理 Usage 資料生成「每日物件」時，透過 `dateString` 查詢上述的 `Map`。
    * **注入屬性:** 將查詢到的 `unlockCount` 注入到該日物件中（若無資料則預設為 0）。
    * 其餘邏輯（寬轉長、日期排序、App 排序）維持不變。

## 3. 視覺化設計與敘事 (Visualization Design & Narrative)

### 視覺風格 (Visual Style)
核心視覺維持「**點陣紋理 (Stippled Texture)**」，但賦予了數據意義：
* **顏色 (Color):** 代表 **使用總時長 (Total Usage)**。顏色越深，使用時間越長。
* **密度 (Density):** 代表 **解鎖次數 (Unlock Count)**。點越密集，代表該日手機開關頻率越高（碎片化程度高）。

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
            * `MIN_DOTS` (e.g., 30) 與 `MAX_DOTS` (e.g., 200)，定義視覺密度的上下限，確保視覺可讀性與效能。
        2.  **資料處理:** 實作 `parseUnlockData` 與更新後的 `transformData`。
        3.  **輔助函式 (New):**
            * `generateDotData`: 修改為接收 `densityScale`，並針對每一天的 `unlockCount` 動態計算該生成的點數。使用 `Math.sqrt(Math.random())` 來確保點在「面積」上均勻分佈。
        4.  **比例尺 (Scales):**
            * `d3.scaleQuantize()`: `colorScale`，將 `totalUsageSeconds` 映射到離散的顏色。
            * `d3.scaleLinear()`: `radiusScale`，將「每日索引 `i`」映射到 `innerRadius`。
            * `densityScale`: 使用 `d3.scaleLinear` 將 `[0, maxUnlocks]` 映射至 `[MIN_DOTS, MAX_DOTS]`。
        5.  **繪圖 (Render):**
            * `renderSpiral()` 函式現在採用「**雙層結構**」繪圖：
                * **互動層 (Interaction Layer):** 繪製 38 個 `<path class="day-segment">` 元素。它們被設為 `fill: "none"`，僅保留 `stroke` (邊框)，並負責 `mouseover` 事件。
                * **視覺層 (Visual Layer):** 繪製 (38 * `DOTS_PER_DAY`) 個 `<circle class="dot">` 元素。它們的 `fill` 由 `colorScale` 決定，並被設為 `pointer-events: none` 以「穿透」滑鼠事件。
            * `renderTimeline`: 繪製時間軸圓點時，現在會直接呼叫 `showModal`，確保與螺旋圖有一致的 Tooltip 體驗。
        6.  **互動:** `showModal` / `hideModal` / `renderLegend`。
             * `showModal`: **[新增]** 實作「智慧定位 (Smart Positioning)」邏輯。透過 `getBoundingClientRect` 偵測視窗邊界，當 Modal 接近螢幕底部或右側時，自動翻轉顯示位置（如改為顯示在上方），防止內容被遮擋。
        7.  **動畫:** `renderSpiral` 負責計算 `maxUnlocks` 並定義 `densityScale`。函式中的 `.transition()` 和 `.delay()` 負責點的依序浮現動畫。

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
    * **反應:** 觸發 `showModal()` 函式，顯示該日的**日期**、**星期**、**總使用時數**，以及使用時間**前 5 名**的 App 列表。
    * **Modal 更新:** 除了日期與總時長外，現在 Modal 會額外顯示 **"Unlocks: [次數]"**，讓使用者能驗證視覺密度的準確性。
    * **[新增] 統一體驗 (Unified Experience):** 使用者懸停於右側「時間軸 (Timeline)」的圓點時，現在也會觸發相同的 Modal，顯示該日的詳細資訊。
    * **[新增] 智慧防遮擋 (Smart Positioning):** 系統會自動計算滑鼠位置與視窗邊界的距離。若 Modal 在原位置（右下方）會被螢幕切掉，系統會自動將其翻轉至滑鼠上方或左側，確保資訊永遠清晰可見。
    * **Modal 內容:** 顯示日期、總時長、**"Unlocks: [次數]"** 以及前 5 名 App。

* **動畫：依序填滿 (Fill-in Animation):**
    * **觸發:** 頁面載入時。
    * **邏輯:** 所有的 `<circle class="dot">` 元素初始 `opacity: 0`（透明）。
    * **效果:** 透過 D3 `transition().delay(d => d.dayIndex * ANIMATION_DAY_DELAY)`，點會根據其所屬的「天 (`dayIndex`)」依序、延遲地淡入 (fade in)，創造出螺旋圖由內至外「逐漸被上色」的動畫效果。

* **響應式設計 (Responsive Design):**
    * **技術:** SVG 元素使用 `viewBox` 屬性。
    * **行為:** 當瀏覽器視窗大小改變時 (`resize` 事件)，`renderSpiral()` 函式會被重新呼叫，D3 會根據新的容器大小重新計算半徑 (`radius`) 和中心點，使圖表平滑縮放。