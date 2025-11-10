# Development Specification

## 1. 專案總覽 Project Overview

### 專案目標 Goal
透過 d3.js 視覺化呈現個人手機使用數據，核心敘事 (Core Narrative) 是「日積月累」。旨在讓使用者直觀地意識到，零碎的手機使用時間累積起來的總量是多麼可觀。

### 目標受眾 Audience
任何對自己的數位健康（Digital Wellbeing）感興趣，或對數據視覺化感興趣的一般大眾。

### 最終產出 Deliverables
一個可互動的、單頁式的網頁視覺化作品（Web-based data visualization）。

## 2. 資料規格 Data Specification

### 資料來源 (Data Source)
透過開發者的 Andriod 手機，藉由 StayFree 這個 App monitor 並匯出的 CSV 資料 (app_usage.csv)。

### 原始資料結構 (Raw Data Schema)
CSV 資料為「寬格式 (Wide Format)」。
每一列 (Row) 代表一個 App (e.g., "Instagram", 共 103 個 App)。
每一欄 (Column) 代表一個 日期 (e.g., "September 29, 2025", 共 38 天)。
儲存格中的值為該 App 於該日的使用秒數 (int64)。
欄位中包含 App name, Device, Total Usage (seconds) 及各日期欄位。

將 csv 匯成 Pandas dataframe, 透過 info() 印出結果如下：

```
<class 'pandas.core.frame.DataFrame'>
RangeIndex: 103 entries, 0 to 102
Data columns (total 41 columns):
 #   Column                 Non-Null Count  Dtype 
---  ------                 --------------  ----- 
 0   App name               103 non-null    object
 1   Device                 103 non-null    object
 2   September 29, 2025     103 non-null    int64 
 3   September 30, 2025     103 non-null    int64 
 4   October 1, 2025        103 non-null    int64 
 5   October 2, 2025        103 non-null    int64 
 6   October 3, 2025        103 non-null    int64 
 7   October 4, 2025        103 non-null    int64 
 8   October 5, 2025        103 non-null    int64 
 9   October 6, 2025        103 non-null    int64 
 10  October 7, 2025        103 non-null    int64 
 11  October 8, 2025        103 non-null    int64 
 12  October 9, 2025        103 non-null    int64 
 13  October 10, 2025       103 non-null    int64 
 14  October 11, 2025       103 non-null    int64 
 15  October 12, 2025       103 non-null    int64 
 16  October 13, 2025       103 non-null    int64 
 17  October 14, 2025       103 non-null    int64 
 18  October 15, 2025       103 non-null    int64 
 19  October 16, 2025       103 non-null    int64 
 20  October 17, 2025       103 non-null    int64 
 21  October 18, 2025       103 non-null    int64 
 22  October 19, 2025       103 non-null    int64 
 23  October 20, 2025       103 non-null    int64 
 24  October 21, 2025       103 non-null    int64 
 25  October 22, 2025       103 non-null    int64 
 26  October 23, 2025       103 non-null    int64 
 27  October 24, 2025       103 non-null    int64 
 28  October 25, 2025       103 non-null    int64 
 29  October 26, 2025       103 non-null    int64 
 30  October 26, 2025.1     103 non-null    int64 
 31  October 27, 2025       103 non-null    int64 
 32  October 28, 2025       103 non-null    int64 
 33  October 29, 2025       103 non-null    int64 
 34  October 30, 2025       103 non-null    int64 
 35  October 31, 2025       103 non-null    int64 
 36  November 1, 2025       103 non-null    int64 
 37  November 2, 2025       103 non-null    int64 
 38  November 3, 2025       103 non-null    int64 
 39  November 4, 2025       103 non-null    int64 
 40  Total Usage (seconds)  103 non-null    int64 
dtypes: int64(39), object(2)
```

### 資料前處理 (Data Preprocessing)
**[ 關鍵 ]** 原始資料格式 (寬格式) 不符合 D3.js 繪製螺旋圖的需求 (長格式)。因此，此專案不在外部預處理，而是在 main.js 中執行一個 transformData 函式，於瀏覽器端即時進行資料轉換。

需檢查是否執行以下任務：
1. 寬轉長 (Pivot/Melt): 將 (103 個 App x 38 天) 的資料，轉換為 (38 天) 的資料陣列。
2. 建立「每日物件」: 陣列中的每個元素都是一個物件，代表一天，並包含以下屬性：
   - dateString: 原始日期字串 (e.g., "September 29, 2025")。
   - totalUsageSeconds: 該日所有 App 使用秒數的總和。
   - apps: 一個巢狀陣列 [{name: "App Name", usage: 1200}, ...]，包含該日所有 App 的使用紀錄，並依使用時間降冪排序。
3. 資料清理與計算:
   - 日期清理: 處理原始 CSV 欄位中的髒資料，例如將 "October 26, 2025.1" 清理為 "October 26, 2025"。
   - 日期解析: 使用 d3.timeParse() 將 dateString 轉為 JavaScript Date 物件 (儲存為 dateObj)。
   - 錯誤處理: 過濾 (Filter) 掉任何解析失敗 (回傳 null) 的日期資料。
   - 排序: (重要) 必須先依 dateObj 將 38 天的資料正確排序。
   - 計算 dayOfWeek: 計算星期幾 (e.g., 週一=0, 週二=1 ... 週日=6)，用於 d3.arc 的角度計算。
   - 計算 weekNumber: (重要) 在排序後，根據與第一天的日期差，計算該日屬於第幾週 (e.g., 0, 1, 2...)，用於 d3.arc 的半徑計算。


## 3. 視覺化設計與敘事 (Visualization Design & Narrative)

### 視覺風格 (Visual Style)
簡潔、現代。色階應清晰易讀，代表從「低使用量」到「高使用量」的強度。

## 4. 技術堆疊 (Tech Stack)
### 核心函式庫 (Core Library)
D3.js (v7): 透過 ESM + CDN 方式載入 ("https://cdn.jsdelivr.net/npm/d3@7/+esm")。

### 檔案職責 (File Responsibilities)
- `index.html`: Main HTML file.
  - 職責: 提供網頁的基本 HTML 結構。
  - 內容: 包含 `<body>、<header>`，以及 D3 視覺化的主要掛載點 `<div id="vis-container"></div>`。
  - 互動元素: 包含預先定義好、但預設隱藏的互動視窗 `<div id="modal"></div>` 和圖例容器 `<div id="legend"></div>`。
  - 載入: 透過 `<script type="module" src="main.js"></script>` 載入核心邏輯。
- `style.css`: CSS for styling.
  - 職責: 負責所有視覺樣式與佈局。
  - 內容: 定義 body、header 樣式、#vis-container 的大小。
  - 互動樣式: 定義 #modal 的外觀、display: none (隱藏) / display: block (顯示) 的切換、以及 App 列表樣式。
  - 圖例樣式: 定義 #legend 的絕對定位（左下角）、背景、顏色方塊等樣式。
  - SVG 樣式: 定義 .day-segment (每日區塊) 的 cursor: pointer、stroke (間隔) 和 hover 效果。
- `main.js`: Core JavaScript for D3.js visualization and interactivity.
  - 職責: 專案的「大腦」，處理所有 D3.js 相關的資料處理、繪圖與互動邏輯。
  - 內容:
    - 載入: 載入 D3.js 模組和 app_usage.csv 資料。
    - 資料處理: 包含並執行 transformData 函式 (詳見 2.3 節)。
    - 比例尺 (Scales):
      - d3.scaleQuantize(): 用於 colorScale，將 totalUsageSeconds 映射到離散的顏色。
      - d3.scaleLinear(): 用於 radiusScale，將 weekNumber 映射到 innerRadius 和 outerRadius。
    - 繪圖 (Render):
      - d3.arc(): 核心弧形產生器。
      - renderSpiral(): 主要的繪圖函式，負責將資料綁定 (.data().join("path")) 到 SVG 元素，並設定其 d、fill 屬性。
    - 互動 (Interaction):
      - .on("mouseover", ...): 顯示 #modal，並根據滑鼠位置 (d3.pointer) 定位。
      - .on("mouseout", ...): 隱藏 #modal。
      - showModal() / hideModal(): 控制 modal 內容填充與顯示/隱藏的輔助函式。
    - 輔助元素:
      - renderLegend(): 動態生成圖例內容。
    - 響應式: 監聽 window.resize 事件，並重新呼叫 renderSpiral() 函式重繪圖表。

- `app_usage.csv`: Data file (already exists in the root directory).

### 資料載入 (Data Loading)
使用 d3.csv() 非同步載入資料。

### 開發環境 (Environment)
使用本地伺服器（VS Code "Live Server"）以避免 d3.csv() 的 CORS 錯誤。

## 5. 呈現與互動、功能 (Key Features & Interactivity)
1. 核心佈局 (Layout):
   - 技術: 使用 d3.arc() 產生器繪製 SVG `<path>` 元素。
   - 資料: 38 天的資料 (從 2025/9/29 到 2025/11/4) 被繪製成 38 個獨立的弧形區塊 (.day-segment)。

2. 螺旋結構 (Spiral Structure):
   - 週 (圈): d3.arc 的 innerRadius 和 outerRadius 由 weekNumber (第 0-5 週) 決定。每週的半徑都比前一週大，形成向外擴展的螺旋。
   - 日 (區塊): d3.arc 的 startAngle 和 endAngle 由 dayOfWeek (0-6) 決定。
   - 方向: startAngle 經過校準 (MONDAY_OFFSET)，確保 dayOfWeek: 0 (星期一) 始終位於 12 點鐘方向。

3. 資料編碼 (Data Encoding):
   - 顏色 (Color): 每個區塊的 fill 顏色由該日的 totalUsageSeconds 決定，並透過 d3.scaleQuantize() (量化比例尺) 映射到一個固定的色階（例如 5 種顏色）。這能直觀顯示使用活躍度。
   - 面積/長度 (Area/Length): 每個區塊的弧長和厚度保持一致，以維持螺旋的整潔，避免因每日用量差異導致視覺混亂。

4. 圖例 (Legend):
   - 位置: 畫面左下角。
   - 功能: 由 renderLegend() 函式動態生成，顯示 colorScale 的顏色方塊及其對應的使用時間範圍 (例如 "1-2 小時", "2-3 小時" ...)。

5. 互動：懸停詳情 (Hover for Details):
   - 觸發: 使用者滑鼠 mouseover 懸停在任一天的區塊 (.day-segment) 上時。
   - 反應:
     - 觸發 showModal() 函式。
     - #modal 視窗 (預設 display: none) 切換為 display: block。
     - Modal 視窗的內容被即時填充：顯示該日的日期、星期、總使用時數。
     - Modal 中動態生成一個 App 列表，顯示該日使用時間前 10 名的 App 及其使用時長。
   - 結束: mouseout 事件觸發 hideModal()，隱藏視窗。

6. 響應式設計 (Responsive Design):
   - 技術: SVG 元素使用 viewBox 屬性而非固定的 width 和 height。
   - 行為: 當瀏覽器視窗大小改變時 (resize 事件)，renderSpiral() 函式會被重新呼叫，D3 會根據新的容器大小重新計算半徑 (radius) 和中心點，使圖表平滑縮放。

## 6. 開發里程碑 (Development Milestones)

- [M1] 資料處理：完成 transformData 函式，能正確載入並轉換資料 (包含 weekNumber 和 dayOfWeek)。 (已完成)
- [M2] 靜態圖表：渲染出核心的「螺旋圖」，顏色正確。 (進行中)
- [M3] 互動功能：實現 Modal 視窗的 Hover 顯示與資料填充。
- [M4] 輔助元素：完成圖例 (Legend) 的繪製。
- [M5] 樣式與部屬：調整 CSS 樣式、完成響應式設計並部屬。