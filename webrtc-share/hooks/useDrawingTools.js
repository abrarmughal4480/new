import { useState, useRef, useCallback, useMemo } from 'react';

const useDrawingTools = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [selectedTool, setSelectedTool] = useState('pencil');
  const [lineWidth, setLineWidth] = useState(3);
  const [drawingData, setDrawingData] = useState({});
  
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const lastPointRef = useRef(null);
  const currentCanvasId = useRef(null);
  const backgroundImageData = useRef(null);
  const startPoint = useRef(null);
  
  const initializedCanvases = useRef(new Set());
  const isInitializing = useRef(false);

  const colors = useMemo(() => [
    '#ff0000', '#00ff00', '#0000ff', '#cccc00', '#800080', '#ffff00'
  ], []);

  const tools = useMemo(() => [
    { name: 'pencil', icon: '✏️', title: 'Pencil' },
    { name: 'rectangle', icon: '▭', title: 'Rectangle' },
    { name: 'square', icon: '⬜', title: 'Square' },
    { name: 'ellipse', icon: '⭕', title: 'Ellipse' },
    { name: 'eraser', icon: '🧽', title: 'Eraser' }
  ], []);

  const initializeCanvas = useCallback((canvas, backgroundImage, canvasId) => {
    if (!canvas || isInitializing.current) return;
    
    const canvasKey = `${canvasId}-${canvas.width}-${canvas.height}`;
    if (initializedCanvases.current.has(canvasKey)) {
      canvasRef.current = canvas;
      currentCanvasId.current = canvasId;
      contextRef.current = canvas.getContext('2d');
      return;
    }
    
    isInitializing.current = true;
    
    canvasRef.current = canvas;
    currentCanvasId.current = canvasId;
    const context = canvas.getContext('2d');
    contextRef.current = context;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    canvas.setAttribute('data-original-width', rect.width);
    canvas.setAttribute('data-original-height', rect.height);

    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = selectedColor;
    context.lineWidth = lineWidth;

    if (backgroundImage) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        if (drawingData[canvasId]) {
          const savedCanvas = new Image();
          savedCanvas.onload = () => {
            context.drawImage(savedCanvas, 0, 0, canvas.width, canvas.height);
            initializedCanvases.current.add(canvasKey);
            isInitializing.current = false;
          };
          savedCanvas.src = drawingData[canvasId];
        } else {
          initializedCanvases.current.add(canvasKey);
          isInitializing.current = false;
        }
      };
      img.src = backgroundImage;
    } else {
      initializedCanvases.current.add(canvasKey);
      isInitializing.current = false;
    }
  }, [lineWidth, selectedColor, drawingData]);

  const saveDrawingState = useCallback(() => {
    if (!canvasRef.current || !currentCanvasId.current) return;
    
    const dataURL = canvasRef.current.toDataURL('image/png', 1.0);
    console.log('💾 Saving drawing state for canvas:', currentCanvasId.current);
    setDrawingData(prev => {
      const newData = {
        ...prev,
        [currentCanvasId.current]: dataURL
      };
      console.log('📊 Updated drawing data keys:', Object.keys(newData));
      return newData;
    });
  }, []);

  const saveCanvasSnapshot = useCallback(() => {
    if (!canvasRef.current || !contextRef.current) return;
    backgroundImageData.current = contextRef.current.getImageData(
      0, 0, canvasRef.current.width, canvasRef.current.height
    );
  }, []);

  const restoreCanvasSnapshot = useCallback(() => {
    if (!backgroundImageData.current || !contextRef.current) return;
    contextRef.current.putImageData(backgroundImageData.current, 0, 0);
  }, []);

  const drawShape = useCallback((startX, startY, endX, endY, tool) => {
    if (!contextRef.current) return;
    
    contextRef.current.strokeStyle = selectedColor;
    contextRef.current.lineWidth = lineWidth;
    contextRef.current.beginPath();
    
    if (tool === 'rectangle') {
      const width = endX - startX;
      const height = endY - startY;
      contextRef.current.strokeRect(startX, startY, width, height);
    } else if (tool === 'square') {
      const size = Math.max(Math.abs(endX - startX), Math.abs(endY - startY));
      const width = endX >= startX ? size : -size;
      const height = endY >= startY ? size : -size;
      contextRef.current.strokeRect(startX, startY, width, height);
    } else if (tool === 'ellipse') {
      const radiusX = Math.abs(endX - startX) / 2;
      const radiusY = Math.abs(endY - startY) / 2;
      const centerX = startX + (endX - startX) / 2;
      const centerY = startY + (endY - startY) / 2;
      
      contextRef.current.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      contextRef.current.stroke();
    }
  }, [selectedColor, lineWidth]);

  const getCoordinates = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  const startDrawing = useCallback((e) => {
    if (!contextRef.current || isInitializing.current) return;
    
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    
    lastPointRef.current = { x, y };
    startPoint.current = { x, y };
    
    if (['rectangle', 'square', 'ellipse'].includes(selectedTool)) {
      saveCanvasSnapshot();
    }
    
    if (selectedTool === 'pencil' || selectedTool === 'eraser') {
      contextRef.current.strokeStyle = selectedTool === 'eraser' ? '#ffffff' : selectedColor;
      contextRef.current.lineWidth = selectedTool === 'eraser' ? lineWidth * 3 : lineWidth;
      contextRef.current.beginPath();
      contextRef.current.moveTo(x, y);
    }
  }, [selectedTool, selectedColor, lineWidth, getCoordinates, saveCanvasSnapshot]);

  const draw = useCallback((e) => {
    if (!isDrawing || !contextRef.current || isInitializing.current) return;
    
    const { x, y } = getCoordinates(e);
    
    if (selectedTool === 'pencil' || selectedTool === 'eraser') {
      contextRef.current.lineTo(x, y);
      contextRef.current.stroke();
    } else if (['rectangle', 'square', 'ellipse'].includes(selectedTool)) {
      restoreCanvasSnapshot();
      const startX = startPoint.current.x;
      const startY = startPoint.current.y;
      drawShape(startX, startY, x, y, selectedTool);
    }
    
    lastPointRef.current = { x, y };
  }, [isDrawing, selectedTool, getCoordinates, restoreCanvasSnapshot, drawShape]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    // Add a small delay to ensure the final stroke is completed
    setTimeout(() => {
      saveDrawingState();
    }, 50);
  }, [isDrawing, saveDrawingState]);

  const clearCanvas = useCallback((canvasId) => {
    if (!contextRef.current || !canvasRef.current || isInitializing.current) return;
    
    contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    setDrawingData(prev => {
      const newData = { ...prev };
      delete newData[canvasId];
      return newData;
    });
    
    const canvasKey = `${canvasId}-${canvasRef.current.width}-${canvasRef.current.height}`;
    initializedCanvases.current.delete(canvasKey);
    
    const backgroundImage = canvasRef.current.getAttribute('data-background');
    if (backgroundImage) {
      const img = new Image();
      img.onload = () => {
        contextRef.current.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
      };
      img.src = backgroundImage;
    }
  }, []);

  const getCanvasDataURL = useCallback((canvasId) => {
    if (drawingData[canvasId]) {
      return drawingData[canvasId];
    }
    if (!canvasRef.current) return null;
    return canvasRef.current.toDataURL('image/png');
  }, [drawingData]);

  const mergeWithBackground = useCallback((backgroundImage, canvasId) => {
    return new Promise((resolve) => {
      const drawingDataURL = drawingData[canvasId];
      
      console.log('🔄 Merging canvas:', canvasId);
      console.log('🎨 Drawing data exists:', !!drawingDataURL);
      
      if (!drawingDataURL) {
        console.log('ℹ️ No drawing data found, returning original image');
        resolve(backgroundImage);
        return;
      }

      const tempCanvas = document.createElement('canvas');
      const tempContext = tempCanvas.getContext('2d');
      
      const img = new Image();
      img.onload = () => {
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        
        // Draw background image first
        tempContext.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
        
        const drawingImg = new Image();
        drawingImg.onload = () => {
          // Draw the annotation layer
          tempContext.globalCompositeOperation = 'source-over';
          tempContext.drawImage(drawingImg, 0, 0, tempCanvas.width, tempCanvas.height);
          const mergedDataURL = tempCanvas.toDataURL('image/png', 1.0);
          console.log('✅ Successfully merged drawing with background');
          resolve(mergedDataURL);
        };
        drawingImg.onerror = () => {
          console.error('❌ Failed to load drawing image');
          resolve(backgroundImage);
        };
        drawingImg.src = drawingDataURL;
      };
      img.onerror = () => {
        console.error('❌ Failed to load background image');
        resolve(backgroundImage);
      };
      img.src = backgroundImage;
    });
  }, [drawingData]);

  const returnValue = useMemo(() => ({
    colors,
    tools,
    selectedColor,
    setSelectedColor,
    selectedTool,
    setSelectedTool,
    lineWidth,
    setLineWidth,
    initializeCanvas,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas,
    mergeWithBackground,
    isDrawing,
    drawingData
  }), [
    colors,
    tools,
    selectedColor,
    selectedTool,
    lineWidth,
    isDrawing,
    Object.keys(drawingData).length
  ]);

  return returnValue;
};

export default useDrawingTools;