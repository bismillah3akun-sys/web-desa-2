import { useEffect, useMemo, useRef, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";

const OUTPUT_WIDTH = 850;
const OUTPUT_HEIGHT = 920;

export default function ImageCropper({ file, onCancel, onApply }) {
  const imageUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const [image, setImage] = useState(null);
  const previewRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [positionX, setPositionX] = useState(50);
  const [positionY, setPositionY] = useState(50);

  useEffect(() => () => URL.revokeObjectURL(imageUrl), [imageUrl]);

  useEffect(() => {
    const loadedImage = new Image();
    loadedImage.onload = () => setImage(loadedImage);
    loadedImage.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !image) return;
    drawCrop(canvas.getContext("2d"), canvas.width, canvas.height, image, zoom, positionX, positionY);
  }, [image, zoom, positionX, positionY]);

  function applyCrop() {
    if (!image) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    drawCrop(canvas.getContext("2d"), OUTPUT_WIDTH, OUTPUT_HEIGHT, image, zoom, positionX, positionY);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const baseName = file.name.replace(/\.[^.]+$/, "") || "foto";
      onApply(new File([blob], `${baseName}-crop.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }

  function reset() {
    setZoom(1);
    setPositionX(50);
    setPositionY(50);
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-forest-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="crop-title">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-sage-100 px-6 py-5">
          <div>
            <h2 id="crop-title" className="text-xl font-bold text-forest-950">Atur posisi foto</h2>
            <p className="mt-1 text-sm text-stone-500">Geser posisi dan zoom sampai foto terlihat pas di kartu.</p>
          </div>
          <button type="button" onClick={onCancel} className="grid h-10 w-10 place-items-center rounded-full bg-sage-50 text-forest-900" aria-label="Tutup"><X size={19}/></button>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="mx-auto aspect-[170/184] w-full max-w-[340px] overflow-hidden rounded-2xl border-2 border-forest-700 bg-sage-100 shadow-lg">
            <canvas ref={previewRef} width={OUTPUT_WIDTH} height={OUTPUT_HEIGHT} className="h-full w-full" aria-label="Pratinjau crop foto"/>
          </div>

          <div className="space-y-5">
            <CropControl label="Zoom" value={zoom} min={1} max={3} step={0.01} onChange={setZoom} valueLabel={`${Math.round(zoom * 100)}%`}/>
            <CropControl label="Posisi mendatar" value={positionX} min={0} max={100} step={1} onChange={setPositionX} valueLabel={`${positionX}%`}/>
            <CropControl label="Posisi vertikal" value={positionY} min={0} max={100} step={1} onChange={setPositionY} valueLabel={`${positionY}%`}/>
            <button type="button" onClick={reset} className="flex w-full items-center justify-center gap-2 rounded-xl border border-sage-200 px-4 py-3 text-sm font-bold text-forest-900"><RotateCcw size={16}/> Atur ulang</button>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-sage-100 bg-sage-50/60 px-6 py-4">
          <button type="button" onClick={onCancel} className="rounded-xl border border-sage-200 bg-white px-5 py-3 text-sm font-bold text-forest-900">Batal</button>
          <button type="button" onClick={applyCrop} disabled={!image} className="flex items-center gap-2 rounded-xl bg-forest-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><Check size={17}/> Gunakan foto</button>
        </div>
      </div>
    </div>
  );
}

function drawCrop(context, width, height, image, zoom, positionX, positionY) {
  const baseScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const scale = baseScale * zoom;
  const drawnWidth = image.naturalWidth * scale;
  const drawnHeight = image.naturalHeight * scale;
  const drawX = -((drawnWidth - width) * positionX) / 100;
  const drawY = -((drawnHeight - height) * positionY) / 100;
  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, drawX, drawY, drawnWidth, drawnHeight);
}

function CropControl({ label, value, min, max, step, onChange, valueLabel }) {
  return <label className="block">
    <span className="flex justify-between gap-4 text-sm font-semibold text-forest-950"><span>{label}</span><span className="text-stone-500">{valueLabel}</span></span>
    <input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 w-full accent-forest-800"/>
  </label>;
}
