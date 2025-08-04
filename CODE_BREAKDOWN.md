# In-Depth Code Breakdown for the Feasibility Study Widget

This document provides a detailed, section-by-section explanation of the source code for the custom ArcGIS Experience Builder widget found in `src/runtime/widget.tsx`.

---

## 1. Imports (Lines 3-25)

This section imports all necessary dependencies for the widget.

```typescript
// --- Core and UI Library Imports ---
import { React, jsx, AllWidgetProps, css, polished } from 'jimu-core'
import { useState, useRef, useEffect } from 'react'
import { Button, Select, Option, TextInput, Checkbox } from 'jimu-ui'
import { JimuMapViewComponent, JimuMapView, loadArcGISJSAPIModules } from 'jimu-arcgis'

// --- File Parsing Library Imports ---
import shp from 'shpjs'
import { kml } from '@tmcw/togeojson'

// --- Type Imports for ArcGIS JS API ---
import type Graphic from '@arcgis/core/Graphic'
// ... and other ArcGIS types
```

-   **`jimu-core`**: Provides core React functionality (`React`, `jsx`), props for the widget (`AllWidgetProps`), and the CSS-in-JS engine (`css`, `polished`).
-   **`jimu-ui`**: Provides pre-styled UI components like `Button`, `Select`, etc., that match the Experience Builder look and feel.
-   **`jimu-arcgis`**: Provides the essential components for map interaction, like `JimuMapViewComponent`, and the utility for loading ArcGIS API for JavaScript modules (`loadArcGISJSAPIModules`).
-   **`shpjs` & `@tmcw/togeojson`**: These are third-party libraries used to parse user-uploaded shapefiles (`.zip`) and KML files, respectively, converting them into GeoJSON that the widget can process.
-   **Type Imports**: The `import type ...` statements import TypeScript definitions from the ArcGIS API for JavaScript. This provides type safety and autocompletion when working with ArcGIS objects, without bundling the entire module in the final build.

---

## 2. Interfaces & Custom Types (Lines 27-47)

This section defines custom TypeScript interfaces to structure the data used within the widget.

```typescript
interface Message {
  text: string
  type: 'info' | 'success' | 'warning' | 'error'
}

interface SearchResult {
  name: string
  type: string
  target: Geometry | Extent
  graphic?: Graphic
}

interface ReportData {
  [groupName: string]: {
    layerTitle: string
    features: Graphic[]
    unit: string
  }[]
}
```

-   **`Message`**: Defines the structure for status messages displayed to the user, for example, after a file upload.
-   **`SearchResult`**: Defines the structure for a single item in the search results list.
-   **`ReportData`**: Defines the complex data structure for the final report. It's an object where keys are group names (from the map's layer structure), and the value is an array of layer information containing the features that intersected the Area of Interest (AOI).

---

## 3. Main Widget Component (Line 62 onwards)

This is the main React functional component that contains all of the widget's logic and UI.

### 3.1. Refs for ArcGIS Modules & DOM Elements (Lines 65-72)

`useRef` is used to hold references to the ArcGIS JS API modules once they are loaded asynchronously. This is necessary because these modules are loaded at runtime, not at build time.

```typescript
const GraphicClass = useRef<typeof Graphic>(null)
const GraphicsLayerClass = useRef<typeof GraphicsLayer>(null)
// ... other refs
```

### 3.2. State Management (Lines 74-102)

`useState` is used extensively to manage the component's state. Any change to these state variables will cause the component to re-render.

```typescript
const [jimuMapView, setJimuMapView] = useState<JimuMapView>(null)
const [activeTab, setActiveTab] = useState('Search')
const [sketchViewModel, setSketchViewModel] = useState<SketchViewModel>(null)
const [bufferDistance, setBufferDistance] = useState(100)
const [reportData, setReportData] = useState<ReportData>({})
const [searchTerm, setSearchTerm] = useState('')
// ... other state variables
```

Key state variables include:
-   `jimuMapView`: Holds the map view object from Experience Builder.
-   `activeTab`: Tracks which tab is currently active ('Search', 'Draw', or 'Upload').
-   `sketchViewModel`: Holds the instance of the ArcGIS `SketchViewModel` used for drawing on the map.
-   `bufferDistance`, `bufferUnit`: Store the user's input for the buffer tool.
-   `sourceGraphics`, `bufferGraphics`: Store the original graphics drawn by the user and the resulting buffer graphics used for analysis.
-   `reportData`: Stores the structured data for the generated report.
-   `searchTerm`, `searchResults`: Manage the state for the feature search functionality.

### 3.3. Asynchronous Operations (`useEffect`)

`useEffect` hooks are used to handle side effects, such as loading data or interacting with non-React parts of the page like the ArcGIS API.

-   **Module Loading (Lines 149-169)**: This effect runs once when the component mounts. It uses `loadArcGISJSAPIModules` to asynchronously load necessary modules like `Graphic`, `GraphicsLayer`, and `SketchViewModel`. Once loaded, they are stored in the refs defined earlier.

-   **Drawing Initialization (Lines 171-256)**: This is a critical effect that runs whenever `jimuMapView` or `modulesReady` changes. It performs several key setup tasks:
    1.  Creates a new `GraphicsLayer` and adds it to the map to hold all user-drawn shapes.
    2.  Initializes the `SketchViewModel` and links it to the `GraphicsLayer`.
    3.  Sets up event listeners on the `SketchViewModel`. The `'create'` event is used to capture finished drawings, apply buffers if necessary, and add them to the map. The `'delete'` event is used to clean up graphics.
    4.  It also traverses the map's layer structure to build a categorized list of all available feature layers (`layerGroups`), which is used later for the reporting function.

-   **Debounced Search (Lines 258-268)**: This effect watches for changes to the `searchTerm`. It uses `setTimeout` to wait 300ms after the user stops typing before executing the search. This prevents sending a large number of requests to the server while the user is typing.

### 3.4. Core Logic Functions

This is where the main work of the widget happens.

-   **`executeSearch` (Lines 271-307)**: Constructs and sends a query to all visible feature layers based on the user's search term.
-   **`processFiles` (Lines 321-387)**: Handles the logic for file uploads. It checks the file extension and uses the appropriate library (`shpjs` or `@tmcw/togeojson`) to parse the file into GeoJSON.
-   **`createGraphicsFromGeoJSON` (Lines 389-409)**: Converts the parsed GeoJSON features into ArcGIS `Graphic` objects. It also handles the crucial step of re-projecting the geometries from their default (WGS84) to the map's spatial reference.
-   **`handleDrawModeSelect` (Lines 412-419)**: Activates the `SketchViewModel` with the selected drawing tool (e.g., 'point', 'polygon').
-   **`handleReportClick` (Lines 490-561)**: This is the core of the reporting functionality.
    1.  It unions all the buffer graphics into a single AOI geometry.
    2.  It iterates through all the `layerGroups` collected during initialization.
    3.  For each layer, it creates a spatial query using the AOI geometry to find all intersecting features.
    4.  It clips the geometry of the intersecting features to the AOI boundary.
    5.  Finally, it aggregates all the results into the `reportData` state variable and switches the view to the report panel.
-   **`handleDownloadCSV` (Lines 563-610)**: Converts the `reportData` object into a CSV formatted string and triggers a browser download.
-   **`handlePrint` (Lines 612-804)**: A complex function that generates a complete, styled HTML document for printing. It takes a screenshot of the map, assembles summary and detailed data tables, includes form fields for user notes, and opens the resulting HTML in a new browser tab.

### 3.5. Render Functions & UI

The UI is broken down into a series of smaller functions that each render a specific part of the widget. This makes the JSX code much cleaner and easier to manage.

-   **`renderSearchView`, `renderUploadView`, `renderDrawTabView`**: Each function renders the content for one of the main tabs.
-   **`renderReportArea`**: Renders the panel at the bottom of the main view, which contains the buffer settings and the "Report" and "Clear" buttons.
-   **`renderReportView`**: Renders the entire report panel, which is shown after a report has been generated. It includes the back button, action icons, filters, and the expandable list of results.
-   **Main `return` statement (Lines 953-984)**: This is the final render output. It uses conditional rendering to decide whether to show the main view (with the tabs) or the report view, based on the `currentView` state variable. It also includes the `JimuMapViewComponent`, which is the link to the map itself.

---
This structured approach, combining React's state management with the powerful capabilities of the ArcGIS API for JavaScript, results in a highly interactive and functional custom widget.
