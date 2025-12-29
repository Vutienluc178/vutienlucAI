import React, { useState } from 'react';
import { 
  Pencil, 
  Feather,
  Minus, 
  Circle, 
  Square, 
  Triangle,
  Eraser, 
  Trash2, 
  MonitorUp, 
  VideoOff,
  Undo2,
  Move,
  Dices,
  Maximize,
  Minimize,
  Image as ImageIcon,
  Type,
  Grid3X3,
  Box,
  Cylinder,
  Cone,
  Pyramid,
  Cuboid,
  CircleHelp,
  Globe,
  Pentagon,
  Hexagon,
  Star,
  Spline,
  Table as TableIcon
} from 'lucide-react';
import { ToolType, DrawingSettings } from '../types';

interface ToolbarProps {
  currentTool: ToolType;
  setTool: (tool: ToolType) => void;
  settings: DrawingSettings;
  setSettings: React.Dispatch<React.SetStateAction<DrawingSettings>>;
  onClear: () => void;
  onUndo: () => void;
  onScreenShare: () => void;
  isScreenSharing: boolean;
  onRandomPick: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  onTriggerImageUpload: () => void;
  onTriggerWebInsert: () => void;
  boardColor: string;
  setBoardColor: (color: string) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  onShowHelp: () => void;
}

const COLORS = ['#FFFFFF', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#000000'];
const BOARD_COLORS = [
  { color: '#0f172a', title: 'Mặc định' },
  { color: '#ffffff', title: 'Trắng' },
  { color: '#14532d', title: 'Xanh' },
  { color: '#000000', title: 'Đen' },
];

const IconPyramidRegular = () => (
  // Representing "Square" base pyramid (Top/Iso View)
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 3l18 18" />
    <path d="M21 3L3 21" />
  </svg>
);

const IconPyramidRight = () => (
  // Representing "Parallelogram" base pyramid
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 18l4-12h12l-4 12H4z" />
    <path d="M8 6l8 12" />
    <path d="M20 6L4 18" />
  </svg>
);

const IconPlane = () => (
  // Filled Parallelogram Icon
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
     <path d="M2 19l4-14h16l-4 14H2z" fillOpacity="0.5" />
  </svg>
);

const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  setTool,
  settings,
  setSettings,
  onClear,
  onUndo,
  onScreenShare,
  isScreenSharing,
  onRandomPick,
  onToggleFullscreen,
  isFullscreen,
  onTriggerImageUpload,
  onTriggerWebInsert,
  boardColor,
  setBoardColor,
  showGrid,
  setShowGrid,
  onShowHelp
}) => {
  const [show3DMenu, setShow3DMenu] = useState(false);

  const handleColorChange = (color: string) => {
    setSettings(prev => ({ ...prev, color }));
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, width: parseInt(e.target.value) }));
  };

  const handleFontSizeChange = (size: number) => {
    setSettings(prev => ({ ...prev, fontSize: size }));
  };

  const is3DToolActive = [
    'coord_3d', 'cube', 'cuboid', 'pyramid_tri', 'pyramid_tri_right', 'pyramid_quad', 'pyramid_quad_right', 'prism_tri', 'cylinder', 'cone'
  ].includes(currentTool);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50 max-w-[95%] md:max-w-[98%] w-max transition-all">
      
      {/* 3D Menu Popover */}
      {show3DMenu && (
        <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-2 shadow-xl flex gap-1 animate-[fadeIn_0.2s_ease-out] mb-2 overflow-x-auto no-scrollbar max-w-[95%]">
           <ToolButton active={currentTool === 'coord_3d'} onClick={() => setTool('coord_3d')} icon={<Move className="text-red-400" size={20} />} title="Hệ trục Oxyz" />
           <div className="w-px h-6 bg-white/20 mx-1"></div>
           <ToolButton active={currentTool === 'cube'} onClick={() => setTool('cube')} icon={<Box size={20} />} title="Hình lập phương" />
           <ToolButton active={currentTool === 'cuboid'} onClick={() => setTool('cuboid')} icon={<Cuboid size={20} />} title="Hình hộp CN" />
           <ToolButton active={currentTool === 'prism_tri'} onClick={() => setTool('prism_tri')} icon={<Triangle className="rotate-90" size={20} />} title="Lăng trụ tam giác" />
           <div className="w-px h-6 bg-white/20 mx-1"></div>
           <ToolButton active={currentTool === 'pyramid_tri'} onClick={() => setTool('pyramid_tri')} icon={<Pyramid size={20} />} title="Chóp tam giác đều" />
           <ToolButton active={currentTool === 'pyramid_tri_right'} onClick={() => setTool('pyramid_tri_right')} icon={<Triangle className="stroke-[3]" size={20} />} title="Chóp tam giác (SA ⊥ đáy)" />
           
           {/* UPDATED ICONS */}
           <ToolButton active={currentTool === 'pyramid_quad'} onClick={() => setTool('pyramid_quad')} icon={<IconPyramidRegular />} title="Chóp tứ giác đều (Hình vuông)" />
           <ToolButton active={currentTool === 'pyramid_quad_right'} onClick={() => setTool('pyramid_quad_right')} icon={<IconPyramidRight />} title="Chóp tứ giác (Hình bình hành)" />
           
           <div className="w-px h-6 bg-white/20 mx-1"></div>
           <ToolButton active={currentTool === 'cylinder'} onClick={() => setTool('cylinder')} icon={<Cylinder size={20} />} title="Hình trụ" />
           <ToolButton active={currentTool === 'cone'} onClick={() => setTool('cone')} icon={<Cone size={20} />} title="Hình nón" />
        </div>
      )}

      {/* Main Toolbar */}
      <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-full px-2 py-1.5 shadow-2xl flex flex-row items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full">
        
        {/* Pens */}
        <div className="flex items-center gap-0.5 shrink-0">
           <ToolButton active={currentTool === 'pen'} onClick={() => setTool('pen')} icon={<Pencil size={18} />} title="Bút thường" />
           <ToolButton active={currentTool === 'calligraphy'} onClick={() => setTool('calligraphy')} icon={<Feather size={18} />} title="Bút cọ" />
           <ToolButton active={currentTool === 'text'} onClick={() => setTool('text')} icon={<Type size={18} />} title="Văn bản" />
           <ToolButton active={currentTool === 'eraser'} onClick={() => setTool('eraser')} icon={<Eraser size={18} />} title="Tẩy" />
        </div>

        <div className="w-px h-6 bg-white/20 shrink-0"></div>

        {/* 2D Shapes & Smart Tools */}
        <div className="flex items-center gap-0.5 shrink-0">
          <ToolButton active={showGrid} onClick={() => setShowGrid(!showGrid)} icon={<Grid3X3 size={18} />} title="Lưới" />
          <ToolButton active={currentTool === 'line'} onClick={() => setTool('line')} icon={<Minus size={18} />} title="Đường thẳng" />
          <ToolButton active={currentTool === 'dashed'} onClick={() => setTool('dashed')} icon={<Minus className="stroke-dashed" strokeDasharray="4 4" size={18} />} title="Nét đứt" />
          
          {/* Smart Shapes Group */}
          <ToolButton active={currentTool === 'parabola'} onClick={() => setTool('parabola')} icon={<Spline size={18} />} title="Parabol" />
          <ToolButton active={currentTool === 'triangle_iso'} onClick={() => setTool('triangle_iso')} icon={<Triangle size={18} />} title="Tam giác cân" />
          <ToolButton active={currentTool === 'rect'} onClick={() => setTool('rect')} icon={<Square size={18} />} title="H.Vuông" />
          <ToolButton active={currentTool === 'circle'} onClick={() => setTool('circle')} icon={<Circle size={18} />} title="H.Tròn" />
          <ToolButton active={currentTool === 'ellipse'} onClick={() => setTool('ellipse')} icon={<Circle size={18} className="scale-x-125" />} title="Elip" />
          
          {/* Advanced Geometry */}
          <ToolButton active={currentTool === 'polygon_5'} onClick={() => setTool('polygon_5')} icon={<Pentagon size={18} />} title="Ngũ giác đều" />
          <ToolButton active={currentTool === 'polygon_6'} onClick={() => setTool('polygon_6')} icon={<Hexagon size={18} />} title="Lục giác đều" />
          <ToolButton active={currentTool === 'star'} onClick={() => setTool('star')} icon={<Star size={18} />} title="Ngôi sao" />
          <ToolButton active={currentTool === 'plane'} onClick={() => setTool('plane')} icon={<IconPlane />} title="Mặt phẳng (P)" />
          <ToolButton active={currentTool === 'table'} onClick={() => setTool('table')} icon={<TableIcon size={18} />} title="Kẻ Bảng" />
          
          <ToolButton active={currentTool === 'axis'} onClick={() => setTool('axis')} icon={<Move size={18} />} title="Trục số" />
        </div>

        <div className="w-px h-6 bg-white/20 shrink-0"></div>

        {/* 3D Trigger */}
        <div className="shrink-0">
          <ToolButton active={is3DToolActive || show3DMenu} onClick={() => setShow3DMenu(!show3DMenu)} icon={<Box size={18} className="text-yellow-400" />} title="Hình 3D" />
        </div>

        <div className="w-px h-6 bg-white/20 shrink-0"></div>

        {/* Color & Size */}
        <div className="flex items-center gap-2 px-1 shrink-0">
           <div className="flex -space-x-1 hover:space-x-0.5 transition-all">
             {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => handleColorChange(c)}
                  className={`w-4 h-4 rounded-full border border-white/20 ${settings.color === c ? 'ring-2 ring-white z-10 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
           </div>
           
           {currentTool === 'text' ? (
             <div className="flex bg-white/10 rounded-lg p-0.5 gap-0.5">
               {[32, 64, 96].map((s, i) => (
                  <button key={s} onClick={() => handleFontSizeChange(s)} className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${settings.fontSize === s ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>{i+1}x</button>
               ))}
             </div>
           ) : (
             <input type="range" min="1" max="20" value={settings.width} onChange={handleWidthChange} className="w-12 h-1 bg-gray-600 rounded-lg accent-blue-500" title={`Độ dày: ${settings.width}px`}/>
           )}

           <div className="flex gap-0.5 ml-1">
              {BOARD_COLORS.map(b => (
                <button key={b.color} onClick={() => setBoardColor(b.color)} className={`w-3 h-3 rounded-full border border-gray-500 ${boardColor === b.color ? 'ring-2 ring-white' : ''}`} style={{ backgroundColor: b.color }} title={b.title}/>
              ))}
           </div>
        </div>

        <div className="w-px h-6 bg-white/20 shrink-0"></div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <ActionButton onClick={onUndo} icon={<Undo2 size={18} />} title="Hoàn tác" />
          <ActionButton onClick={onClear} icon={<Trash2 size={18} />} title="Xóa hết" variant="danger" />
          <ActionButton onClick={onTriggerImageUpload} icon={<ImageIcon size={18} />} title="Ảnh" variant="purple" />
          <ActionButton onClick={onTriggerWebInsert} icon={<Globe size={18} />} title="Web" variant="purple" />
          <ActionButton onClick={onRandomPick} icon={<Dices size={18} />} title="Quay số" variant="purple" />
          <ActionButton onClick={onScreenShare} active={isScreenSharing} icon={isScreenSharing ? <VideoOff size={18} /> : <MonitorUp size={18} />} title="Chia sẻ" variant="blue" />
          <ActionButton onClick={onToggleFullscreen} icon={isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />} title="Full" />
          <ActionButton onClick={onShowHelp} icon={<CircleHelp size={18} />} title="Help" />
        </div>
      </div>
    </div>
  );
};

const ToolButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; title: string }> = ({ active, onClick, icon, title }) => (
  <div className="relative group shrink-0">
    <button onClick={onClick} className={`p-1.5 rounded-full transition-all flex items-center justify-center ${active ? 'bg-blue-600 text-white shadow shadow-blue-500/50 scale-110' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>
      {icon}
    </button>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10 z-[60]">{title}</div>
  </div>
);

const ActionButton: React.FC<{ onClick: () => void; icon: React.ReactNode; title: string; active?: boolean; variant?: 'default' | 'danger' | 'blue' | 'purple'; loading?: boolean }> = ({ 
  onClick, icon, title, active, variant = 'default', loading 
}) => {
  let variantClass = "text-gray-400 hover:bg-white/10 hover:text-white";
  if (variant === 'danger') variantClass = "text-red-400 hover:bg-red-500/20 hover:text-red-200";
  if (variant === 'blue' || active) variantClass = "bg-blue-600/80 text-white hover:bg-blue-500";
  if (variant === 'purple') variantClass = "bg-purple-600/80 text-white hover:bg-purple-500";

  return (
    <div className="relative group shrink-0">
      <button onClick={onClick} className={`p-1.5 rounded-full transition-all ${variantClass}`} disabled={loading}>
        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : icon}
      </button>
       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10 z-[60]">{title}</div>
    </div>
  );
};

export default Toolbar;