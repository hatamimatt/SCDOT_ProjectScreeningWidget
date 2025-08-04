/** @jsx jsx */

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
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer'
import type GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import type SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel'
import type * as geometryEngine from '@arcgis/core/geometry/geometryEngine'
import type * as projection from '@arcgis/core/geometry/projection'
import type SpatialReference from '@arcgis/core/geometry/SpatialReference'
import type Geometry from '@arcgis/core/geometry/Geometry'
import type Point from '@arcgis/core/geometry/Point'
import type Polygon from '@arcgis/core/geometry/Polygon'
import type Polyline from '@arcgis/core/geometry/Polyline'
import type Extent from '@arcgis/core/geometry/Extent'

// ========================= INTERFACES & CUSTOM TYPES ========================= //
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

// ========================= SVG ICONS ========================= //
const IconPoint = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6" /></svg>)
const IconPolyline = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polyline points="4,4 10,10 18,6" stroke="currentColor" strokeWidth="2" fill="none" /></svg>)
const IconRectangle = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" /></svg>)
const IconCircle = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8" /></svg>)
const IconPolygon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 18,4 20,12 12,20 4,12" /></svg>)
const IconLayer = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 16.54l-6-3.46 6-3.46 6-3.46-6 3.46zM21 7.46l-9-5.19-9 5.19L12 12.65l9-5.19zM3 13.04l6 3.46V22l-6-3.46V13.04z" /></svg>)
const IconBack = () => (<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>)
const IconRefresh = () => (<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" /></svg>)
const IconDownload = () => (<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>)
const IconPrint = () => (<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" /></svg>)
const IconSettings = () => (<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61-.25-1.17-.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69-.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22-.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" /></svg>)

// ========================= MAIN COMPONENT ========================= //
const Widget = (props: AllWidgetProps<unknown>) => {
  const { theme } = props

  // --- REFS FOR ARCIS JS API MODULES ---
  const GraphicClass = useRef<typeof Graphic>(null)
  const GraphicsLayerClass = useRef<typeof GraphicsLayer>(null)
  const SketchViewModelClass = useRef<typeof SketchViewModel>(null)
  const geometryEngineRef = useRef<typeof geometryEngine>(null)
  const projectionEngine = useRef<typeof projection>(null)
  const SpatialReferenceClass = useRef<typeof SpatialReference>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- STATE MANAGEMENT --- //
  const [jimuMapView, setJimuMapView] = useState<JimuMapView>(null)
  const [activeTab, setActiveTab] = useState('Search')
  const [modulesReady, setModulesReady] = useState(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [currentView, setCurrentView] = useState<'main' | 'report'>('main')

  // State for Upload
  const [messages, setMessages] = useState<Message[]>([])

  // State for Draw/Report
  const [sketchViewModel, setSketchViewModel] = useState<SketchViewModel>(null)
  const [graphicsLayer, setGraphicsLayer] = useState<GraphicsLayer>(null)
  const [drawMode, setDrawMode] = useState<'point' | 'polyline' | 'rectangle' | 'circle' | 'polygon'>(null)
  const [bufferDistance, setBufferDistance] = useState(100)
  const [bufferUnit, setBufferUnit] = useState<'meters' | 'kilometers' | 'feet' | 'miles'>('meters')
  const [bufferGraphics, setBufferGraphics] = useState<Graphic[]>([])
  const [sourceGraphics, setSourceGraphics] = useState<Graphic[]>([])
  const [reportData, setReportData] = useState<ReportData>({})
  const [activeReportGroups, setActiveReportGroups] = useState<{ [key: string]: boolean }>({})
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({})
  const [allGroupNames, setAllGroupNames] = useState<string[]>([])
  const [layerGroups, setLayerGroups] = useState<{ [group: string]: FeatureLayer[] }>({})

  // State for Search
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])

  // --- REFS FOR DRAW STATE (TO AVOID STALE CLOSURES IN EVENT HANDLERS) ---
  const bufferDistanceRef = useRef(bufferDistance)
  const bufferUnitRef = useRef(bufferUnit)
  const drawModeRef = useRef(drawMode)
  useEffect(() => { bufferDistanceRef.current = bufferDistance }, [bufferDistance])
  useEffect(() => { bufferUnitRef.current = bufferUnit }, [bufferUnit])
  useEffect(() => { drawModeRef.current = drawMode }, [drawMode])

  // --- CSS STYLES ---
  const STYLE = css`
    .widget-container { font-family: 'Inter', sans-serif; background-color: #f7fafc; position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; overflow: hidden; }
    .main-panel { flex-grow: 1; display: flex; flex-direction: column; min-height: 0; }
    .nav-bar { display: flex; border-bottom: 2px solid #e2e8f0; flex-shrink: 0; }
    .nav-button { flex: 1; padding: ${polished.rem(12)} ${polished.rem(16)}; background-color: transparent; border: none; cursor: pointer; font-weight: 600; color: #718096; transition: all 0.2s ease-in-out; border-bottom: 2px solid transparent; &:active, &:focus { outline: none; } &.active { color: ${theme.colors.primary}; border-bottom-color: ${theme.colors.primary}; } &:hover:not(.active) { background-color: #edf2f7; } }
    .content-area {
      padding: ${polished.rem(16)};
      background-color: white;
      overflow-y: auto;
      flex-shrink: 0;
    }
    .search-container { display: flex; flex-direction: column; height: 100%; }
    .search-bar-wrapper { position: relative; display: flex; align-items: center; margin-bottom: ${polished.rem(12)}; }
    .search-input { width: 100%; padding: ${polished.rem(10)} ${polished.rem(12)}; border: 2px solid #e2e8f0; border-radius: 0.5rem; font-size: 1rem; transition: border-color 0.2s; &:focus { border-color: ${theme.colors.primary}; outline: none; } }
    .search-spinner { position: absolute; right: ${polished.rem(10)}; border: 3px solid rgba(0,0,0,0.1); border-left-color: ${theme.colors.primary}; border-radius: 50%; width: ${polished.rem(20)}; height: ${polished.rem(20)}; animation: spin 1s linear infinite; }
    .search-results-container { flex-grow: 1; overflow-y: auto; }
    .search-result-item { display: flex; align-items: center; padding: ${polished.rem(10)}; border-bottom: 1px solid #edf2f7; cursor: pointer; transition: background-color 0.2s; &:hover { background-color: #f7fafc; } }
    .result-icon { margin-right: ${polished.rem(12)}; color: #718096; width: ${polished.rem(20)}; height: ${polished.rem(20)}; flex-shrink: 0; }
    .result-text { display: flex; flex-direction: column; }
    .result-name { font-weight: 600; color: #2d3748; }
    .result-type { font-size: 0.8rem; color: #a0aec0; }
    .no-results { text-align: center; color: #718096; padding-top: ${polished.rem(20)}; }
    .drop-zone { width: 100%; padding: ${polished.rem(24)}; border: 2px dashed #e2e8f0; border-radius: 0.5rem; text-align: center; margin-bottom: ${polished.rem(16)}; transition: all 0.3s ease-in-out; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; &.is-loading, &.is-disabled { background-color: #f7fafc; cursor: not-allowed; } &:not(.is-loading):not(.is-disabled):hover { border-color: #63b3ed; cursor: pointer; } }
    .drop-zone-label { color: #4a5568; font-weight: 500; cursor: inherit; margin-bottom: ${polished.rem(8)}; }
    .browse-link { color: #4299e1; text-decoration: underline; }
    .message-container { width: 100%; max-height: ${polished.rem(100)}; overflow-y: auto; text-align: left; padding: ${polished.rem(8)}; background-color: #f0f4f8; border-radius: 0.25rem; border: 1px solid #cbd5e0; margin-top: ${polished.rem(12)}; }
    .file-info { font-size: ${polished.rem(14)}; color: #718096; margin-top: ${polished.rem(4)}; text-align: center; }
    .message-item { font-size: ${polished.rem(13)}; margin-bottom: ${polished.rem(4)}; padding: ${polished.rem(2)} ${polished.rem(4)}; border-radius: 0.25rem; line-height: 1.4; &:last-child { margin-bottom: 0; } }
    .message-item.info { color: #2b6cb0; } .message-item.success { color: #2f855a; } .message-item.warning { color: #dd6b20; } .message-item.error { color: #c53030; font-weight: 600; }
    .spinner { border: 4px solid rgba(0, 0, 0, 0.1); border-left-color: ${theme.colors.primary}; border-radius: 50%; width: ${polished.rem(30)}; height: ${polished.rem(30)}; animation: spin 1s linear infinite; margin-bottom: ${polished.rem(8)}; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .cloud-icon { width: ${polished.rem(50)}; height: ${polished.rem(50)}; color: #a0aec0; margin-bottom: ${polished.rem(10)}; transition: color 0.3s ease-in-out; }
    .drop-zone:hover .cloud-icon { color: ${theme.colors.primary}; }
    .cloud-icon .arrow-path { fill: white; }
    .draw-tab-content { .jimu-btn, .jimu-select, .jimu-input { margin-bottom: ${polished.rem(8)}; } .jimu-btn { margin-right: ${polished.rem(8)}; } .checkbox-label { margin-left: 6px;} }
  `

  // --- EFFECT FOR LOADING MODULES ---
  useEffect(() => {
    if (modulesReady) return
    loadArcGISJSAPIModules([
      'esri/Graphic', 'esri/layers/GraphicsLayer',
      'esri/widgets/Sketch/SketchViewModel',
      'esri/geometry/geometryEngine', 'esri/geometry/projection', 'esri/geometry/SpatialReference'
    ]).then(([
      Graphic, GraphicsLayer, SketchViewModel,
      geometryEngine, projection, SpatialReference
    ]) => {
      GraphicClass.current = Graphic
      GraphicsLayerClass.current = GraphicsLayer
      SketchViewModelClass.current = SketchViewModel
      geometryEngineRef.current = geometryEngine
      projectionEngine.current = projection
      SpatialReferenceClass.current = SpatialReference
      projection.load()
      setModulesReady(true)
    }).catch(err => console.error('Failed to load ArcGIS modules:', err))
  }, [])

  // --- EFFECT FOR INITIALIZING DRAW/REPORT ---
  useEffect(() => {
    if (!jimuMapView?.view || !modulesReady) return

    const view = jimuMapView.view
    const gLayer = new GraphicsLayerClass.current()
    view.map.add(gLayer)
    setGraphicsLayer(gLayer)

    const sketchVM = new SketchViewModelClass.current({
      view: view,
      layer: gLayer,
      pointSymbol: { type: 'simple-marker', style: 'circle', color: [226, 119, 40], size: '12px' },
      polylineSymbol: { type: 'simple-line', color: [226, 119, 40], width: 2 },
      polygonSymbol: { type: 'simple-fill', color: [226, 119, 40, 0.4], outline: { color: [226, 119, 40], width: 1 } }
    })
    setSketchViewModel(sketchVM)

    const createHandle = sketchVM.on('create', (event) => {
      if (event.state === 'complete') {
        setDrawMode(null)
        view.popup.autoOpenEnabled = true
        view.cursor = 'default'

        const sourceGraphic = event.graphic
        let resultGeometry = sourceGraphic.geometry
        let finalGraphic: Graphic

        if (drawModeRef.current === 'point' || drawModeRef.current === 'polyline') {
          if (bufferDistanceRef.current > 0) {
            resultGeometry = geometryEngineRef.current.buffer(
              resultGeometry,
              bufferDistanceRef.current,
              bufferUnitRef.current
            )
          }
        }

        if (resultGeometry) {
          // The graphic added to the map for display and analysis
          finalGraphic = new GraphicClass.current({
            geometry: resultGeometry,
            symbol: { type: 'simple-fill', color: [0, 0, 255, 0.2], outline: { color: [0, 0, 255], width: 1 } },
            attributes: { sourceUID: sourceGraphic.uid } // Link buffer to source
          })
          gLayer.add(finalGraphic)
          setBufferGraphics(prev => [...prev, finalGraphic])
          setSourceGraphics(prev => [...prev, sourceGraphic]) // Keep original
          gLayer.remove(sourceGraphic) // Remove original from map
        }
      }
    })

    const deleteHandle = sketchVM.on('delete', (event) => {
      const deletedBufferUIDs = event.graphics.map(g => g.uid)
      const sourceUIDsToDelete = event.graphics.map(g => g.attributes.sourceUID).filter(Boolean)

      setBufferGraphics(prev => prev.filter(g => !deletedBufferUIDs.includes(g.uid)))
      setSourceGraphics(prev => prev.filter(g => !sourceUIDsToDelete.includes(g.uid)))
    })

    async function collectFeatureLayers (layer, groups, parentTitle = '') {
      try { await layer.load?.() } catch { return }
      if (layer.type === 'feature') {
        const group = parentTitle || 'Ungrouped'
        if (!groups[group]) groups[group] = []
        groups[group].push(layer as FeatureLayer)
      } else if (layer.type === 'group' || layer.type === 'map-image') {
        const sublayers = layer.layers?.toArray?.() || layer.allSublayers?.toArray?.() || []
        for (const sub of sublayers) await collectFeatureLayers(sub, groups, layer.title)
      }
    }
    const mapLayers = view.map.layers.toArray()
    const groups = {}
    Promise.all(mapLayers.map(layer => collectFeatureLayers(layer, groups))).then(() => {
      setLayerGroups(groups)
      setAllGroupNames(Object.keys(groups).sort())
    })

    return () => {
      createHandle.remove()
      deleteHandle.remove()
      sketchVM?.destroy()
      if (view.map && gLayer) view.map.remove(gLayer)
    }
  }, [jimuMapView, modulesReady])

  // --- EFFECT FOR DEBOUNCED SEARCH ---
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults([])
      return
    }
    const debounceSearch = setTimeout(() => {
      executeSearch(searchTerm)
    }, 300)
    return () => clearTimeout(debounceSearch)
  }, [searchTerm, jimuMapView])

  // ========================= SEARCH LOGIC ========================= //
  const executeSearch = async (text: string) => {
    if (!jimuMapView?.view || !modulesReady) return
    setIsSearching(true)
    const view = jimuMapView.view
    const searchText = text.trim()

    const layerPromises = []
    view.map.allLayers.forEach((layer: any) => {
      if (layer.type === 'feature' && layer.url && layer.visible) {
        const searchField = layer.displayField || layer.fields.find(f => f.type === 'string')?.name
        if (searchField) {
          const query = layer.createQuery()
          query.where = `UPPER(${searchField}) LIKE '%${searchText.toUpperCase()}%'`
          query.outFields = ['*']
          query.returnGeometry = true
          query.num = 5
          layerPromises.push(
            layer.queryFeatures(query).then(results =>
              results.features.map(f => ({
                name: f.attributes[layer.displayField] || f.attributes[searchField],
                type: layer.title,
                target: f.geometry,
                graphic: f
              }))
            ).catch(err => {
              console.error(`Failed to query layer ${layer.title}:`, err)
              return []
            })
          )
        }
      }
    })

    const results = await Promise.all(layerPromises)
    setSearchResults(results.flat())
    setIsSearching(false)
  }

  const handleResultClick = (result: SearchResult) => {
    if (!jimuMapView?.view) return
    const view = jimuMapView.view
    view.goTo(result.target).catch(err => {
      if (err.name !== 'AbortError') console.error('goTo failed:', err)
    })
    if (result.graphic) {
      view.popup.open({ features: [result.graphic], location: result.graphic.geometry })
    }
  }

  // ========================= UPLOAD FEATURE LOGIC ========================= //
  const processFiles = async (files: FileList | File[]) => {
    if (!jimuMapView?.view || !modulesReady) return
    setIsLoading(true)
    setMessages([{ text: 'Processing files...', type: 'info' }])
    try {
      if (!projectionEngine.current?.isLoaded()) await projectionEngine.current?.load()
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
          const fileExtension = file.name.split('.').pop()?.toLowerCase()
          let geojson: any
          if (fileExtension === 'geojson' || fileExtension === 'json') {
            geojson = JSON.parse(await file.text())
          } else if (fileExtension === 'zip') {
            geojson = await shp(await file.arrayBuffer())
          } else if (fileExtension === 'kml') {
            const parser = new DOMParser()
            const kmlDoc = parser.parseFromString(await file.text(), 'text/xml')
            geojson = kml(kmlDoc)
            if (!geojson || !geojson.features || geojson.features.length === 0) throw new Error('No valid features in KML.')
          } else {
            setMessages(prev => [...prev, { text: `Skipping unsupported file: ${file.name}`, type: 'warning' }])
            continue
          }

          const collections = Array.isArray(geojson) ? geojson : [geojson]
          const allGraphicsForFile: Graphic[] = []

          for (const collection of collections) {
            const graphics = createGraphicsFromGeoJSON(collection, jimuMapView.view.spatialReference)
            if (graphics) {
              allGraphicsForFile.push(...graphics)
            }
          }

          if (allGraphicsForFile.length > 0) {
            const geometries = allGraphicsForFile.map(g => g.geometry).filter(Boolean)
            if (geometries.length > 0) {
              const unionedGeometry = geometryEngineRef.current.union(geometries)
              const reportGraphic = new GraphicClass.current({
                geometry: unionedGeometry,
                symbol: { type: 'simple-fill', color: [0, 0, 255, 0.2], outline: { color: [0, 0, 255], width: 1 } }
              })
              const sourceGraphicForUpload = new GraphicClass.current({ geometry: unionedGeometry })

              if (graphicsLayer) {
                graphicsLayer.add(reportGraphic)
              }
              setBufferGraphics(prev => [...prev, reportGraphic])
              setSourceGraphics(prev => [...prev, sourceGraphicForUpload])
              setMessages(prev => [...prev, { text: `Shape data loaded from ${file.name}.`, type: 'info' }])
              if (reportGraphic.geometry) {
                jimuMapView.view.goTo(reportGraphic.geometry.extent.expand(1.5))
              }
            }
          }
        } catch (fileErr: any) {
          setMessages(prev => [...prev, { text: `Error with ${file.name}: ${fileErr.message}`, type: 'error' }])
        }
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { text: `Processing error: ${err.message}`, type: 'error' }])
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const createGraphicsFromGeoJSON = (geojson: any, targetSr: SpatialReference): Graphic[] => {
    const sourceSr = new SpatialReferenceClass.current({ wkid: 4326 })
    const graphics = geojson.features.map((feature: any) => {
      if (!feature.geometry) return null
      let geometry: Point | Polygon | Polyline
      switch (feature.geometry.type) {
        case 'Polygon': case 'MultiPolygon':
          const allRings = feature.geometry.type === 'Polygon' ? feature.geometry.coordinates : feature.geometry.coordinates.flat()
          geometry = { type: 'polygon', rings: allRings, spatialReference: sourceSr } as Polygon; break
        case 'LineString': case 'MultiLineString':
          const allPaths = feature.geometry.type === 'LineString' ? [feature.geometry.coordinates] : feature.geometry.coordinates
          geometry = { type: 'polyline', paths: allPaths, spatialReference: sourceSr } as Polyline; break
        case 'Point': geometry = { type: 'point', ...feature.geometry, spatialReference: sourceSr } as Point; break
        default: return null
      }
      const projectedGeometry = projectionEngine.current?.project(geometry, targetSr) as Geometry
      return new GraphicClass.current({ geometry: projectedGeometry })
    }).filter(Boolean)

    return graphics
  }

  // ========================= DRAW/REPORT FEATURE LOGIC ========================= //
  const handleDrawModeSelect = (mode: 'point' | 'polyline' | 'rectangle' | 'circle' | 'polygon') => {
    setDrawMode(mode)
    if (sketchViewModel) {
      jimuMapView.view.popup.autoOpenEnabled = false
      jimuMapView.view.cursor = 'crosshair'
      sketchViewModel.create(mode)
    }
  }

  const handleStartOver = () => {
    if (sketchViewModel?.state === 'active') {
      sketchViewModel.cancel()
    }
    if (graphicsLayer) graphicsLayer.removeAll()
    setBufferGraphics([])
    setSourceGraphics([])

    if (jimuMapView?.view) {
      jimuMapView.view.cursor = 'default'
      jimuMapView.view.popup.autoOpenEnabled = true
    }

    setDrawMode(null)
    setMessages([])
    setCurrentView('main')
  }

  const getBestIdentifier = (attributes: { [key: string]: any }): { key: string, value: any } => {
    const preferredIdKeys = [
      'name', 'street_nam', 'musym', 'subbasnm', 'route_numb', 'waterbody',
      'provincenm', 'county_nam', 'id', 'fid', 'objectid'
    ]
    for (const key of preferredIdKeys) {
      if (attributes[key] !== null && attributes[key] !== undefined) {
        return { key, value: attributes[key] }
      }
    }
    return { key: 'Identifier', value: 'N/A' }
  }

  const filterReportAttributes = (attributes: { [key: string]: any }, unit: string): { [key: string]: any } => {
    const typeKeywords = ['type', 'class', 'water', 'land', 'wetland', 'soil'];

    const identifierInfo = getBestIdentifier(attributes);
    const filteredData: { [key:string]: any } = {};
    filteredData[identifierInfo.key] = identifierInfo.value;

    const lengthKey = Object.keys(attributes).find(k => k.toLowerCase() === 'shape__length');
    if (lengthKey) {
      const value = attributes[lengthKey];
      const header = `Length (${unit})`;
      if (!isNaN(parseFloat(value)) && isFinite(value)) {
        filteredData[header] = parseFloat(value).toFixed(2);
      }
    }

    const areaKey = Object.keys(attributes).find(k => k.toLowerCase() === 'shape__area');
    if (areaKey) {
      const value = attributes[areaKey];
      const header = `Area (${unit}²)`;
      if (!isNaN(parseFloat(value)) && isFinite(value)) {
        filteredData[header] = parseFloat(value).toFixed(2);
      }
    }

    for (const key in attributes) {
      const lowerKey = key.toLowerCase();
      if (typeKeywords.some(keyword => lowerKey.includes(keyword)) && !lowerKey.includes('shape_')) {
        const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase().replace(/_/g, ' ');
        if (!filteredData[formattedKey]) {
          filteredData[formattedKey] = attributes[key];
        }
      }
    }

    return filteredData;
  }

  const handleReportClick = async () => {
    if (bufferGraphics.length === 0 || !geometryEngineRef.current || !GraphicClass.current) {
      return
    }

    const allGeometries = bufferGraphics.map(g => g.geometry)
    const bufferGeometry = geometryEngineRef.current.union(allGeometries)

    const promises = []
    for (const groupName in layerGroups) {
      for (const layer of layerGroups[groupName]) {
        const p = (async () => {
          const query = layer.createQuery()
          query.geometry = bufferGeometry
          query.spatialRelationship = 'intersects'
          query.outFields = ['*']
          query.returnGeometry = true

          const featureSet = await layer.queryFeatures(query)
          const intersectingFeatures = featureSet.features

          if (intersectingFeatures.length > 0) {
            const clippedGraphics = []
            for (const feature of intersectingFeatures) {
              const clippedGeometry = geometryEngineRef.current.intersect(feature.geometry, bufferGeometry)
              if (clippedGeometry) {
                const clippedGraphic = new GraphicClass.current({
                  geometry: clippedGeometry,
                  attributes: feature.attributes
                });
                clippedGraphics.push(clippedGraphic)
              }
            }

            if (clippedGraphics.length > 0) {
              const unit = layer.spatialReference?.unit || jimuMapView.view.spatialReference?.unit || 'units'
              return {
                groupName,
                layerTitle: layer.title,
                features: clippedGraphics,
                unit
              }
            }
          }
          return null
        })()
        promises.push(p)
      }
    }

    const resolvedResults = await Promise.all(promises)
    const newReportData: ReportData = {}
    for (const result of resolvedResults) {
      if (result) {
        const { groupName, layerTitle, features, unit } = result
        if (!newReportData[groupName]) {
          newReportData[groupName] = []
        }
        newReportData[groupName].push({ layerTitle, features, unit })
      }
    }

    const initialActiveGroups = allGroupNames.reduce((acc, groupName) => {
      acc[groupName] = !!newReportData[groupName]
      return acc
    }, {})

    setActiveReportGroups(initialActiveGroups)
    setExpandedSections({})
    setReportData(newReportData)
    setCurrentView('report')
  }

  const handleDownloadCSV = () => {
    if (!reportData) return

    const rows = []
    const headers = new Set(['GroupName', 'LayerName'])

    Object.values(reportData).forEach(layers => {
      layers.forEach(({ features }) => {
        features.forEach(feature => {
          Object.keys(feature.attributes).forEach(key => headers.add(key))
        })
      })
    })

    const headerArray = Array.from(headers)
    rows.push(headerArray.join(','))

    Object.entries(reportData).forEach(([groupName, layers]) => {
      layers.forEach(({ layerTitle, features }) => {
        features.forEach(feature => {
          const row = headerArray.map(header => {
            let value = ''
            if (header === 'GroupName') value = groupName
            else if (header === 'LayerName') value = layerTitle
            else value = feature.attributes[header] ?? ''

            let valueStr = String(value)
            if (valueStr.includes(',') || valueStr.includes('"') || valueStr.includes('\n')) {
              valueStr = `"${valueStr.replace(/"/g, '""')}"`
            }
            return valueStr
          })
          rows.push(row.join(','))
        })
      })
    })

    const csvContent = rows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'report.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = async () => {
    if (!jimuMapView?.view || bufferGraphics.length === 0) {
      alert('Please draw or upload a shape before printing.')
      return
    }

    try {
      const screenshot = await jimuMapView.view.takeScreenshot({ format: 'png', quality: 98 })

      const unionedGeometry = geometryEngineRef.current.union(bufferGraphics.map(g => g.geometry))
      const totalArea = unionedGeometry ? geometryEngineRef.current.geodesicArea(unionedGeometry, 'acres') : 0
      
      const hasPointOrLineSource = sourceGraphics.some(g => g.geometry.type === 'point' || g.geometry.type === 'polyline');
      const bufferText = hasPointOrLineSource ? `${bufferDistanceRef.current} ${bufferUnitRef.current}` : 'N/A';

      const currentDate = new Date().toLocaleString('en-US', { timeZoneName: 'short' })

      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Please allow popups for this site to generate a printable report.')
        return
      }

      const summaryData = []
      const detailTables = []

      for (const [groupName, layers] of Object.entries(reportData)) {
        if (activeReportGroups[groupName]) {
          for (const layer of layers) {
            let layerTotalArea = 0
            let layerTotalLength = 0
            for (const feature of layer.features) {
              if (feature.geometry?.type === 'polygon') {
                layerTotalArea += geometryEngineRef.current.geodesicArea(feature.geometry, 'acres')
              } else if (feature.geometry?.type === 'polyline') {
                layerTotalLength += geometryEngineRef.current.geodesicLength(feature.geometry, 'feet')
              }
            }
            summaryData.push({
              name: layer.layerTitle,
              count: layer.features.length,
              area: layerTotalArea > 0 ? layerTotalArea.toFixed(2) : 'N/A',
              length: layerTotalLength > 0 ? layerTotalLength.toFixed(2) : 'N/A'
            })

            if (layer.features.length === 0) continue

            const processedFeatures = layer.features.map(f => filterReportAttributes(f.attributes, layer.unit))
            if (processedFeatures.length === 0) continue

            const firstFeatureKeys = processedFeatures.length > 0 ? Object.keys(processedFeatures[0]) : [];
            const idHeader = firstFeatureKeys.find(k => !k.toLowerCase().includes('area') && !k.toLowerCase().includes('length'));
            const sizeHeaders = firstFeatureKeys.filter(k => k.toLowerCase().includes('area') || k.toLowerCase().includes('length'));
            const typeHeaders = firstFeatureKeys.filter(k => k !== idHeader && !sizeHeaders.includes(k));
            const headers = [idHeader, ...sizeHeaders, ...typeHeaders].filter(Boolean);

            const headerHtml = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`
            const bodyHtml = processedFeatures.map((attrs) => {
              const rowData = headers.map(header => `<td>${attrs[header] ?? ''}</td>`).join('')
              return `<tr>${rowData}</tr>`
            }).join('')

            detailTables.push(`
              <div class="layer-section">
                <h2>${layer.layerTitle}</h2>
                <table class="report-table">${headerHtml}${bodyHtml}</table>
              </div>
            `)
          }
        }
      }

      const summaryHtml = summaryData.map(row => `
        <tr>
          <td>${row.name}</td>
          <td>${row.count}</td>
          <td>${row.area}</td>
          <td>${row.length}</td>
        </tr>
      `).join('')

      const printHtml = `
        <html>
          <head>
            <title>Feasibility Study Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; background-color: #f4f4f4; color: #333; }
              .page { width: 8.5in; min-height: 11in; padding: 1in; margin: 1rem auto; background: white; box-shadow: 0 0 0.5cm rgba(0,0,0,0.5); box-sizing: border-box; }
              .top-bar { text-align: center; padding: 10px; background: #e9ecef; border-bottom: 1px solid #dee2e6; position: sticky; top: 0; z-index: 10; font-size: 0.8em; }
              .top-bar-controls { position: absolute; right: 20px; top: 5px; }
              .btn { padding: 5px 15px; border: 1px solid #ccc; background-color: #fff; cursor: pointer; border-radius: 4px; }
              h1, h2, h3 { color: #333; }
              .section { margin-bottom: 30px; }
              .title-section { display: flex; align-items: center; justify-content: center; text-align: center; margin-bottom: 30px; border-bottom: 2px solid black; padding-bottom: 15px; }
              .title-section input { font-size: 1.2em; font-weight: bold; border: none; text-align: center; width: 80%; }
              .map-container { margin-bottom: 30px; }
              .map-image { width: 100%; border: 1px solid #ccc; border-radius: 4px; }
              .info-section p { margin: 5px 0; }
              .question { margin-bottom: 20px; }
              .question label { display: block; margin-bottom: 5px; font-weight: bold; font-size: 0.9em; }
              .question textarea { width: 100%; height: 50px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical; box-sizing: border-box; font-family: inherit; font-size: 1em; }
              .report-table { width: 100%; border-collapse: collapse; margin-top: 10px; page-break-inside: auto; }
              .report-table tr { page-break-inside: avoid; page-break-after: auto; }
              .report-table th, .report-table td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 0.9em; word-wrap: break-word; }
              .report-table th { background-color: #f2f2f2; font-weight: bold; }
              .report-table tr:nth-child(even) { background-color: #f9f9f9; }
              .layer-section { page-break-inside: avoid; }
              .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; font-style: italic; color: #666; }
              @media print {
                .top-bar { display: none; }
                body { background-color: #fff; }
                .page { box-shadow: none; margin: 0; border: none; }
              }
            </style>
          </head>
          <body>
            <div class="top-bar">
              <span>This report is designed to be printed on Letter ANSI A (8.5" X 11") Portrait Paper</span>
              <div class="top-bar-controls">
                <button class="btn" onclick="window.print()">Print</button>
                <button class="btn" onclick="window.close()">Close</button>
              </div>
            </div>
            <div class="page">
              <div class="section title-section">
                <input type="text" value="*** Place the Project Title Here ***" />
              </div>
              <div class="section map-container">
                <h2>Map View</h2>
                <img class="map-image" src="${screenshot.dataUrl}" alt="Map View of Area of Interest" />
              </div>
              <div class="section info-section">
                <h2>Area of Interest (AOI) Information</h2>
                <p><strong>Area:</strong> ${totalArea.toFixed(2)} acres</p>
                <p><strong>Buffer:</strong> ${bufferText}</p>
                <p><strong>Date:</strong> ${currentDate}</p>
              </div>
              <div class="section questions-section">
                <h2>Environmental Questions for Feasibility Study</h2>
                <div class="question">
                  <label>What is the anticipated NEPA Document Type?</label>
                  <textarea></textarea>
                </div>
                <div class="question">
                  <label>Is noise analysis required?</label>
                  <textarea></textarea>
                </div>
                <div class="question">
                  <label>What is the anticipated Permit Type(s)?</label>
                  <textarea></textarea>
                </div>
                <div class="question">
                  <label>Are there navigable waters in the project area?</label>
                  <textarea></textarea>
                </div>
                <div class="question">
                  <label>Is the project within an existing Mitigation Bank Service area?</label>
                  <textarea></textarea>
                </div>
                <div class="question">
                  <label>Has a SCDHEC Water Quality Report been provided?</label>
                  <textarea></textarea>
                </div>
                <div class="question">
                  <h2>Additional Comments:</h2>
                  <textarea></textarea>
                </div>
              </div>
              <div class="section">
                <h2>Summary</h2>
                <table class="report-table">
                  <thead><tr><th>Name</th><th>Count</th><th>Area(acres)</th><th>Length(ft)</th></tr></thead>
                  <tbody>${summaryHtml}</tbody>
                </table>
              </div>
              ${detailTables.join('')}
              <div class="footer">
                <div class="footer-content">
                  <p>SCDOT</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `

      printWindow.document.write(printHtml)
      printWindow.document.close()
    } catch (error) {
      console.error('Error generating print view:', error)
      alert('Could not generate the map image for printing.')
    }
  }

  // --- RENDER FUNCTIONS ---
  const isUiDisabled = isLoading || !jimuMapView || !modulesReady

  const renderSearchView = () => (
    <div className="search-container">
      <div className="search-bar-wrapper">
        <input
          type="text"
          placeholder="Search features in visible layers..."
          className="search-input"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          disabled={isUiDisabled}
        />
        {isSearching && <div className="search-spinner"></div>}
      </div>
      <div className="search-results-container">
        {searchResults.map((result, index) => (
          <div key={`${result.name}-${index}`} className="search-result-item" onClick={() => handleResultClick(result)}>
            <div className="result-icon"><IconLayer /></div>
            <div className="result-text">
              <div className="result-name">{result.name}</div>
              <div className="result-type">{result.type}</div>
            </div>
          </div>
        ))}
        {!isSearching && searchTerm && searchResults.length === 0 && (
          <div className="no-results">No results found for "{searchTerm}"</div>
        )}
      </div>
    </div>
  )

  const renderUploadView = () => (
    <>
      <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (!isUiDisabled) processFiles(e.dataTransfer.files) }} onClick={() => !isUiDisabled && fileInputRef.current?.click()} className={`drop-zone ${isUiDisabled ? 'is-disabled' : ''}`} >
        <input type="file" ref={fileInputRef} hidden onChange={(e) => e.target.files && processFiles(e.target.files)} accept=".geojson,.json,.zip,.kml" multiple disabled={isUiDisabled} />
        {isLoading && <div className="spinner"></div>}
        {!isLoading && (<svg className="cloud-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" /><path className="arrow-path" d="M11 15.5V11H9l3-3 3 3h-2v4.5z" /></svg>)}
        <label className="drop-zone-label">{isLoading ? <span>Processing...</span> : <span>Drop shape data or <span className="browse-link">browse</span></span>}</label>
        <p className="file-info">Supports GeoJSON, Shapefile (.zip), KML</p>
        {messages.length > 0 && (<div className="message-container">{messages.map((msg, index) => (<p key={index} className={`message-item ${msg.type}`}>{msg.text}</p>))}</div>)}
      </div>
    </>
  )

  const renderDrawTabView = () => (
    <div className="draw-tab-content">
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ marginBottom: '4px' }}>Select a tool to draw an area of interest</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <Button icon style={{ width: 40, height: 40 }} onClick={() => handleDrawModeSelect('point')} type={drawMode === 'point' ? 'primary' : 'default'} title="Draw Point"><IconPoint /></Button>
          <Button icon style={{ width: 40, height: 40 }} onClick={() => handleDrawModeSelect('polyline')} type={drawMode === 'polyline' ? 'primary' : 'default'} title="Draw Line"><IconPolyline /></Button>
          <Button icon style={{ width: 40, height: 40 }} onClick={() => handleDrawModeSelect('rectangle')} type={drawMode === 'rectangle' ? 'primary' : 'default'} title="Draw Rectangle"><IconRectangle /></Button>
          <Button icon style={{ width: 40, height: 40 }} onClick={() => handleDrawModeSelect('circle')} type={drawMode === 'circle' ? 'primary' : 'default'} title="Draw Circle"><IconCircle /></Button>
          <Button icon style={{ width: 40, height: 40 }} onClick={() => handleDrawModeSelect('polygon')} type={drawMode === 'polygon' ? 'primary' : 'default'} title="Draw Polygon"><IconPolygon /></Button>
        </div>
      </div>
    </div>
  )

  const renderReportArea = () => (
    <div className="report-area-container" css={css`
        padding: ${polished.rem(16)};
        padding-top: 0;
        border-top: 2px solid #e2e8f0;
        background-color: #fdfdfd;
        flex-grow: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
    `}>
        <div style={{ marginTop: polished.rem(16), marginBottom: polished.rem(16) }}>
          <div style={{ fontSize: '13px', color: '#444', marginBottom: '0.25rem' }}>Buffer distance (for points & lines)</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <TextInput type="number" value={bufferDistance.toString()} onChange={(e) => setBufferDistance(Number(e.target.value))} style={{ flex: 1 }} />
            <Select value={bufferUnit} onChange={(e) => setBufferUnit(e.target.value as any)} style={{ width: '120px' }}>
              <Option value="feet">Feet</Option><Option value="meters">Meters</Option><Option value="kilometers">Kilometers</Option><Option value="miles">Miles</Option>
            </Select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
            <Button onClick={handleReportClick} style={{ flex: 1 }} type="primary" disabled={isUiDisabled || bufferGraphics.length === 0}>Report</Button>
            <Button onClick={handleStartOver} style={{ flex: 1 }} type="secondary" disabled={isUiDisabled}>Clear All Shapes</Button>
        </div>
    </div>
  )

  const renderReportView = () => {
    const totalLength = bufferGraphics.length > 0 ? geometryEngineRef.current.union(bufferGraphics.map(g => g.geometry)).extent.width : 0

    return (
      <div id="report-view-container" css={css`flex: 1; display: flex; flex-direction: column; background-color: white; height: 100%;`}>
        <div id="report-header" css={css`display: flex; align-items: center; padding: ${polished.rem(8)} ${polished.rem(12)}; border-bottom: 2px solid #e2e8f0; flex-shrink: 0;`}>
          <Button icon type="tertiary" onClick={() => setCurrentView('main')}><IconBack /></Button>
          <span css={css`font-weight: 600; margin: 0 auto;`}>Length: {(totalLength * 0.000621371).toFixed(2)} mi</span>
          <div>
            <Button icon type="tertiary" onClick={handleReportClick} title="Refresh Report"><IconRefresh /></Button>
            <Button icon type="tertiary" onClick={handleDownloadCSV} title="Download as CSV"><IconDownload /></Button>
            <Button icon type="tertiary" onClick={handlePrint} title="Print Report"><IconPrint /></Button>
            <Button icon type="tertiary" onClick={() => alert('Settings not implemented.')} title="Settings"><IconSettings /></Button>
          </div>
        </div>
        <div id="report-filters" css={css`padding: ${polished.rem(12)}; border-bottom: 1px solid #e2e8f0; display: flex; flex-wrap: wrap; gap: ${polished.rem(16)}; flex-shrink: 0;`}>
          {[...allGroupNames].sort().map(groupName => (
            <div key={groupName}><Checkbox checked={activeReportGroups[groupName] ?? false} onChange={e => setActiveReportGroups({ ...activeReportGroups, [groupName]: e.target.checked })} /><span className="checkbox-label">{groupName}</span></div>
          ))}
        </div>
        <div css={css`flex-grow: 1; overflow-y: auto; padding: ${polished.rem(12)};`}>
          {Object.entries(reportData).map(([groupName, layers]) => {
            if (!activeReportGroups[groupName]) {
              return null
            }

            return layers.map(({ layerTitle, features }) => {
              const isExpanded = expandedSections[layerTitle]
              const featureCount = features.length

              return (
                <div key={layerTitle} css={css`margin-bottom: ${polished.rem(8)}; border: 1px solid #e2e8f0; border-radius: 4px;`}>
                  <div onClick={() => setExpandedSections(prev => ({ ...prev, [layerTitle]: !prev[layerTitle] }))} css={css`display: flex; align-items: center; padding: ${polished.rem(10)}; background-color: #f7fafc; cursor: pointer;`}>
                    <span css={css`font-size: 1.5em; line-height: 1; margin-right: 8px;`}>{isExpanded ? '−' : '+'}</span>
                    <span css={css`font-weight: 600; flex-grow: 1;`}>{layerTitle}</span>
                    <span>({featureCount})</span>
                    <Button icon type="tertiary" size="sm" disabled css={css`margin-left: 8px;`}><IconSettings /></Button>
                  </div>
                  {isExpanded && (
                    <div css={css`padding: ${polished.rem(12)};`}>
                      {features.map((feature, idx) => (
                        <div key={`${layerTitle}-feature-${idx}`} css={css`margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #eee`}>
                          {Object.entries(feature.attributes).filter(([key]) => !['OBJECTID', 'Shape__Area', 'Shape__Length', 'OBJECTID_1'].includes(key)).map(([key, value]) => (
                             <p key={key} css={css`font-size: 0.9em; margin: 0 0 4px 0;`}><strong>{key}:</strong> {value}</p>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          })}
        </div>
      </div>
    )
  }

  // --- MAIN RENDER ---
  return (
    <div css={STYLE}>
      <div className="widget-container">
        <JimuMapViewComponent useMapWidgetId={props.useMapWidgetIds?.[0]} onActiveViewChange={(jmv: JimuMapView) => setJimuMapView(jmv)} />
        <div css={css`position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; overflow: hidden; background-color: ${currentView === 'main' ? 'transparent' : '#f7fafc'}; pointer-events: ${currentView === 'main' ? 'none' : 'auto'};`}>
          {currentView === 'report'
            ? renderReportView()
            : <div className="main-panel" css={css`pointer-events: auto;`}>
                <nav className="nav-bar">
                  <button className={`nav-button ${activeTab === 'Search' ? 'active' : ''}`} onClick={() => { setActiveTab('Search'); setMessages([]) }}>Search</button>
                  <button className={`nav-button ${activeTab === 'Draw' ? 'active' : ''}`} onClick={() => { setActiveTab('Draw'); setMessages([]) }}>Draw</button>
                  <button className={`nav-button ${activeTab === 'Upload' ? 'active' : ''}`} onClick={() => { setActiveTab('Upload'); setMessages([]) }}>Upload</button>
                </nav>
                <div className="content-area">
                  {!jimuMapView && <p>Please connect this widget to a map.</p>}
                  {jimuMapView && !modulesReady && <p>Loading map modules...</p>}
                  {jimuMapView && modulesReady && (
                    <>
                      {activeTab === 'Search' && renderSearchView()}
                      {activeTab === 'Draw' && renderDrawTabView()}
                      {activeTab === 'Upload' && renderUploadView()}
                    </>
                  )}
                </div>
                {jimuMapView && modulesReady && renderReportArea()}
              </div>
          }
        </div>
      </div>
    </div>
  )
}

export default Widget