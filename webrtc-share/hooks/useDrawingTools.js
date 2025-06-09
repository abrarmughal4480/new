import { useState, useRef, useCallback } from 'react';

const useDrawingTools = () => {
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [selectedTool, setSelectedTool] = useState('brush');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Store canvas references and drawing data
  const canvasRefs = useRef({});
  const contextRefs = useRef({});
  const drawingData = useRef({});
  const startPoints = useRef({});
  const tempCanvas = useRef({});
  const initializedCanvases = useRef(new Set());
  const backgroundImages = useRef({});
  
  // Add preview layer for shapes
  const previewCanvases = useRef({});

  const colors = [
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
    '#ff00ff', '#00ffff', '#000000', '#ffffff',
    '#ff8000', '#8000ff', '#008000', '#800000'
  ];

  const tools = [
    { name: 'brush', icon: '🖌️', title: 'Brush' },
    { name: 'eraser', icon: '🗑️', title: 'Eraser' },
    { name: 'line', icon: '📏', title: 'Line' },
    { name: 'rectangle', icon: '⬜', title: 'Rectangle' },
    { name: 'circle', icon: '⭕', title: 'Circle' },
    { name: 'arrow', icon: '➡️', title: 'Arrow' }
  ];

  const getDevicePixelRatio = () => {
    return window.devicePixelRatio || 1;
  };

  // Fixed coordinate calculation - more consistent
  const getMousePos = (canvas, e) => {
    const rect = canvas.getBoundingClientRect();
    
    // Use simple coordinate transformation without complex scaling
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Redraw all strokes on canvas WITHOUT FLASH - IMPROVED
  const redrawCanvas = useCallback((canvasId) => {
    const canvas = canvasRefs.current[canvasId];
    const ctx = contextRefs.current[canvasId];
    const data = drawingData.current[canvasId];
    const bgImage = backgroundImages.current[canvasId];
    
    if (!canvas || !ctx || !data) return;

    // Use requestAnimationFrame to prevent flash
    requestAnimationFrame(() => {
      // Store current state
      const currentStrokeStyle = ctx.strokeStyle;
      const currentLineWidth = ctx.lineWidth;
      const currentCompositeOp = ctx.globalCompositeOperation;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw background immediately if available
      if (bgImage) {
        const rect = canvas.getBoundingClientRect();
        ctx.drawImage(bgImage, 0, 0, rect.width, rect.height);
        
        // Draw all strokes with FIXED positioning
        if (data.strokes && data.strokes.length > 0) {
          data.strokes.forEach(stroke => {
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
            
            if (stroke.type === 'path' && stroke.points) {
              ctx.beginPath();
              stroke.points.forEach((point, index) => {
                if (index === 0) {
                  ctx.moveTo(point.x, point.y);
                } else {
                  ctx.lineTo(point.x, point.y);
                }
              });
              ctx.stroke();
            } else if (stroke.type === 'shape') {
              ctx.beginPath();
              drawShape(ctx, stroke.startPos, stroke.endPos, stroke.tool);
              ctx.stroke();
            }
          });
        }
      }
      
      // Restore previous state
      ctx.strokeStyle = currentStrokeStyle;
      ctx.lineWidth = currentLineWidth;
      ctx.globalCompositeOperation = currentCompositeOp;
    });
  }, []);

  // IMPROVED Initialize canvas with better scaling
  const initializeCanvas = useCallback((canvas, backgroundImage, canvasId) => {
    if (!canvas || !backgroundImage) return;

    // If already initialized, just redraw
    if (initializedCanvases.current.has(canvasId)) {
      redrawCanvas(canvasId);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    
    // Simplified canvas sizing - no complex DPR scaling
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    const ctx = canvas.getContext('2d');
    
    // Simplified context setup
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    canvasRefs.current[canvasId] = canvas;
    contextRefs.current[canvasId] = ctx;
    
    // Initialize drawing data if not exists
    if (!drawingData.current[canvasId]) {
      drawingData.current[canvasId] = {
        strokes: [],
        backgroundImage: backgroundImage,
        originalWidth: 0,
        originalHeight: 0,
        displayWidth: rect.width,
        displayHeight: rect.height
      };
    }

    // Load and cache background image
    if (!backgroundImages.current[canvasId]) {
      const img = new Image();
      img.onload = () => {
        backgroundImages.current[canvasId] = img;
        drawingData.current[canvasId].originalWidth = img.naturalWidth;
        drawingData.current[canvasId].originalHeight = img.naturalHeight;
        
        // Draw background without flash
        requestAnimationFrame(() => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          
          // If there are existing strokes, redraw them
          if (drawingData.current[canvasId].strokes.length > 0) {
            redrawCanvas(canvasId);
          }
        });
      };
      img.src = backgroundImage;
    } else {
      // Background already cached, draw immediately
      const img = backgroundImages.current[canvasId];
      requestAnimationFrame(() => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        if (drawingData.current[canvasId].strokes.length > 0) {
          redrawCanvas(canvasId);
        }
      });
    }

    initializedCanvases.current.add(canvasId);
    console.log('Canvas initialized for:', canvasId);
  }, [redrawCanvas]);

  const updateCanvasContext = useCallback((canvasId) => {
    const ctx = contextRefs.current[canvasId];
    if (ctx) {
      ctx.strokeStyle = selectedTool === 'eraser' ? 'transparent' : selectedColor;
      ctx.lineWidth = lineWidth;
      ctx.globalCompositeOperation = selectedTool === 'eraser' ? 'destination-out' : 'source-over';
    }
  }, [selectedColor, selectedTool, lineWidth]);

  const startDrawing = useCallback((e) => {
    const canvas = e.target;
    const canvasId = canvas.getAttribute('data-canvas-id');
    
    if (!canvas || !canvasId) return;

    setIsDrawing(true);
    const mousePos = getMousePos(canvas, e);
    startPoints.current[canvasId] = mousePos;

    const ctx = contextRefs.current[canvasId];
    if (!ctx) return;

    updateCanvasContext(canvasId);

    if (selectedTool === 'brush' || selectedTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(mousePos.x, mousePos.y);
      
      // Initialize strokes array if needed
      if (!drawingData.current[canvasId].strokes) {
        drawingData.current[canvasId].strokes = [];
      }
      
      // Add new stroke
      drawingData.current[canvasId].strokes.push({
        tool: selectedTool,
        color: selectedColor,
        lineWidth: lineWidth,
        points: [mousePos],
        type: 'path'
      });
    } else {
      // FIXED: For shapes, create a clean snapshot without clearing everything
      const canvas = canvasRefs.current[canvasId];
      if (canvas) {
        const tempCanvasEl = document.createElement('canvas');
        tempCanvasEl.width = canvas.width;
        tempCanvasEl.height = canvas.height;
        
        const tempCtx = tempCanvasEl.getContext('2d');
        // Copy EXACTLY what's on the main canvas
        tempCtx.drawImage(canvas, 0, 0);
        
        tempCanvas.current[canvasId] = tempCanvasEl;
      }
    }
  }, [selectedColor, selectedTool, lineWidth, updateCanvasContext]);

  // FIXED draw function - no more position shifting
  const draw = useCallback((e) => {
    if (!isDrawing) return;
    
    const canvas = e.target;
    const canvasId = canvas.getAttribute('data-canvas-id');
    
    if (!canvas || !canvasId) return;

    const ctx = contextRefs.current[canvasId];
    if (!ctx) return;

    const mousePos = getMousePos(canvas, e);

    if (selectedTool === 'brush' || selectedTool === 'eraser') {
      ctx.lineTo(mousePos.x, mousePos.y);
      ctx.stroke();
      
      // Add point to current stroke
      const strokes = drawingData.current[canvasId].strokes;
      if (strokes && strokes.length > 0) {
        const currentStroke = strokes[strokes.length - 1];
        currentStroke.points.push(mousePos);
      }
    } else {
      // FIXED: For shapes preview - no more shifting
      const tempCanvasEl = tempCanvas.current[canvasId];
      if (tempCanvasEl && canvas) {
        // Clear and restore from temp canvas WITHOUT affecting stored strokes
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvasEl, 0, 0);
        
        // Draw preview shape with consistent context
        const currentStrokeStyle = ctx.strokeStyle;
        const currentLineWidth = ctx.lineWidth;
        const currentCompositeOp = ctx.globalCompositeOperation;
        
        updateCanvasContext(canvasId);
        ctx.beginPath();
        drawShape(ctx, startPoints.current[canvasId], mousePos, selectedTool);
        ctx.stroke();
        
        // Restore context
        ctx.strokeStyle = currentStrokeStyle;
        ctx.lineWidth = currentLineWidth;
        ctx.globalCompositeOperation = currentCompositeOp;
      }
    }
  }, [isDrawing, selectedTool, updateCanvasContext]);

  // FIXED drawShape function with consistent coordinates
  const drawShape = (ctx, startPos, endPos, tool) => {
    if (!startPos || !endPos) return;

    switch (tool) {
      case 'line':
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(endPos.x, endPos.y);
        break;
        
      case 'rectangle':
        const width = endPos.x - startPos.x;
        const height = endPos.y - startPos.y;
        ctx.rect(startPos.x, startPos.y, width, height);
        break;
        
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2)
        );
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        break;
        
      case 'arrow':
        drawArrow(ctx, startPos.x, startPos.y, endPos.x, endPos.y);
        break;
    }
  };

  const drawArrow = (ctx, fromX, fromY, toX, toY) => {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
  };

  // FIXED stopDrawing - proper shape finalization
  const stopDrawing = useCallback((e) => {
    if (!isDrawing) return;
    
    const canvas = e.target;
    const canvasId = canvas.getAttribute('data-canvas-id');
    
    if (!canvas || !canvasId) return;

    setIsDrawing(false);
    
    if (selectedTool !== 'brush' && selectedTool !== 'eraser') {
      const mousePos = getMousePos(canvas, e);
      const startPos = startPoints.current[canvasId];
      
      if (startPos && mousePos) {
        // Initialize strokes array if needed
        if (!drawingData.current[canvasId].strokes) {
          drawingData.current[canvasId].strokes = [];
        }
        
        // Add final shape to strokes with EXACT coordinates
        drawingData.current[canvasId].strokes.push({
          tool: selectedTool,
          color: selectedColor,
          lineWidth: lineWidth,
          startPos: { ...startPos }, // Create copy to avoid reference issues
          endPos: { ...mousePos },   // Create copy to avoid reference issues
          type: 'shape'
        });
        
        console.log('Shape added:', {
          tool: selectedTool,
          startPos: startPos,
          endPos: mousePos,
          totalStrokes: drawingData.current[canvasId].strokes.length
        });
      }
      
      // Clean up temp canvas
      delete tempCanvas.current[canvasId];
    }
  }, [isDrawing, selectedTool, selectedColor, lineWidth]);

  const clearCanvas = useCallback((canvasId) => {
    const canvas = canvasRefs.current[canvasId];
    const ctx = contextRefs.current[canvasId];
    const data = drawingData.current[canvasId];
    
    if (!canvas || !ctx || !data) return;

    // Clear strokes data
    data.strokes = [];
    
    // Clear canvas and redraw background without flash
    requestAnimationFrame(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const bgImage = backgroundImages.current[canvasId];
      if (bgImage) {
        const rect = canvas.getBoundingClientRect();
        ctx.drawImage(bgImage, 0, 0, rect.width, rect.height);
      }
    });

    console.log('Canvas cleared for:', canvasId);
  }, []);

  // Custom setters
  const setSelectedColorWithUpdate = useCallback((color) => {
    setSelectedColor(color);
  }, []);

  const setSelectedToolWithUpdate = useCallback((tool) => {
    setSelectedTool(tool);
  }, []);

  const setLineWidthWithUpdate = useCallback((width) => {
    setLineWidth(width);
  }, []);

  // IMPROVED Merge with background - better scaling
  const mergeWithBackground = useCallback(async (backgroundImage, canvasId) => {
    return new Promise((resolve) => {
      const bgImage = backgroundImages.current[canvasId];
      if (bgImage) {
        // Use cached image
        const mergeCanvas = document.createElement('canvas');
        const mergeCtx = mergeCanvas.getContext('2d');
        
        mergeCanvas.width = bgImage.naturalWidth;
        mergeCanvas.height = bgImage.naturalHeight;
        
        mergeCtx.imageSmoothingEnabled = true;
        mergeCtx.imageSmoothingQuality = 'high';
        
        mergeCtx.drawImage(bgImage, 0, 0, bgImage.naturalWidth, bgImage.naturalHeight);
        
        const data = drawingData.current[canvasId];
        if (data && data.strokes && data.strokes.length > 0) {
          // FIXED scaling calculation
          const scaleX = bgImage.naturalWidth / data.displayWidth;
          const scaleY = bgImage.naturalHeight / data.displayHeight;
          
          data.strokes.forEach(stroke => {
            mergeCtx.strokeStyle = stroke.color;
            mergeCtx.lineWidth = stroke.lineWidth * Math.min(scaleX, scaleY);
            mergeCtx.lineCap = 'round';
            mergeCtx.lineJoin = 'round';
            mergeCtx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
            
            if (stroke.type === 'path' && stroke.points) {
              mergeCtx.beginPath();
              stroke.points.forEach((point, index) => {
                const scaledX = point.x * scaleX;
                const scaledY = point.y * scaleY;
                
                if (index === 0) {
                  mergeCtx.moveTo(scaledX, scaledY);
                } else {
                  mergeCtx.lineTo(scaledX, scaledY);
                }
              });
              mergeCtx.stroke();
            } else if (stroke.type === 'shape') {
              const startX = stroke.startPos.x * scaleX;
              const startY = stroke.startPos.y * scaleY;
              const endX = stroke.endPos.x * scaleX;
              const endY = stroke.endPos.y * scaleY;
              
              mergeCtx.beginPath();
              
              switch (stroke.tool) {
                case 'line':
                  mergeCtx.moveTo(startX, startY);
                  mergeCtx.lineTo(endX, endY);
                  break;
                  
                case 'rectangle':
                  const width = endX - startX;
                  const height = endY - startY;
                  mergeCtx.rect(startX, startY, width, height);
                  break;
                  
                case 'circle':
                  const radius = Math.sqrt(
                    Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
                  );
                  mergeCtx.arc(startX, startY, radius, 0, 2 * Math.PI);
                  break;
                  
                case 'arrow':
                  const headLength = 15 * Math.min(scaleX, scaleY);
                  const angle = Math.atan2(endY - startY, endX - startX);
                  
                  mergeCtx.moveTo(startX, startY);
                  mergeCtx.lineTo(endX, endY);
                  
                  mergeCtx.lineTo(
                    endX - headLength * Math.cos(angle - Math.PI / 6),
                    endY - headLength * Math.sin(angle - Math.PI / 6)
                  );
                  mergeCtx.moveTo(endX, endY);
                  mergeCtx.lineTo(
                    endX - headLength * Math.cos(angle + Math.PI / 6),
                    endY - headLength * Math.sin(angle + Math.PI / 6)
                  );
                  break;
              }
              
              mergeCtx.stroke();
            }
          });
        }
        
        const dataURL = mergeCanvas.toDataURL('image/png', 1.0);
        resolve(dataURL);
      } else {
        // Fallback to original image loading
        const img = new Image();
        img.onload = () => {
          const mergeCanvas = document.createElement('canvas');
          const mergeCtx = mergeCanvas.getContext('2d');
          
          mergeCanvas.width = img.naturalWidth;
          mergeCanvas.height = img.naturalHeight;
          
          mergeCtx.imageSmoothingEnabled = true;
          mergeCtx.imageSmoothingQuality = 'high';
          
          mergeCtx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
          
          const dataURL = mergeCanvas.toDataURL('image/png', 1.0);
          resolve(dataURL);
        };
        img.src = backgroundImage;
      }
    });
  }, []);

  return {
    colors,
    tools,
    selectedColor,
    setSelectedColor: setSelectedColorWithUpdate,
    selectedTool,
    setSelectedTool: setSelectedToolWithUpdate,
    lineWidth,
    setLineWidth: setLineWidthWithUpdate,
    initializeCanvas,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas,
    mergeWithBackground,
    drawingData: drawingData.current
  };
};

export default useDrawingTools;