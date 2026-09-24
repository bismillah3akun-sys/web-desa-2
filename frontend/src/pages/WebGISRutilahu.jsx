import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  GeoJSON,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  ArrowLeft,
  Building,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  Home,
  Layers,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  X,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const KEBON_LEGA_CENTER = [-6.9465, 107.5982];
const handlingLabel = (value) => ({
  belum_ditangani: "Belum ditangani",
  dalam_pengusulan: "Dalam pengusulan",
  dalam_penanganan_program_bantuan: "Dalam penanganan program bantuan",
  ditangani_swadaya_mandiri: "Ditangani swadaya mandiri",
  selesai_ditangani: "Selesai ditangani",
})[value] || String(value || "-").replaceAll("_", " ");

// High-Resolution 3D Satelit & Basemap Providers
const BASEMAP_LAYERS = {
  google_hybrid: {
    id: "google_hybrid",
    name: "Google Satelit 3D (Hybrid)",
    desc: "Foto udara satelit resolusi tinggi + nama jalan & atap 3D",
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    attribution: '&copy; Google Maps Satellite',
    maxZoom: 21,
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
  },
  esri_clarity: {
    id: "esri_clarity",
    name: "Esri World Imagery HD",
    desc: "Citra ortofoto udara ultra-tajam tanpa kompresi",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 20,
  },
  google_satellite: {
    id: "google_satellite",
    name: "Google Satelit Murni",
    desc: "Foto satelit 3D murni tanpa teks/label",
    url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    attribution: '&copy; Google Maps',
    maxZoom: 21,
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
  },
  google_streets: {
    id: "google_streets",
    name: "Google Maps Jalan HD",
    desc: "Peta jalan vektor standar Google Maps yang bersih",
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    attribution: '&copy; Google Maps',
    maxZoom: 21,
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
  },
  carto_voyager: {
    id: "carto_voyager",
    name: "CartoDB Voyager HD",
    desc: "Peta jalan kontras tinggi dan mudah dibaca",
    url: "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; CartoDB, &copy; OpenStreetMap contributors',
    maxZoom: 20,
  },
};

// Batas referensi wilayah Kelurahan KebonLega
const KEBON_LEGA_BOUNDARY = {
  type: "Feature",
  properties: {
    name: "Kelurahan KebonLega",
    district: "Bojongloa Kidul",
    city: "Kota Bandung",
  },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [107.5905, -6.9385],
        [107.6045, -6.9392],
        [107.6062, -6.9455],
        [107.6051, -6.9535],
        [107.5975, -6.9555],
        [107.5898, -6.9525],
        [107.5885, -6.9465],
        [107.5905, -6.9385],
      ],
    ],
  },
};

// 3D Styled Marker Pin for Real Satellite View
const createHouseIcon = (house, isSelected) => {
  let color = "#64748b"; // slate
  let pulse = false;

  if (house.verification_status === "ditolak") {
    color = "#be123c"; // rose
  } else if (house.handling_status === "selesai_ditangani") {
    color = "#16a34a"; // emerald
  } else if (house.handling_status === "dalam_penanganan_program_bantuan") {
    color = "#ea580c"; // orange
  } else if (house.roof_condition === "rusak_berat" || house.wall_condition === "rusak_berat") {
    color = "#e11d48"; // red urgent
    pulse = true;
  } else if (house.verification_status === "terverifikasi") {
    color = "#2563eb"; // blue
  }

  const size = isSelected ? 40 : 34;

  const html = `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
      ${
        pulse || isSelected
          ? `<span style="position:absolute;top:0;left:50%;transform:translate(-50%, 0);width:${size + 8}px;height:${size + 8}px;border-radius:50%;background-color:${color};opacity:0.45;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>`
          : ""
      }
      <div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 14px rgba(0,0,0,0.55);border:${isSelected ? "3.5px solid #facc15" : "2.5px solid #ffffff"};z-index:2;">
        <div style="transform:rotate(45deg);color:white;display:flex;align-items:center;justify-content:center;">
          <svg width="${isSelected ? "18" : "15"}" height="${isSelected ? "18" : "15"}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
      </div>
      <div style="width:${size / 3}px;height:4px;border-radius:50%;background:rgba(0,0,0,0.5);margin-top:2px;filter:blur(1px);"></div>
    </div>
  `;

  return L.divIcon({
    className: "rutilahu-3d-pin",
    html,
    iconSize: [size + 4, size + 8],
    iconAnchor: [(size + 4) / 2, size + 4],
    popupAnchor: [0, -(size + 4)],
  });
};

const CONDITION_LABELS = {
  baik: "Baik",
  rusak_ringan: "Rusak Ringan",
  rusak_sedang: "Rusak Sedang",
  rusak_berat: "Rusak Berat",
};

const CONDITION_COLORS = {
  baik: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rusak_ringan: "bg-amber-50 text-amber-700 border-amber-200",
  rusak_sedang: "bg-orange-50 text-orange-700 border-orange-200",
  rusak_berat: "bg-red-50 text-red-700 border-red-200",
};

function MapController({ center, zoom, selectedHouse }) {
  const map = useMap();

  useEffect(() => {
    if (selectedHouse?.latitude != null && selectedHouse?.longitude != null) {
      map.flyTo([Number(selectedHouse.latitude), Number(selectedHouse.longitude)], 19, {
        duration: 1.2,
      });
    }
  }, [selectedHouse, map]);

  return (
    <div className="absolute right-4 top-4 z-[400] flex flex-col gap-2">
      <button
        onClick={() => map.setView(center || KEBON_LEGA_CENTER, zoom || 15)}
        className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white/95 px-3.5 py-2 text-xs font-bold text-forest-950 shadow-md backdrop-blur-sm hover:bg-white transition"
        title="Kembalikan tampilan ke pusat Kelurahan KebonLega"
      >
        <LocateFixed size={15} className="text-forest-900" />
        Pusat Kelurahan
      </button>
    </div>
  );
}

export default function WebGISRutilahu() {
  const [data, setData] = useState({ houses: [], summary: null });
  const [loading, setLoading] = useState(true);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [activeBasemap, setActiveBasemap] = useState("google_hybrid");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterVerification, setFilterVerification] = useState("semua");
  const [filterHandling, setFilterHandling] = useState("semua");
  const [filterSeverity, setFilterSeverity] = useState("semua");
  const [filterRW, setFilterRW] = useState("semua");

  useEffect(() => {
    fetch(`${API}/rutilahu`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => setData(json.data))
      .catch(() => setData({ houses: [], summary: null }))
      .finally(() => setLoading(false));
  }, []);

  const rwList = useMemo(() => {
    const set = new Set((data.houses || []).map((h) => h.rw).filter(Boolean));
    return [...set].sort();
  }, [data.houses]);

  const filteredHouses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data.houses || []).filter((house) => {
      if (
        q &&
        !house.record_code?.toLowerCase().includes(q) &&
        !`rw ${house.rw} rt ${house.rt}`.includes(q)
      ) {
        return false;
      }

      if (filterVerification !== "semua" && house.verification_status !== filterVerification) {
        return false;
      }

      if (filterHandling !== "semua" && house.handling_status !== filterHandling) {
        return false;
      }

      if (filterSeverity !== "semua") {
        const isSevere =
          house.roof_condition === filterSeverity ||
          house.wall_condition === filterSeverity ||
          house.floor_condition === filterSeverity;
        if (!isSevere) return false;
      }

      if (filterRW !== "semua" && house.rw !== filterRW) {
        return false;
      }

      return true;
    });
  }, [data.houses, search, filterVerification, filterHandling, filterSeverity, filterRW]);

  const summary = data.summary || {
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
    in_progress: 0,
    completed: 0,
    by_rt: [],
  };

  const currentLayer = BASEMAP_LAYERS[activeBasemap] || BASEMAP_LAYERS.google_hybrid;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-stone-100 font-sans">
      {/* Top Bar Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-5 py-3 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            <ArrowLeft size={15} />
            Website Kelurahan
          </Link>
          <Link to="/rutilahu/cek-status" className="rounded-xl bg-forest-900 px-3 py-2 text-xs font-bold text-white">Cek Status</Link>
          <div className="h-5 w-px bg-stone-200 hidden sm:block" />
          <div>
            <h1 className="font-serif text-lg font-bold text-forest-950 flex items-center gap-2">
              <Building size={20} className="text-forest-900" />
              WebGIS 3D RUTILAHU KebonLega
            </h1>
            <p className="text-[11px] text-stone-500 hidden sm:block">
              Peta Satelit Google Maps 3D & Pemantauan Rumah Tidak Layak Huni · Kelurahan KebonLega, Kota Bandung
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-white shadow-2xs"
            title={sidebarOpen ? "Sembunyikan Panel Samping" : "Buka Panel Samping"}
          >
            {sidebarOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
            <span>{sidebarOpen ? "Tutup Panel" : "Buka Panel"}</span>
          </button>
          <span className="hidden lg:inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <Globe size={13} /> Citra Satelit Resolusi Tinggi
          </span>
          <Link
            to="/admin/login"
            className="rounded-xl bg-forest-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-forest-800 transition"
          >
            Panel Petugas
          </Link>
        </div>
      </header>

      {/* Main Content Area (Sidebar + Map) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Analytics & Filter Sidebar */}
        {sidebarOpen && (
          <aside className="z-10 flex w-full max-w-sm shrink-0 flex-col border-r border-stone-200 bg-white shadow-md lg:max-w-md animate-in slide-in-from-left duration-200">
            {/* Summary Stat Pills */}
            <div className="border-b border-stone-200 bg-sage-50/70 p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-earth-500">
                  Ringkasan Data Spasial
                </h2>
                <span className="text-[10px] font-bold text-forest-900 bg-sage-100 px-2 py-0.5 rounded-md">
                  Kel. KebonLega
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-stone-200 bg-white p-2.5 text-center shadow-2xs">
                  <span className="block text-[11px] text-stone-500 font-medium">Total Terdata</span>
                  <strong className="text-lg font-bold text-forest-950">
                    {summary.total}
                  </strong>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-2.5 text-center shadow-2xs">
                  <span className="block text-[11px] text-blue-700 font-medium">Terverifikasi</span>
                  <strong className="text-lg font-bold text-blue-900">
                    {summary.verified}
                  </strong>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 text-center shadow-2xs">
                  <span className="block text-[11px] text-emerald-700 font-medium">Ditangani</span>
                  <strong className="text-lg font-bold text-emerald-900">
                    {summary.completed}
                  </strong>
                </div>
              </div>
            </div>

            {/* Filters Section */}
            <div className="border-b border-stone-200 p-4 space-y-3 bg-white">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  type="search"
                  placeholder="Cari nama pemilik, kode rumah, atau alamat..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-xs focus:border-forest-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 mb-0.5">
                    Status Penanganan
                  </label>
                  <select
                    value={filterHandling}
                    onChange={(e) => setFilterHandling(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5 text-xs focus:border-forest-900 focus:outline-none"
                  >
                    <option value="semua">Semua Penanganan</option>
                    <option value="belum_ditangani">Belum Ditangani</option>
                    <option value="dalam_pengusulan">Dalam Pengusulan</option>
                    <option value="dalam_penanganan_program_bantuan">Dalam Penanganan Program Bantuan</option>
                    <option value="ditangani_swadaya_mandiri">Ditangani Swadaya Mandiri</option>
                    <option value="selesai_ditangani">Selesai Ditangani</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-600 mb-0.5">
                    Tingkat Kerusakan
                  </label>
                  <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5 text-xs focus:border-forest-900 focus:outline-none"
                  >
                    <option value="semua">Semua Kondisi</option>
                    <option value="rusak_berat">Rusak Berat</option>
                    <option value="rusak_sedang">Rusak Sedang</option>
                    <option value="rusak_ringan">Rusak Ringan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-600 mb-0.5">
                    Status Verifikasi
                  </label>
                  <select
                    value={filterVerification}
                    onChange={(e) => setFilterVerification(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5 text-xs focus:border-forest-900 focus:outline-none"
                  >
                    <option value="semua">Semua Verifikasi</option>
                    <option value="terverifikasi">Terverifikasi</option>
                    <option value="belum_diverifikasi">Belum Diverifikasi</option>
                    <option value="ditolak">Ditolak</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-600 mb-0.5">
                    Wilayah RW
                  </label>
                  <select
                    value={filterRW}
                    onChange={(e) => setFilterRW(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5 text-xs focus:border-forest-900 focus:outline-none"
                  >
                    <option value="semua">Semua RW</option>
                    {rwList.map((rw) => (
                      <option key={rw} value={rw}>
                        RW {rw}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* List of Houses & RT Ranking */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {summary.by_rt && summary.by_rt.length > 0 && (
                <div className="rounded-2xl border border-stone-200 bg-stone-50/90 p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-forest-950 flex items-center gap-1.5">
                      <MapPin size={14} className="text-earth-500" />
                      Prioritas Sebaran per RT
                    </h3>
                    <span className="text-[10px] text-stone-500 font-semibold">
                      Aktif / Total
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {summary.by_rt.slice(0, 5).map((area, idx) => (
                      <div
                        key={`${area.rw}-${area.rt}`}
                        className="flex items-center justify-between rounded-lg bg-white p-2 border border-stone-100 text-xs shadow-2xs hover:border-forest-800 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="grid h-5 w-5 place-items-center rounded bg-stone-100 text-[10px] font-bold text-stone-700">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-forest-950">
                            RW {area.rw} / RT {area.rt}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="font-bold text-red-600">
                            {area.active} Aktif
                          </span>
                          <span className="text-stone-400">/ {area.total} Total</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-earth-500">
                    Daftar Rumah ({filteredHouses.length})
                  </h3>
                  <span className="text-[10px] text-stone-400">Klik untuk zoom lokasi</span>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-xs text-stone-500">
                    Memuat data peta WebGIS...
                  </div>
                ) : filteredHouses.length > 0 ? (
                  <div className="space-y-2.5">
                    {filteredHouses.map((house) => (
                      <article
                        key={house.id}
                        onClick={() => setSelectedHouse(house)}
                        className={`cursor-pointer rounded-xl border p-3 text-xs transition shadow-2xs hover:border-forest-900 ${
                          selectedHouse?.id === house.id
                            ? "border-forest-900 bg-sage-50/90 ring-2 ring-forest-900/30"
                            : "border-stone-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <strong className="font-bold text-forest-950 block text-xs">
                              Rumah {house.record_code}
                            </strong>
                            <span className="text-[11px] text-stone-500 block">
                              Kode: {house.record_code} · RW {house.rw} / RT {house.rt}
                            </span>
                            {house.nik && (
                              <span className="text-[10px] text-stone-400 font-mono block">
                                NIK: {house.nik}
                              </span>
                            )}
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              house.handling_status === "selesai_ditangani"
                                ? "bg-emerald-100 text-emerald-800"
                                : house.roof_condition === "rusak_berat"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {handlingLabel(house.handling_status)}
                          </span>
                        </div>

                        <p className="mt-1.5 line-clamp-1 text-[11px] text-stone-600">
                          RW {house.rw} / RT {house.rt}
                        </p>

                        <div className="mt-2 flex items-center gap-2 text-[10px] text-stone-600">
                          <span className="font-medium bg-stone-100 px-1.5 py-0.5 rounded">
                            {house.family_members || 1} Jiwa
                          </span>
                          {Number(house.elderly_count) > 0 && (
                            <span className="font-bold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded">
                              {house.elderly_count} Lansia
                            </span>
                          )}
                          <span className="uppercase text-stone-500 font-semibold">
                            Tanah: {house.land_status || "Milik"}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                          <span
                            className={`rounded border px-1.5 py-0.5 ${
                              CONDITION_COLORS[house.roof_condition] || "bg-stone-100"
                            }`}
                          >
                            Atap: {CONDITION_LABELS[house.roof_condition] || house.roof_condition}
                          </span>
                          <span
                            className={`rounded border px-1.5 py-0.5 ${
                              CONDITION_COLORS[house.wall_condition] || "bg-stone-100"
                            }`}
                          >
                            Dinding: {CONDITION_LABELS[house.wall_condition] || house.wall_condition}
                          </span>
                          <span
                            className={`rounded border px-1.5 py-0.5 ${
                              house.sanitation === "layak"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            Sanitasi: {house.sanitation === "layak" ? "Layak" : "Tidak Layak"}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-stone-200 p-8 text-center text-xs text-stone-500">
                    Tidak ada data rumah yang sesuai dengan filter pencarian.
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}

        {/* Map View */}
        <main className="relative flex-1">
          <MapContainer
            center={KEBON_LEGA_CENTER}
            zoom={15}
            maxZoom={21}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            {/* High-Resolution Tile Layer */}
            <TileLayer
              key={currentLayer.id}
              url={currentLayer.url}
              attribution={currentLayer.attribution}
              maxZoom={currentLayer.maxZoom}
              subdomains={currentLayer.subdomains || []}
            />

            {/* Boundary Polygon of Kelurahan KebonLega with Neon Glow */}
            {showBoundary && (
              <GeoJSON
                data={KEBON_LEGA_BOUNDARY}
                style={{
                  color: "#22c55e",
                  weight: 3,
                  opacity: 0.85,
                  dashArray: "6 6",
                  fillColor: "#16a34a",
                  fillOpacity: 0.08,
                }}
              />
            )}

            <MapController
              center={KEBON_LEGA_CENTER}
              zoom={15}
              selectedHouse={selectedHouse}
            />

            {/* House Spatial Markers */}
            {filteredHouses.filter((house) => house.latitude != null && house.longitude != null).map((house) => {
              const isSelected = selectedHouse?.id === house.id;
              return (
                <Marker
                  key={house.id}
                  position={[Number(house.latitude), Number(house.longitude)]}
                  icon={createHouseIcon(house, isSelected)}
                  eventHandlers={{
                    click: () => setSelectedHouse(house),
                  }}
                >
                  {/* Clear Permanent/Hover Label on top of Marker */}
                  <Tooltip
                    direction="top"
                    offset={[0, -34]}
                    opacity={0.96}
                    className="rutilahu-map-tooltip"
                  >
                    <div className="text-center">
                      <strong className="block text-white text-[11px]">
                        Rumah {house.record_code}
                      </strong>
                      <span className="text-[10px] text-amber-300 block">
                        RW {house.rw} / RT {house.rt} · {house.record_code}
                      </span>
                    </div>
                  </Tooltip>

                  <Popup className="rutilahu-leaflet-popup" maxWidth={330}>
                    <div className="p-1 space-y-2.5">
                      {house.has_photo && (
                        <div className="relative h-36 w-full overflow-hidden rounded-xl bg-stone-900 border border-stone-200">
                          <img
                            src={`${API}/rutilahu/${house.id}/photo`}
                            alt={`Kondisi rumah ${house.record_code}`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                          <span className="absolute bottom-2 left-2 rounded-md bg-black/65 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                            Dokumentasi Lapangan
                          </span>
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-forest-950 text-base leading-tight">
                          Rumah {house.record_code}
                        </h4>
                        <p className="text-xs text-stone-500 mt-0.5 font-medium">
                          Kode: {house.record_code} · RW {house.rw} / RT {house.rt}
                        </p>
                        {house.nik && (
                          <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                            NIK: {house.nik}
                          </p>
                        )}
                      </div>

                      <p className="text-xs text-stone-700 leading-snug bg-stone-50 p-2 rounded-lg border border-stone-100">
                        📍 RW {house.rw} / RT {house.rt}
                      </p>

                      <div className="grid grid-cols-2 gap-1.5 text-xs bg-stone-50/70 p-2 rounded-lg border border-stone-100">
                        <div>
                          <span className="text-[10px] text-stone-500 block">Anggota Keluarga</span>
                          <strong className="text-stone-800 text-xs">{house.family_members || 1} Jiwa</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-500 block">Lansia</span>
                          <strong className="text-stone-800 text-xs">
                            {Number(house.elderly_count) > 0 ? `${house.elderly_count} Jiwa` : "0 (Tidak Ada)"}
                          </strong>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-stone-200/60">
                          <span className="text-[10px] text-stone-500">Status Tanah: </span>
                          <strong className="text-stone-800 uppercase text-xs">{house.land_status || "MILIK"}</strong>
                        </div>
                      </div>

                      <div className="space-y-1.5 border-t border-stone-100 pt-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-stone-500">Kondisi Atap:</span>
                          <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${CONDITION_COLORS[house.roof_condition] || "bg-stone-100"}`}>
                            {CONDITION_LABELS[house.roof_condition] || house.roof_condition}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500">Kondisi Dinding:</span>
                          <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${CONDITION_COLORS[house.wall_condition] || "bg-stone-100"}`}>
                            {CONDITION_LABELS[house.wall_condition] || house.wall_condition}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500">Kondisi Lantai:</span>
                          <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${CONDITION_COLORS[house.floor_condition] || "bg-stone-100"}`}>
                            {CONDITION_LABELS[house.floor_condition] || house.floor_condition}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500">Sanitasi & MCK:</span>
                          <span
                            className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                              house.sanitation === "layak" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {house.sanitation === "layak" ? "Layak" : "Tidak Layak"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-[11px]">
                        <span className="font-semibold text-stone-500">
                          Status Penanganan:
                        </span>
                        <span className="rounded-md bg-forest-900 px-2.5 py-1 font-bold text-white uppercase text-[10px] tracking-wide">
                          {handlingLabel(house.handling_status)}
                        </span>
                      </div>

                      {/* Direct Google Maps 3D & Street View External Links */}
                      <div className="grid grid-cols-2 gap-2 border-t border-stone-100 pt-2.5">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${house.latitude},${house.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                        >
                          <ExternalLink size={13} />
                          Google Maps
                        </a>
                        <a
                          href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${house.latitude},${house.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                        >
                          <Navigation size={13} />
                          Street View 360°
                        </a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Basemap & Layer Control (Top-Left) */}
          <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLayerMenu(!showLayerMenu)}
                className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white/95 px-4 py-2.5 text-xs font-bold text-forest-950 shadow-md backdrop-blur-sm hover:bg-white transition"
              >
                <Layers size={16} className="text-forest-900" />
                <span>Peta: {currentLayer.name}</span>
              </button>

              {showLayerMenu && (
                <div className="absolute left-0 top-12 w-72 rounded-2xl border border-stone-200 bg-white p-3 shadow-2xl space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1 border-b border-stone-100 mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-earth-500">
                      Pilih Provider Peta Satelit
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLayerMenu(false)}
                      className="text-stone-400 hover:text-stone-700"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {Object.values(BASEMAP_LAYERS).map((layer) => (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => {
                        setActiveBasemap(layer.id);
                        setShowLayerMenu(false);
                      }}
                      className={`w-full rounded-xl p-2.5 text-left text-xs transition flex items-center justify-between ${
                        activeBasemap === layer.id
                          ? "bg-forest-900 text-white font-bold shadow-xs"
                          : "hover:bg-stone-50 text-stone-700"
                      }`}
                    >
                      <div>
                        <strong className="block text-xs">{layer.name}</strong>
                        <span
                          className={`text-[10px] block mt-0.5 ${
                            activeBasemap === layer.id ? "text-sage-200" : "text-stone-400"
                          }`}
                        >
                          {layer.desc}
                        </span>
                      </div>
                      {activeBasemap === layer.id && (
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      )}
                    </button>
                  ))}

                  <div className="border-t border-stone-100 pt-2 px-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
                      <input
                        type="checkbox"
                        checked={showBoundary}
                        onChange={(e) => setShowBoundary(e.target.checked)}
                        className="rounded accent-forest-900"
                      />
                      <span>Tampilkan Garis Batas Kelurahan</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Floating Selected House Inspector (Bottom Sheet Overlay) */}
          {selectedHouse && (
            <div className="absolute bottom-6 left-6 z-[400] max-w-md rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-forest-900 text-white shadow-xs">
                    <Home size={16} />
                  </span>
                  <div>
                    <h4 className="font-bold text-forest-950 text-sm">
                      Rumah {selectedHouse.record_code}
                    </h4>
                    <span className="text-[11px] text-stone-500">
                      Kode: {selectedHouse.record_code} · RW {selectedHouse.rw} / RT {selectedHouse.rt}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHouse(null)}
                  className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2 text-[11px]">
                <span className={`px-2 py-0.5 rounded border font-semibold ${CONDITION_COLORS[selectedHouse.roof_condition] || "bg-stone-100"}`}>
                  Atap: {CONDITION_LABELS[selectedHouse.roof_condition]}
                </span>
                <span className={`px-2 py-0.5 rounded border font-semibold ${CONDITION_COLORS[selectedHouse.wall_condition] || "bg-stone-100"}`}>
                  Dinding: {CONDITION_LABELS[selectedHouse.wall_condition]}
                </span>
                <span className="px-2 py-0.5 rounded bg-stone-100 font-semibold text-stone-700 uppercase">
                  {handlingLabel(selectedHouse.handling_status)}
                </span>
              </div>

              <div className="mt-3.5 flex items-center gap-2">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedHouse.latitude},${selectedHouse.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-xs"
                >
                  <ExternalLink size={13} />
                  Buka Google Maps
                </a>
                <a
                  href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${selectedHouse.latitude},${selectedHouse.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs"
                >
                  <Navigation size={13} />
                  Street View 360°
                </a>
              </div>
            </div>
          )}

          {/* Map Legend Overlay (Bottom-Right) */}
          <div className="absolute bottom-6 right-6 z-[400] max-w-xs rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-xl backdrop-blur-sm">
            <h4 className="text-xs font-bold text-forest-950 mb-2 flex items-center gap-1.5">
              <Layers size={14} className="text-earth-500" />
              Legenda Peta Satelit 3D
            </h4>
            <div className="space-y-1.5 text-xs text-stone-700">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full bg-red-600 shadow-xs ring-2 ring-red-200" />
                <span className="font-semibold text-red-950">Rusak Berat (Prioritas Cepat)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full bg-orange-500 shadow-xs" />
                <span>Sedang Dalam Penanganan</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full bg-blue-600 shadow-xs" />
                <span>Terverifikasi (Layak Bantuan)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full bg-emerald-600 shadow-xs" />
                <span>Selesai Ditangani</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full bg-slate-500 shadow-xs" />
                <span>Belum Diverifikasi</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-stone-100 text-[11px] text-stone-500">
                <span className="h-2 w-5 border border-dashed border-emerald-500 bg-emerald-100" />
                <span>Batas Kelurahan KebonLega</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
