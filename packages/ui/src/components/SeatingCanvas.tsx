import * as React from "react";

export interface Table {
  id: string;
  name: string;
  capacity: number;
  x: number;
  y: number;
}

export interface Seat {
  id: string;
  number: number;
  guestName?: string;
}

export function SeatingCanvas({ tables, onTableMove, onSeatClick }: { tables: Array<Table & { seats: Seat[] }>; onTableMove?: (tableId: string, x: number, y: number) => void; onSeatClick?: (seatId: string) => void }) {
  const [dragging, setDragging] = React.useState<{ tableId: string; offsetX: number; offsetY: number } | null>(null);

  const handleMouseDown = (tableId: string, e: React.MouseEvent) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;
    setDragging({ tableId, offsetX: e.clientX - table.x, offsetY: e.clientY - table.y });
  };

  React.useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      onTableMove?.(dragging.tableId, e.clientX - dragging.offsetX, e.clientY - dragging.offsetY);
    };
    const handleMouseUp = () => setDragging(null);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, onTableMove]);

  return (
    <div className="relative border rounded p-8" style={{ minHeight: "500px", width: "100%" }}>
      {tables.map((table) => (
        <div
          key={table.id}
          className="absolute border-2 rounded-lg bg-white p-2 cursor-move"
          style={{ left: `${table.x}px`, top: `${table.y}px`, width: "120px" }}
          onMouseDown={(e) => handleMouseDown(table.id, e)}
        >
          <div className="font-medium text-sm mb-1">{table.name}</div>
          <div className="text-xs text-slate-600">Capacity: {table.capacity}</div>
          <div className="mt-2 space-y-1">
            {table.seats.map((seat) => (
              <div
                key={seat.id}
                className={`text-xs px-2 py-1 rounded cursor-pointer ${seat.guestName ? "bg-green-100" : "bg-slate-100"}`}
                onClick={() => onSeatClick?.(seat.id)}
              >
                Seat {seat.number}: {seat.guestName || "Empty"}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
