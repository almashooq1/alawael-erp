"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SignaturePad;
const react_1 = __importStar(require("react"));
function SignaturePad({ onSave }) {
    const canvasRef = (0, react_1.useRef)(null);
    const [drawing, setDrawing] = (0, react_1.useState)(false);
    function start(e) {
        setDrawing(true);
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    }
    function move(e) {
        if (!drawing)
            return;
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();
    }
    function stop() { setDrawing(false); }
    function clear() {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, 300, 100);
    }
    function save() {
        if (canvasRef.current)
            onSave(canvasRef.current.toDataURL('image/png'));
    }
    return <div style={{ textAlign: 'center' }}>
    <canvas ref={canvasRef} width={300} height={100} style={{ border: '1px solid #888', background: '#fff' }} onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}/>
    <div style={{ marginTop: 8 }}>
      <button onClick={clear}>مسح</button>
      <button onClick={save}>حفظ التوقيع</button>
    </div>
  </div>;
}
