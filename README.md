# ArcGIS Experience Builder Custom Widget: Feasibility Study Tool

This document provides a detailed breakdown of a custom widget developed for ArcGIS Experience Builder. The widget is a multi-functional tool designed to assist in feasibility studies by allowing users to search, draw, and upload areas of interest (AOI), and then generate detailed reports based on the spatial analysis of those areas.

## 1. High-Level Overview

The widget provides the following core functionalities:

-   **Search:** Search for features within the map's visible layers by name or attribute.
-   **Draw:** Draw various shapes (points, polylines, polygons, etc.) on the map to define a custom AOI. It also supports creating buffers around points and lines.
-   **Upload:** Upload spatial data files (Shapefile, GeoJSON, KML) to define an AOI from existing data.
-   **Report:** Generate a detailed report based on the defined AOI. This report includes a map screenshot, summary tables of intersected features, and detailed attribute information. The report can be printed or exported as a CSV file.

## 2. Core Technologies & Libraries

The widget is built using a modern web development stack:

-   **React:** The fundamental library for building the user interface.
-   **ArcGIS API for JavaScript (via Jimu):** Used for all mapping functionalities, including map interaction, drawing, querying, and geometric operations.
-   **Jimu Framework (`jimu-core`, `jimu-ui`, `jimu-arcgis`):** Esri's libraries for integrating custom widgets within the ArcGIS Experience Builder framework.
-   **shpjs:** A library to parse Shapefiles (`.zip`) directly in the browser.
-   **@tmcw/togeojson:** A library to convert KML files to the GeoJSON format.
-   **Styled-components (via `jsx` pragma):** Used for styling the widget's UI components with CSS-in-JS.

## 3. Code Structure (`widget.tsx`)

The main logic of the widget is contained within the `src/runtime/widget.tsx` file. This file is organized into several distinct sections to maintain clarity and modularity:

-   **Imports:** At the top of the file, all necessary modules from React, Jimu, ArcGIS JS API, and other libraries are imported.
-   **Interfaces & Types:** TypeScript interfaces are defined for key data structures, such as `Message`, `SearchResult`, and `ReportData`, ensuring type safety throughout the application.
-   **SVG Icons:** A collection of stateless functional components that render SVG icons used in the widget's UI, making the UI code cleaner and more readable.
-   **Main Component (`Widget`):** This is the primary React component that encapsulates all the logic and UI for the widget.
    -   **Refs (`useRef`):** React refs are used to hold references to ArcGIS JS API modules (loaded asynchronously) and other DOM elements like the file input.
    -   **State Management (`useState`):** The widget's internal state (e.g., the active tab, search results, drawing tools, and report data) is managed using React's `useState` hook.
    -   **CSS Styles (`STYLE`):** A template literal contains all the CSS for the widget, written using a CSS-in-JS approach. This co-locates styles with their components.
    -   **Effects (`useEffect`):**
        -   An effect hook handles the asynchronous loading of required ArcGIS JS API modules when the widget first mounts.
        -   Another effect hook initializes the drawing (`SketchViewModel`) and reporting tools once the `JimuMapView` is available.
        -   A debounced search effect is triggered when the user types in the search bar, improving performance by limiting the number of API requests.
    -   **Logic Sections:** The code is logically grouped into sections for **Search**, **Upload**, and **Draw/Report** functionalities, making it easier to navigate and understand the code.
    -   **Render Functions:** The UI is broken down into smaller, manageable render functions (e.g., `renderSearchView`, `renderUploadView`, `renderReportView`), which helps in keeping the main render function clean.
    -   **Main Render:** The final `return` statement assembles the entire UI from the smaller render functions based on the current application state.

## 4. Feature Breakdown

### Search

-   A search bar allows users to find features in the map's visible layers.
-   The search is debounced by 300ms to avoid excessive queries while the user is typing.
-   It queries the `displayField` of each visible and queryable feature layer.
-   Clicking on a search result zooms the map to that feature and opens its popup for more details.

### Draw & Upload

-   **Drawing:** Users can select from a toolbar of drawing tools to create points, lines, rectangles, circles, or freeform polygons.
-   **Buffering:** For point and line geometries, a buffer can be applied to create a polygon AOI. The buffer distance and unit (meters, feet, etc.) are configurable by the user.
-   **Uploading:** Users can either drag and drop or use a file browser to upload a `.zip` (Shapefile), `.geojson`, or `.kml` file. The widget processes these files in the browser and adds the features to the map as an AOI.
-   **Graphics Management:** The widget maintains a dedicated `GraphicsLayer` to manage all user-created geometries. This allows for clean management and easy clearing of drawn features without affecting other map layers.

### Reporting

-   **Intersection Analysis:** When the "Report" button is clicked, the widget takes the current AOI (from drawing or uploading) and performs a spatial intersection query against all feature layers in the map.
-   **Data Aggregation:** The results of the intersection are grouped by their original layer and presented to the user in an expandable list, showing the count of features found in each layer.
-   **Report View:** A dedicated view is rendered to display the full report, which includes:
    -   A header with action buttons for **Refresh**, **Download CSV**, and **Print**.
    -   A set of filters to toggle the visibility of different layer groups in the report.
    -   A list of intersected layers with feature counts. Each layer can be expanded to see detailed attribute information for each intersected feature.
-   **Print Functionality:** This feature generates a comprehensive, professionally formatted, and printable HTML report in a new browser tab. The report includes:
    -   A user-editable project title.
    -   A high-quality screenshot of the current map view, centered on the AOI.
    -   Summary information about the AOI (e.g., total area, buffer size, date).
    -   A section with predefined questions for a feasibility study, with text areas for user input.
    -   Summary and detailed tables of the intersected features and their attributes.
-   **CSV Download:** This allows the user to download the raw attribute data of the intersected features as a `.csv` file for use in other applications.

This widget is a powerful tool for preliminary environmental and engineering feasibility studies, providing a streamlined workflow from AOI definition to final report generation, all within the ArcGIS Experience Builder environment.
