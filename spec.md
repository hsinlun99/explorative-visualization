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

### 資料來源 (Data Source)
透過開發者的 Andriod 手機，藉由 StayFree 這個 App monitor 並匯出的 csv 資料。

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

### 視覺風格 (Visual Style)
範例內容： 簡潔、現代。

## 4. 技術堆疊 (Tech Stack)
### 核心函式庫 (Core Library)
d3.js。透過 ESM + CDN 方式載入。
使用的版本："https://cdn.jsdelivr.net/npm/d3@7/+esm"

### 前端架構 (Frontend)
純 HTML/CSS/JavaScript。

### 資料載入 (Data Loading)
使用 d3.csv() 非同步載入資料。

### 開發環境 (Environment)
使用本地伺服器（如 http-server）以避免 CORS 錯誤。

## 5. 呈現與互動、功能 (Key Features & Interactivity)

將日期以順時針方式，由內至外的螺旋狀排列呈現各日的使用狀況。且這個螺旋的一圈是以一個星期為單位。也就是說，12 點鐘方向的日子總是星期一。因為考慮到可能每日使用時間會有很大的落差，使得排列成整齊的圓圈會有困難，因此，單日在螺旋排列中的長度(或面積)是一致的。而我會使用不同顏色顯示呈現該日使用的活躍狀況。

當使用者 hover 在某日的資料時，會出現一個 modal 展示該日詳細使用狀況。包含使用的 APP 名稱與個別使用時間

### 響應式設計 (Responsive Design)
視覺化圖表應能適應不同螢幕尺寸

## 6. 開發里程碑 (Development Milestones)