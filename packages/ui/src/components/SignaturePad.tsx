"use client";

import * as React from "react";

export function SignaturePad({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = React.useState(false);

  function handleMouseDown() {
    setDrawing(true);
  }

  function handleMouseUp() {
    setDrawing(false);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  }

  function handleSave() {
    if (!canvasRef.current) return;
    onSave(canvasRef.current.toDataURL());
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        className="border border-slate-300 rounded-lg cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      />
      <button onClick={handleSave} className="text-sm text-indigo-600">Save Signature</button>
    </div>
  );
}

