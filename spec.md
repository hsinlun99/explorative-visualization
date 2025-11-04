# Development Specification

## 1. 專案總覽 Project Overview
這部分用來定義「為什麼」和「做什麼」。

### 專案目標 Goal
透過 d3.js 視覺化呈現個人手機使用數據，核心敘事 (Core Narrative) 是「日積月累」。旨在讓使用者直觀地意識到，零碎的手機使用時間累積起來的總量是多麼可觀。

### 目標受眾 Audience
任何對自己的數位健康（Digital Wellbeing）感興趣，或對數據視覺化感興趣的一般大眾。

### 最終產出 Deliverables
一個可互動的、單頁式的網頁視覺化作品（Web-based data visualization）。

## 2. 資料規格 Data Specification
這是與 AI 協作時最重要的部分之一。AI 需要知道它正在處理什麼樣的資料。

### 資料來源 (Data Source)
透過作者的 Andriod 手機，藉由 StayFree 這個 App monitor 並匯出的 csv 資料。

### 資料結構 (Data Schema)
CSV 資料已經過前處理，包含除去空值和改欄位名稱等提高可讀性等的手續。
資料包含從 2025/9/29 到 2025/11/4 的各 App 每日使用時間，單位以秒數呈現。
同時也有一個 `Total Usage` 的欄位統計這段時間以來各個 App 的總共使用時間。

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
資料在進入這個專案前已經過初步處理，目前不打算對資料進行更多處理。

## 3. 視覺化設計與敘事 (Visualization Design & Narrative)
定義「如何呈現」這個故事。

### 核心圖表：累計圖 (The "Accumulation" Chart):

描述： 使用 d3.js 的 d3.area() 製作一個累計面積圖 (Cumulative Area Chart)。

X 軸： 時間（例如：過去 365 天）。

Y 軸： 累計使用總時數。

敘事重點： 使用者將會看到這條線如何以驚人的速度向上攀升，直觀地展示「日積月累」的效果。

### 輔助圖表 (Supporting Charts):

每日使用長條圖 (Daily Usage Bar Chart): 顯示每天的使用量，作為累計圖的對比。

應用程式佔比 (App Breakdown): 使用樹狀圖 (Treemap) 或氣泡圖 (Bubble Chart) 顯示哪些 App 佔用了最多時間。

時間熱圖 (Calendar Heatmap): 類似 GitHub 貢獻圖，顯示一年中每天的使用強度。

### 視覺風格 (Visual Style)
範例內容： 簡潔、現代。使用有意義的顏色（例如，高使用量顯示為警示性的暖色調）。

## 4. 技術堆疊 (Tech Stack)
### 核心函式庫 (Core Library)
d3.js (例如 v7 或 v8)。

### 前端架構 (Frontend)
純 HTML/CSS/JavaScript (ES6+)。(除非您想整合 React/Vue，否則建議保持簡單)。

### 資料載入 (Data Loading)
使用 d3.json() 或 d3.csv() 非同步載入資料。

### 開發環境 (Environment)
使用本地伺服器（如 http-server）以避免 CORS 錯誤。

## 5. 互動功能 (Key Features & Interactivity)
定義使用者可以「做什麼」。

### 工具提示 (Tooltips)
需求： 滑鼠懸停（Hover）在累計圖的某個點上時，顯示該日期的「當日使用時數」和「累計總時數」。

### 刷選與連動 (Brushing & Linking)
需求： 在每日長條圖上刷選（Brush）一個時間範圍（例如：五月的第一周），累計圖和 App 佔比圖應動態更新，只顯示該範圍的數據。

### 過場動畫 (Transitions)
需求： 數據更新或切換視圖時，使用 d3.js 的 transition() 產生平滑的動畫效果（例如，長條圖的高度變化）。

### 響應式設計 (Responsive Design)
視覺化圖表應能適應不同螢幕尺寸

## 6. 開發里程碑 (Development Milestones)
這部分用來追蹤進度。

[M1] 資料處理： 成功載入並解析 (Parse) 資料，完成所有前處理邏輯。

[M2] 靜態圖表： 渲染出核心的「累計面積圖」和「每日長條圖」（無互動）。

[M3] 互動功能： 實現 Tooltips 和 Brushing & Linking。

[M4] 輔助圖表： 建立 App 佔比的樹狀圖。

[M5] 樣式與部屬： 調整 CSS 樣式、完成響應式設計並部屬到網頁空間。