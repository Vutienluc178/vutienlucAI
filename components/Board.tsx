import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ToolType, DrawingSettings, Point } from '../types';
import { Check, X, Maximize2 } from 'lucide-react';

interface BoardProps {
  tool: ToolType;
  settings: DrawingSettings;
  clearTrigger: number;
  undoTrigger: number;
  onScreenShareReady: (isActive: boolean) => void;
  getCanvasRef: (ref: HTMLCanvasElement | null) => void;
  getVideoRef: (ref: HTMLVideoElement | null) => void;
  backgroundImage: string | null;
  boardColor: string;
  showGrid: boolean;
}

interface PastedImageState {
  element: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: number;
}

interface InteractionState {
  mode: 'move' | 'resize' | null;
  startX: number;
  startY: number;
  initialX: number; // x position or width
  initialY: number; // y position or height
}

const Board: React.FC<BoardProps> = ({ 
  tool, 
  settings, 
  clearTrigger,
  undoTrigger,
  onScreenShareReady,
  getCanvasRef,
  getVideoRef,
  backgroundImage,
  boardColor,
  showGrid
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null); 
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<Point | null>(null);
  const lastPosRef = useRef<Point | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastWidthRef = useRef<number>(settings.width);

  const [snapshot, setSnapshot] = useState<ImageData | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [typingPos, setTypingPos] = useState<Point | null>(null);

  // --- Paste Image State ---
  const [pastedImage, setPastedImage] = useState<PastedImageState | null>(null);
  const [interaction, setInteraction] = useState<InteractionState>({ 
    mode: null, startX: 0, startY: 0, initialX: 0, initialY: 0 
  });

  // Initialize refs for parent
  useEffect(() => {
    getCanvasRef(canvasRef.current);
    getVideoRef(videoRef.current);
  }, [getCanvasRef, getVideoRef]);

  // Reset typing if tool changes
  useEffect(() => {
    setTypingPos(null);
  }, [tool]);

  // Auto-focus input when it appears
  useEffect(() => {
    if (typingPos && inputRef.current) {
      inputRef.current.focus();
    }
  }, [typingPos]);

  // Setup Canvas Size with ResizeObserver (Fixed: Preserves Content)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (canvas.width > 0 && canvas.height > 0 && ctx) {
           // Create temp canvas to store current drawing
           const tempCanvas = document.createElement('canvas');
           tempCanvas.width = canvas.width;
           tempCanvas.height = canvas.height;
           const tempCtx = tempCanvas.getContext('2d');
           tempCtx?.drawImage(canvas, 0, 0);

           // Resize
           canvas.width = width;
           canvas.height = height;

           // Restore (draw back the old content)
           ctx.drawImage(tempCanvas, 0, 0);
        } else {
           // First init
           canvas.width = width;
           canvas.height = height;
        }
      }
    });

    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Handle Clear
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev.slice(-19), currentData]);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPastedImage(null);
  }, [clearTrigger]);

  // Handle Undo
  useEffect(() => {
    if (history.length === 0 || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const previousState = history[history.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setHistory(prev => prev.slice(0, -1));
  }, [undoTrigger]);

  // --- PASTE HANDLING ---
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                const maxWidth = window.innerWidth * 0.5;
                const scale = img.width > maxWidth ? maxWidth / img.width : 1;
                const width = img.width * scale;
                const height = img.height * scale;
                
                setPastedImage({
                  element: img,
                  x: (window.innerWidth - width) / 2,
                  y: (window.innerHeight - height) / 2,
                  width,
                  height,
                  aspectRatio: img.width / img.height
                });
              };
              img.src = event.target?.result as string;
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // --- INTERACTION LOGIC (Paste) ---
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!interaction.mode || !pastedImage) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const deltaX = clientX - interaction.startX;
      const deltaY = clientY - interaction.startY;

      if (interaction.mode === 'move') {
        setPastedImage(prev => prev ? ({
          ...prev,
          x: interaction.initialX + deltaX,
          y: interaction.initialY + deltaY
        }) : null);
      } else if (interaction.mode === 'resize') {
        let newWidth = interaction.initialX + deltaX;
        let newHeight = newWidth / pastedImage.aspectRatio;
        if (newWidth < 50) {
           newWidth = 50;
           newHeight = 50 / pastedImage.aspectRatio;
        }
        setPastedImage(prev => prev ? ({
          ...prev,
          width: newWidth,
          height: newHeight
        }) : null);
      }
    };

    const handleUp = () => {
      setInteraction({ mode: null, startX: 0, startY: 0, initialX: 0, initialY: 0 });
    };

    if (interaction.mode) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [interaction, pastedImage]);

  const confirmPaste = () => {
    if (!pastedImage || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const currentData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHistory(prev => [...prev.slice(-19), currentData]);
    ctx.drawImage(pastedImage.element, pastedImage.x, pastedImage.y, pastedImage.width, pastedImage.height);
    setPastedImage(null);
  };

  const cancelPaste = () => setPastedImage(null);

  // Automatically confirm paste when tool changes
  useEffect(() => {
    if (pastedImage) {
      confirmPaste();
    }
  }, [tool]);

  const getMousePos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (pastedImage) return;

    const pos = getMousePos(e);

    if (tool === 'text') {
      setTimeout(() => setTypingPos(pos), 0);
      return;
    }

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;

    const currentData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHistory(prev => [...prev.slice(-19), currentData]);

    setIsDrawing(true);
    setStartPos(pos);
    lastPosRef.current = pos;
    lastTimeRef.current = Date.now();
    
    // For calligraphy, start thinner to simulate touch-down
    if (tool === 'calligraphy') {
       lastWidthRef.current = settings.width * 0.25; 
    } else {
       lastWidthRef.current = settings.width;
    }
    
    setSnapshot(currentData);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = settings.color;
    ctx.lineWidth = settings.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 0.5;
    ctx.shadowColor = settings.color;
    ctx.setLineDash([]); 

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.shadowBlur = 0;
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    if (tool === 'dashed') {
      ctx.setLineDash([settings.width * 3, settings.width * 2]);
      ctx.shadowBlur = 0;
    }
  };

  const drawArrowHead = (ctx: CanvasRenderingContext2D, from: Point, to: Point, color?: string) => {
    const headLength = 15;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const prevStroke = ctx.strokeStyle;
    
    if (color) ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headLength * Math.cos(angle - Math.PI / 6), to.y - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headLength * Math.cos(angle + Math.PI / 6), to.y - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
    if (color) ctx.strokeStyle = prevStroke;
  };

  const draw3DCoord = (ctx: CanvasRenderingContext2D, origin: Point, end: Point) => {
    const length = Math.max(Math.abs(end.x - origin.x), Math.abs(end.y - origin.y));
    const zEnd = { x: origin.x, y: origin.y - length }; // Z up
    const xEnd = { x: origin.x - length * 0.866, y: origin.y + length * 0.5 }; // X bottom-left (approx 120deg)
    const yEnd = { x: origin.x + length * 0.866, y: origin.y + length * 0.5 }; // Y bottom-right

    // Z Axis - Blue
    ctx.beginPath(); ctx.strokeStyle = '#3b82f6'; 
    ctx.moveTo(origin.x, origin.y); ctx.lineTo(zEnd.x, zEnd.y); ctx.stroke();
    drawArrowHead(ctx, origin, zEnd, '#3b82f6');
    ctx.fillText('z', zEnd.x + 5, zEnd.y);

    // X Axis - Red
    ctx.beginPath(); ctx.strokeStyle = '#ef4444';
    ctx.moveTo(origin.x, origin.y); ctx.lineTo(xEnd.x, xEnd.y); ctx.stroke();
    drawArrowHead(ctx, origin, xEnd, '#ef4444');
    ctx.fillText('x', xEnd.x - 10, xEnd.y);

    // Y Axis - Green
    ctx.beginPath(); ctx.strokeStyle = '#22c55e';
    ctx.moveTo(origin.x, origin.y); ctx.lineTo(yEnd.x, yEnd.y); ctx.stroke();
    drawArrowHead(ctx, origin, yEnd, '#22c55e');
    ctx.fillText('y', yEnd.x + 10, yEnd.y);

    // Center O
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('O', origin.x + 5, origin.y + 15);
  };

  const drawPolygon = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, sides: number) => {
    if (sides < 3) return;
    ctx.beginPath();
    // Rotate to make point upwards
    const angleOffset = sides % 2 === 0 ? 0 : -Math.PI / 2; 
    
    for (let i = 0; i <= sides; i++) {
        const angle = i * 2 * Math.PI / sides + angleOffset;
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();
  };

  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, outerRadius: number, innerRadius: number, spikes: number) => {
      let rot = Math.PI / 2 * 3;
      let x = cx;
      let y = cy;
      let step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
          x = cx + Math.cos(rot) * outerRadius;
          y = cy + Math.sin(rot) * outerRadius;
          ctx.lineTo(x, y);
          rot += step;

          x = cx + Math.cos(rot) * innerRadius;
          y = cy + Math.sin(rot) * innerRadius;
          ctx.lineTo(x, y);
          rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.stroke();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !startPos) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const currentPos = getMousePos(e);

    // --- CALLIGRAPHY / PREMIUM BRUSH (UPGRADED) ---
    if (tool === 'calligraphy') {
      if (lastPosRef.current) {
        // Calculate physics for "Ink-like" flow
        const dist = Math.hypot(currentPos.x - lastPosRef.current.x, currentPos.y - lastPosRef.current.y);
        const time = Date.now() - lastTimeRef.current;
        const velocity = dist / (time || 1); 

        // Premium Algorithm:
        // 1. Target width depends on velocity (Fast = Thin, Slow = Thick)
        // 2. Clamp target width between ~25% and ~125% of base size for contrast
        const minW = settings.width * 0.25;
        const maxW = settings.width * 1.25;
        
        // Use a sigmoid-like curve for natural pressure feeling
        // This makes average speeds look medium, very fast look thin, very slow look thick
        const pressure = 1 / (1 + velocity * 0.5); 
        const targetWidth = minW + (maxW - minW) * pressure;

        // Smooth width transition (Inertia)
        // Use 0.6 previous + 0.4 new to smooth out mouse jitters
        const smoothedWidth = lastWidthRef.current * 0.6 + targetWidth * 0.4;
        
        ctx.beginPath();
        ctx.lineWidth = smoothedWidth;
        ctx.strokeStyle = settings.color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Quadratic Curve for smooth path
        const midPoint = {
          x: (lastPosRef.current.x + currentPos.x) / 2,
          y: (lastPosRef.current.y + currentPos.y) / 2
        };
        
        ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
        ctx.quadraticCurveTo(lastPosRef.current.x, lastPosRef.current.y, midPoint.x, midPoint.y);
        ctx.stroke();

        lastPosRef.current = midPoint; // Continue from midpoint for continuity
        lastTimeRef.current = Date.now();
        lastWidthRef.current = smoothedWidth;
      }
      return;
    }

    if (tool === 'pen' || tool === 'eraser') {
      if (lastPosRef.current) {
        const curveMidPoint = {
           x: (lastPosRef.current.x + currentPos.x) / 2,
           y: (lastPosRef.current.y + currentPos.y) / 2
        };
        ctx.quadraticCurveTo(lastPosRef.current.x, lastPosRef.current.y, curveMidPoint.x, curveMidPoint.y);
        ctx.stroke();
        lastPosRef.current = currentPos;
      }
    } else if (snapshot) {
      // --- SHAPE PREVIEWS ---
      ctx.putImageData(snapshot, 0, 0);
      ctx.beginPath();
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = settings.color;
      ctx.lineWidth = settings.width;
      ctx.setLineDash([]); 

      const w = currentPos.x - startPos.x;
      const h = currentPos.y - startPos.y;

      if (tool === 'line') {
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.stroke();
      } else if (tool === 'dashed') {
        ctx.setLineDash([settings.width * 3, settings.width * 2]);
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.stroke();
      } else if (tool === 'parabola') { // Parabol Tool
        // Draw a parabola inside the bounding box
        // Vertex at (mid_x, start_y + h) (if drawn downwards) or similar logic
        // Standard U shape: Start (x, y), Control (mid_x, y + 2h), End (x+w, y)
        // Let's implement a standard curve that fits the box from top-left to top-right with vertex at bottom-mid?
        // Or vertex at top-mid?
        // Let's assume vertex is at StartPos (top-mid of where user starts)
        
        // Simpler implementation: Fits inside the rect defined by start and current.
        // Vertex at (start.x + w/2, start.y + h)
        // Opens upwards if h is positive.
        const midX = startPos.x + w / 2;
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        // Using quadratic curve to simulate parabola
        // Control point needs to be "outside" to pull the curve to the vertex
        ctx.quadraticCurveTo(midX, startPos.y + h * 2, startPos.x + w, startPos.y);
        ctx.stroke();

      } else if (tool === 'polygon_5') { // Ngũ giác đều
         const radius = Math.min(Math.abs(w), Math.abs(h)) / 2;
         const cx = startPos.x + w / 2;
         const cy = startPos.y + h / 2;
         drawPolygon(ctx, cx, cy, radius, 5);
      } else if (tool === 'polygon_6') { // Lục giác đều
         const radius = Math.min(Math.abs(w), Math.abs(h)) / 2;
         const cx = startPos.x + w / 2;
         const cy = startPos.y + h / 2;
         drawPolygon(ctx, cx, cy, radius, 6);
      } else if (tool === 'star') { // Ngôi sao
         const radius = Math.min(Math.abs(w), Math.abs(h)) / 2;
         const cx = startPos.x + w / 2;
         const cy = startPos.y + h / 2;
         drawStar(ctx, cx, cy, radius, radius * 0.5, 5);
      } else if (tool === 'table') { // Table Grid 3x3
         // Draw Outer Rect
         ctx.strokeRect(startPos.x, startPos.y, w, h);
         
         // Vertical Lines
         const colW = w / 3;
         ctx.beginPath();
         ctx.moveTo(startPos.x + colW, startPos.y); ctx.lineTo(startPos.x + colW, startPos.y + h);
         ctx.moveTo(startPos.x + colW * 2, startPos.y); ctx.lineTo(startPos.x + colW * 2, startPos.y + h);
         ctx.stroke();
         
         // Horizontal Lines
         const rowH = h / 3;
         ctx.beginPath();
         ctx.moveTo(startPos.x, startPos.y + rowH); ctx.lineTo(startPos.x + w, startPos.y + rowH);
         ctx.moveTo(startPos.x, startPos.y + rowH * 2); ctx.lineTo(startPos.x + w, startPos.y + rowH * 2);
         ctx.stroke();
      
      } else if (tool === 'triangle_iso') { // Tam giác cân
        const cx = startPos.x + w / 2;
        ctx.moveTo(cx, startPos.y); // Top Center
        ctx.lineTo(startPos.x, startPos.y + h); // Bottom Left
        ctx.lineTo(startPos.x + w, startPos.y + h); // Bottom Right
        ctx.closePath();
        ctx.stroke();
      } else if (tool === 'plane') { // MẶT PHẲNG (HÌNH BÌNH HÀNH) - FILLED
         const slant = w * 0.2; // Độ nghiêng
         ctx.beginPath();
         ctx.moveTo(startPos.x + slant, startPos.y); // Top Left
         ctx.lineTo(startPos.x + w, startPos.y); // Top Right
         ctx.lineTo(startPos.x + w - slant, startPos.y + h); // Bottom Right
         ctx.lineTo(startPos.x, startPos.y + h); // Bottom Left
         ctx.closePath();
         
         // Fill with color (semi-transparent)
         const prevGlobalAlpha = ctx.globalAlpha;
         ctx.globalAlpha = 0.2;
         ctx.fillStyle = settings.color;
         ctx.fill();
         
         // Restore for stroke
         ctx.globalAlpha = prevGlobalAlpha;
         ctx.stroke();
      } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(w, 2) + Math.pow(h, 2));
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (tool === 'rect') {
        ctx.strokeRect(startPos.x, startPos.y, w, h);
      } else if (tool === 'ellipse') {
        ctx.ellipse(startPos.x, startPos.y, Math.abs(w), Math.abs(h), 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (tool === 'axis') {
         drawArrowHead(ctx, startPos, currentPos, settings.color);
         ctx.moveTo(startPos.x, startPos.y);
         ctx.lineTo(currentPos.x, currentPos.y);
         ctx.stroke();
      } else if (tool === 'coord_3d') {
         draw3DCoord(ctx, startPos, currentPos);
      } else if (tool === 'cube' || tool === 'cuboid') {
         ctx.strokeRect(startPos.x, startPos.y, w, h);
         
         const depthX = w * 0.5;
         const depthY = -h * 0.5;
         
         const bx = startPos.x + depthX;
         const by = startPos.y + depthY;
         
         // Hidden (Dashed)
         ctx.setLineDash([5, 5]);
         ctx.beginPath(); ctx.moveTo(startPos.x, startPos.y + h); ctx.lineTo(bx, by + h); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(bx, by + h); ctx.lineTo(bx + w, by + h); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + h); ctx.stroke();
         
         ctx.setLineDash([]);
         // Visible
         ctx.beginPath(); ctx.moveTo(startPos.x, startPos.y); ctx.lineTo(bx, by); ctx.stroke(); 
         ctx.beginPath(); ctx.moveTo(startPos.x + w, startPos.y); ctx.lineTo(bx + w, by); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(startPos.x + w, startPos.y + h); ctx.lineTo(bx + w, by + h); ctx.stroke();
         
         ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + w, by); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(bx + w, by); ctx.lineTo(bx + w, by + h); ctx.stroke();

      } else if (tool === 'cylinder') {
         const rx = Math.abs(w / 2);
         const ry = Math.abs(w / 8); 
         const cx = startPos.x + w/2;
         
         ctx.beginPath();
         ctx.ellipse(cx, startPos.y, rx, ry, 0, 0, 2 * Math.PI);
         ctx.stroke();
         
         ctx.beginPath();
         ctx.ellipse(cx, startPos.y + h, rx, ry, 0, 0, Math.PI);
         ctx.stroke();
         
         ctx.beginPath();
         ctx.setLineDash([5, 5]);
         ctx.ellipse(cx, startPos.y + h, rx, ry, 0, Math.PI, 2 * Math.PI);
         ctx.stroke();
         ctx.setLineDash([]);
         
         ctx.beginPath();
         ctx.moveTo(cx - rx, startPos.y); ctx.lineTo(cx - rx, startPos.y + h);
         ctx.moveTo(cx + rx, startPos.y); ctx.lineTo(cx + rx, startPos.y + h);
         ctx.stroke();

      } else if (tool === 'cone') {
         const rx = Math.abs(w / 2);
         const ry = Math.abs(w / 8);
         const cx = startPos.x + w/2;
         
         ctx.beginPath();
         ctx.ellipse(cx, startPos.y + h, rx, ry, 0, 0, Math.PI);
         ctx.stroke();
         
         ctx.beginPath();
         ctx.setLineDash([5, 5]);
         ctx.ellipse(cx, startPos.y + h, rx, ry, 0, Math.PI, 2 * Math.PI);
         ctx.stroke();
         ctx.setLineDash([]);
         
         ctx.beginPath();
         ctx.moveTo(cx - rx, startPos.y + h); ctx.lineTo(cx, startPos.y);
         ctx.moveTo(cx + rx, startPos.y + h); ctx.lineTo(cx, startPos.y);
         ctx.stroke();

      } else if (tool === 'pyramid_quad') { // Chóp tứ giác đều (Regular S.ABCD)
         // OLD LOGIC RESTORED + CORRECTED: 
         // A (Back Left - HIDDEN). B (Front Left). C (Front Right). D (Back Right).
         // Dashed: SA (hidden edge), AB (left back edge), AD (back edge).
         
         const perspective = w * 0.3; 
         const baseH = h * 0.25; 
         
         const A = { x: startPos.x + perspective, y: startPos.y + h - baseH }; // Back Left (Hidden)
         const B = { x: startPos.x, y: startPos.y + h }; // Front Left
         const C = { x: startPos.x + w - perspective, y: startPos.y + h }; // Front Right
         const D = { x: startPos.x + w, y: startPos.y + h - baseH }; // Back Right

         const O = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
         const S = { x: O.x, y: startPos.y };

         // Dashed Lines: Hidden edges from A
         ctx.beginPath();
         ctx.setLineDash([5, 5]);
         ctx.moveTo(S.x, S.y); ctx.lineTo(A.x, A.y); // SA
         ctx.moveTo(A.x, A.y); ctx.lineTo(D.x, D.y); // AD (Back)
         ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); // AB (Left - Hidden in this perspective)
         ctx.stroke();
         
         // Solid Lines: Visible edges
         ctx.beginPath();
         ctx.setLineDash([]);
         ctx.moveTo(S.x, S.y); ctx.lineTo(B.x, B.y); // SB
         ctx.moveTo(S.x, S.y); ctx.lineTo(C.x, C.y); // SC
         ctx.moveTo(S.x, S.y); ctx.lineTo(D.x, D.y); // SD
         ctx.moveTo(B.x, B.y); ctx.lineTo(C.x, C.y); // BC
         ctx.moveTo(C.x, C.y); ctx.lineTo(D.x, D.y); // CD
         ctx.stroke();

      } else if (tool === 'pyramid_tri') { // Chóp tam giác đều (S.ABC)
         // Logic based on user image:
         // View from above/front.
         // S (Top), B (Bottom), L (Left), R (Right)
         // Dashed: LR (Back base edge)
         // Solid: SL, SR, SB, LB, RB
         
         const S = { x: startPos.x + w / 2, y: startPos.y };
         // The waist (LR line) seems to be around 65% down from top
         const waistY = startPos.y + h * 0.65;
         
         const L = { x: startPos.x, y: waistY };
         const R = { x: startPos.x + w, y: waistY };
         const B = { x: startPos.x + w / 2, y: startPos.y + h };

         // Dashed Line (Base Back Edge)
         ctx.beginPath();
         ctx.setLineDash([5, 5]);
         ctx.moveTo(L.x, L.y);
         ctx.lineTo(R.x, R.y);
         ctx.stroke();

         // Solid Lines
         ctx.beginPath();
         ctx.setLineDash([]);
         // Edges from Apex
         ctx.moveTo(S.x, S.y); ctx.lineTo(L.x, L.y);
         ctx.moveTo(S.x, S.y); ctx.lineTo(R.x, R.y);
         ctx.moveTo(S.x, S.y); ctx.lineTo(B.x, B.y);
         // Base Front Edges
         ctx.moveTo(L.x, L.y); ctx.lineTo(B.x, B.y);
         ctx.moveTo(R.x, R.y); ctx.lineTo(B.x, B.y);
         ctx.stroke();

      } else if (tool === 'pyramid_tri_right') { // Chóp tam giác vuông góc (SA perp Base)
         const pS = { x: startPos.x + w * 0.3, y: startPos.y };
         const pA = { x: startPos.x + w * 0.3, y: startPos.y + h * 0.9 };
         const pB = { x: startPos.x + w * 0.6, y: startPos.y + h }; // Front
         const pC = { x: startPos.x + w, y: startPos.y + h * 0.7 }; // Right Back

         // Dashed: AC (Back Base Edge)
         ctx.beginPath();
         ctx.setLineDash([5, 5]);
         ctx.moveTo(pA.x, pA.y); ctx.lineTo(pC.x, pC.y);
         ctx.stroke();

         // Solid
         ctx.beginPath();
         ctx.setLineDash([]);
         ctx.moveTo(pS.x, pS.y); ctx.lineTo(pA.x, pA.y); // SA Vertical
         ctx.moveTo(pS.x, pS.y); ctx.lineTo(pB.x, pB.y); // SB
         ctx.moveTo(pS.x, pS.y); ctx.lineTo(pC.x, pC.y); // SC
         ctx.moveTo(pA.x, pA.y); ctx.lineTo(pB.x, pB.y); // AB
         ctx.moveTo(pB.x, pB.y); ctx.lineTo(pC.x, pC.y); // BC
         ctx.stroke();

      } else if (tool === 'pyramid_quad_right') { // Chóp tứ giác vuông góc (SA perp Base)
         // CLASSIC VIEW: A is Back-Left (Hidden). SA is dashed vertical.
         
         const A = { x: startPos.x + w * 0.2, y: startPos.y + h * 0.8 }; // Back Left (Hidden)
         const S = { x: A.x, y: startPos.y }; // Top (Above A)
         const B = { x: startPos.x, y: startPos.y + h }; // Front Left
         const C = { x: startPos.x + w * 0.8, y: startPos.y + h }; // Front Right
         const D = { x: startPos.x + w, y: startPos.y + h * 0.8 }; // Back Right

         // Dashed Lines: Hidden edges connected to A
         ctx.beginPath();
         ctx.setLineDash([5, 5]);
         ctx.moveTo(S.x, S.y); ctx.lineTo(A.x, A.y); // SA (Height)
         ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); // AB
         ctx.moveTo(A.x, A.y); ctx.lineTo(D.x, D.y); // AD
         ctx.stroke();
         
         // Solid Lines: Visible
         ctx.beginPath();
         ctx.setLineDash([]);
         ctx.moveTo(S.x, S.y); ctx.lineTo(B.x, B.y); // SB
         ctx.moveTo(S.x, S.y); ctx.lineTo(C.x, C.y); // SC
         ctx.moveTo(S.x, S.y); ctx.lineTo(D.x, D.y); // SD
         ctx.moveTo(B.x, B.y); ctx.lineTo(C.x, C.y); // BC
         ctx.moveTo(C.x, C.y); ctx.lineTo(D.x, D.y); // CD
         ctx.stroke();

      } else if (tool === 'prism_tri') { // Lăng trụ tam giác
         // REPLACED: Right Triangular Prism (Lăng trụ đứng) based on reference image
         // Top Face: C (Left), B (Right), A (Front/Center)
         // Bottom Face: C', B', A'
         // Dashed: C'B' (Back bottom edge)
         
         const topBackLeft = { x: startPos.x, y: startPos.y }; // C
         const topBackRight = { x: startPos.x + w, y: startPos.y + h * 0.05 }; // B (slight tilt)
         const topFront = { x: startPos.x + w * 0.35, y: startPos.y + h * 0.3 }; // A
         
         const height = h * 0.7; // Vertical height
         
         const botBackLeft = { x: topBackLeft.x, y: topBackLeft.y + height }; // C'
         const botBackRight = { x: topBackRight.x, y: topBackRight.y + height }; // B'
         const botFront = { x: topFront.x, y: topFront.y + height }; // A'
         
         // Dashed: Bottom Back Edge (C'B')
         ctx.beginPath();
         ctx.setLineDash([5, 5]);
         ctx.moveTo(botBackLeft.x, botBackLeft.y); ctx.lineTo(botBackRight.x, botBackRight.y);
         ctx.stroke();

         // Solid Lines
         ctx.beginPath();
         ctx.setLineDash([]);

         // Top Face (ABC) - Visible
         ctx.moveTo(topBackLeft.x, topBackLeft.y); ctx.lineTo(topBackRight.x, topBackRight.y);
         ctx.lineTo(topFront.x, topFront.y); ctx.lineTo(topBackLeft.x, topBackLeft.y);
         
         // Vertical Edges (CC', BB', AA') - Visible
         ctx.moveTo(topBackLeft.x, topBackLeft.y); ctx.lineTo(botBackLeft.x, botBackLeft.y);
         ctx.moveTo(topBackRight.x, topBackRight.y); ctx.lineTo(botBackRight.x, botBackRight.y);
         ctx.moveTo(topFront.x, topFront.y); ctx.lineTo(botFront.x, botFront.y);
         
         // Bottom Front Edges (A'C', A'B') - Visible
         ctx.moveTo(botBackLeft.x, botBackLeft.y); ctx.lineTo(botFront.x, botFront.y);
         ctx.lineTo(botBackRight.x, botBackRight.y);

         ctx.stroke();
      }
    }
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (isDrawing) {
      const ctx = canvasRef.current?.getContext('2d');
      
      // Finish stroke for pen/eraser
      if ((tool === 'pen' || tool === 'eraser') && ctx && lastPosRef.current) {
         ctx.lineTo(lastPosRef.current.x, lastPosRef.current.y);
         ctx.stroke();
         ctx.shadowBlur = 0; 
      }
      
      // Finish Calligraphy stroke
      if (tool === 'calligraphy' && ctx && lastPosRef.current) {
        const pos = getMousePos(e);
        ctx.quadraticCurveTo(lastPosRef.current.x, lastPosRef.current.y, pos.x, pos.y);
        ctx.stroke();
      }

      setIsDrawing(false);
      setSnapshot(null);
      lastPosRef.current = null;
    }
  };

  const handleTextComplete = (e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
      const text = (e.target as HTMLInputElement).value;
      setTypingPos(null);
      if (!text.trim() || !typingPos) return;
      
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
          const currentData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
          setHistory(prev => [...prev.slice(-19), currentData]);
          
          ctx.font = `bold ${settings.fontSize}px sans-serif`;
          ctx.fillStyle = settings.color;
          ctx.textBaseline = 'top';
          ctx.globalCompositeOperation = 'source-over';
          ctx.shadowBlur = 0;
          ctx.fillText(text, typingPos.x, typingPos.y);
      }
  };

  // Screen Sharing Logic
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          onScreenShareReady(true);
        };
      }

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error("Error sharing screen:", err);
      onScreenShareReady(false);
    }
  };

  const stopScreenShare = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      onScreenShareReady(false);
    }
  }, [onScreenShareReady]);

  useEffect(() => {
    const handleShareToggle = () => {
      if (videoRef.current?.srcObject) {
        stopScreenShare();
      } else {
        startScreenShare();
      }
    };
    
    window.addEventListener('TOGGLE_SCREEN_SHARE', handleShareToggle);
    return () => window.removeEventListener('TOGGLE_SCREEN_SHARE', handleShareToggle);
  }, [stopScreenShare]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none transition-colors duration-300" style={{ backgroundColor: boardColor }}>
      {/* Background Video (Screen Share) - Z-index 0 */}
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
        style={{ zIndex: 0 }}
      />
      
      {/* Background Image - Z-index 5 */}
      {backgroundImage && (
        <img 
          src={backgroundImage} 
          alt="Board Background" 
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          style={{ zIndex: 5 }}
        />
      )}

      {/* Grid Overlay - Z-index 8 */}
      {showGrid && (
        <div 
          className="absolute inset-0 pointer-events-none w-full h-full opacity-30"
          style={{ 
            zIndex: 8,
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
      )}

      {/* Drawing Canvas - Z-index 10 */}
      <canvas
        ref={canvasRef}
        className={`absolute top-0 left-0 w-full h-full touch-none ${pastedImage ? 'cursor-default' : tool === 'text' ? 'cursor-text' : 'cursor-pen'}`}
        style={{ zIndex: 10 }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />

      {/* Text Input Overlay */}
      {typingPos && (
        <input
          ref={inputRef}
          className="absolute bg-white/10 border border-white/30 rounded px-2 py-1 outline-none shadow-lg select-text backdrop-blur-sm"
          style={{
            left: typingPos.x,
            top: typingPos.y,
            color: settings.color,
            font: `bold ${settings.fontSize}px sans-serif`,
            zIndex: 20,
            lineHeight: 1,
            minWidth: '200px', 
            pointerEvents: 'auto'
          }}
          placeholder="Nhập văn bản..."
          onBlur={handleTextComplete}
          onKeyDown={(e) => {
             if(e.key === 'Enter') e.currentTarget.blur();
          }}
        />
      )}

      {/* Floating Pasted Image Overlay - Z-index 30 */}
      {pastedImage && (
        <div 
          className="absolute group border-2 border-blue-500 border-dashed"
          style={{
            left: pastedImage.x,
            top: pastedImage.y,
            width: pastedImage.width,
            height: pastedImage.height,
            zIndex: 30,
            cursor: 'move'
          }}
          onMouseDown={(e) => {
             e.preventDefault();
             setInteraction({
                mode: 'move',
                startX: e.clientX,
                startY: e.clientY,
                initialX: pastedImage.x,
                initialY: pastedImage.y
             });
          }}
          onTouchStart={(e) => {
            setInteraction({
               mode: 'move',
               startX: e.touches[0].clientX,
               startY: e.touches[0].clientY,
               initialX: pastedImage.x,
               initialY: pastedImage.y
            });
         }}
        >
           <img 
              src={pastedImage.element.src} 
              className="w-full h-full object-contain pointer-events-none"
              alt="Pasted"
           />

           <div className="absolute -top-12 left-0 flex gap-2 bg-black/60 backdrop-blur rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={confirmPaste} className="p-1 hover:bg-green-600 rounded text-white" title="Chốt ảnh (Vẽ lên bảng)">
                <Check size={20} />
              </button>
              <button onClick={cancelPaste} className="p-1 hover:bg-red-600 rounded text-white" title="Hủy bỏ">
                <X size={20} />
              </button>
           </div>

           <div 
              className="absolute -bottom-3 -right-3 bg-blue-600 rounded-full p-1.5 cursor-nwse-resize shadow-lg hover:scale-125 transition-transform"
              onMouseDown={(e) => {
                e.stopPropagation();
                setInteraction({
                   mode: 'resize',
                   startX: e.clientX,
                   startY: e.clientY,
                   initialX: pastedImage.width,
                   initialY: pastedImage.height
                });
             }}
             onTouchStart={(e) => {
              e.stopPropagation();
              setInteraction({
                 mode: 'resize',
                 startX: e.touches[0].clientX,
                 startY: e.touches[0].clientY,
                 initialX: pastedImage.width,
                 initialY: pastedImage.height
              });
           }}
           >
              <Maximize2 size={12} className="text-white" />
           </div>
        </div>
      )}
    </div>
  );
};

export default Board;