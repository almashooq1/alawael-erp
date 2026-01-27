import React, { useRef, useState } from 'react';

export default function SignaturePad({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  function start(e: React.MouseEvent) {
    setDrawing(true);
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  }
  function move(e: React.MouseEvent) {
    if (!drawing) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  }
  function stop() { setDrawing(false); }
  function clear() {
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.clearRect(0,0,300,100);
  }
  function save() {
    if (canvasRef.current) onSave(canvasRef.current.toDataURL('image/png'));
  }
  return <div style={{textAlign:'center'}}>
    <canvas ref={canvasRef} width={300} height={100} style={{border:'1px solid #888',background:'#fff'}}
      onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop} />
    <div style={{marginTop:8}}>
      <button onClick={clear}>مسح</button>
      <button onClick={save}>حفظ التوقيع</button>
    </div>
  </div>;
}
