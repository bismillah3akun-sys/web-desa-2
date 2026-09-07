import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  Eye,
  FileSpreadsheet,
  FileText,
  History,
  Home,
  ImageIcon,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  Map as MapIcon,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import AdminDataTable, { RecordIdentity, StatusBadge } from "@/components/AdminDataTable";
import { useConfirm } from "@/components/confirmContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const KEBON_LEGA_CENTER = [-6.9465, 107.5982];

const pickerIcon = L.divIcon({
  className: "custom-map-pin",
  html: `<div style="background-color:#173d32;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid white;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function MapLocationPicker({ position, onPositionChange }) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return position ? (
    <Marker
      position={position}
      icon={pickerIcon}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const marker = e.target;
          const latlng = marker.getLatLng();
          onPositionChange(latlng.lat, latlng.lng);
        },
      }}
    />
  ) : null;
}

const CONDITION_LABELS = {
  baik: { label: "Baik", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rusak_ringan: { label: "Rusak Ringan", class: "bg-amber-50 text-amber-700 border-amber-200" },
  rusak_sedang: { label: "Rusak Sedang", class: "bg-orange-50 text-orange-700 border-orange-200" },
  rusak_berat: { label: "Rusak Berat", class: "bg-red-50 text-red-700 border-red-200" },
};

const SANITATION_LABELS = {
  layak: { label: "Layak", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  tidak_layak: { label: "Tidak Layak", class: "bg-rose-50 text-rose-700 border-rose-200" },
};

const VERIFICATION_LABELS = {
  belum_diverifikasi: { label: "Belum Diverifikasi", tone: "amber", icon: Clock },
  terverifikasi: { label: "Terverifikasi", tone: "emerald", icon: ShieldCheck },
  ditolak: { label: "Ditolak", tone: "rose", icon: ShieldAlert },
};

const HANDLING_LABELS = {
  belum_ditangani: { label: "Belum Ditangani", color: "bg-stone-100 text-stone-700" },
  diusulkan: { label: "Diusulkan", color: "bg-blue-50 text-blue-700 border-blue-200" },
  dalam_penanganan: { label: "Dalam Penanganan", color: "bg-amber-50 text-amber-700 border-amber-200" },
  selesai: { label: "Selesai", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export default function AdminRutilahu({ onDataChanged }) {
  const [data, setData] = useState({ houses: [], summary: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeModal, setActiveModal] = useState(null); // 'form' | 'status' | 'history' | 'import' | 'photo'
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [modalPhotoUrl, setModalPhotoUrl] = useState("");
  const confirm = useConfirm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/rutilahu`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat data RUTILAHU.");
      const json = await res.json();
      setData(json.data);
      setError("");
    } catch (err) {
      setError(err.message || "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleDelete = async (house) => {
    const isConfirmed = await confirm({
      title: "Hapus Data RUTILAHU",
      message: `Apakah Anda yakin ingin menghapus data rumah dengan kode "${house.record_code}" atas nama "${house.owner_name}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: "Hapus Data",
      tone: "danger",
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch(`${API}/admin/rutilahu/${house.id}?version=${house.version}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal menghapus data.");
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert(err.message || "Gagal menghapus data.");
    }
  };

  const handleOpenHistory = async (house) => {
    setSelectedHouse(house);
    setActiveModal("history");
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API}/admin/rutilahu/${house.id}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setHistoryData(json.data.history || []);
    } catch {
      setHistoryData([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const summary = data.summary || {
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
    in_progress: 0,
    completed: 0,
    by_rt: [],
  };

  const columns = [
    {
      key: "owner_name",
      label: "Kode & Pemilik",
      sortValue: (row) => row.owner_name,
      render: (row) => (
        <div>
          <RecordIdentity
            name={row.owner_name}
            subtitle={`Kode: ${row.record_code}`}
            tone={row.verification_status === "terverifikasi" ? "blue" : "amber"}
          />
          {row.nik && (
            <span className="text-[11px] text-stone-500 font-mono mt-0.5 block">
              NIK: {row.nik}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "address",
      label: "Alamat & Wilayah",
      sortValue: (row) => `${row.rw}-${row.rt}`,
      render: (row) => (
        <div className="admin-data-text">
          <span className="font-semibold text-stone-900 block text-xs">
            RW {row.rw} / RT {row.rt}
          </span>
          <span className="text-xs text-stone-600 block line-clamp-2 mt-0.5">
            {row.address}
          </span>
        </div>
      ),
    },
    {
      key: "family_info",
      label: "Keluarga & Tanah",
      render: (row) => (
        <div className="text-xs space-y-1">
          <div className="font-medium text-stone-800">
            {row.family_members || 1} Jiwa
            {Number(row.elderly_count) > 0 && (
              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                {row.elderly_count} Lansia
              </span>
            )}
          </div>
          <span className="inline-block uppercase text-[10px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
            Tanah: {row.land_status || "MILIK"}
          </span>
        </div>
      ),
    },
    {
      key: "condition",
      label: "Kondisi Fisik",
      render: (row) => (
        <div className="flex flex-wrap gap-1.5 max-w-xs text-[11px]">
          <span
            className={`px-2 py-0.5 rounded border ${
              CONDITION_LABELS[row.roof_condition]?.class || "bg-stone-100"
            }`}
          >
            Atap: {CONDITION_LABELS[row.roof_condition]?.label || row.roof_condition}
          </span>
          <span
            className={`px-2 py-0.5 rounded border ${
              CONDITION_LABELS[row.wall_condition]?.class || "bg-stone-100"
            }`}
          >
            Dinding: {CONDITION_LABELS[row.wall_condition]?.label || row.wall_condition}
          </span>
          <span
            className={`px-2 py-0.5 rounded border ${
              CONDITION_LABELS[row.floor_condition]?.class || "bg-stone-100"
            }`}
          >
            Lantai: {CONDITION_LABELS[row.floor_condition]?.label || row.floor_condition}
          </span>
          <span
            className={`px-2 py-0.5 rounded border ${
              SANITATION_LABELS[row.sanitation]?.class || "bg-stone-100"
            }`}
          >
            Sanitasi: {SANITATION_LABELS[row.sanitation]?.label || row.sanitation}
          </span>
        </div>
      ),
    },
    {
      key: "verification_status",
      label: "Status Verifikasi",
      sortValue: (row) => row.verification_status,
      render: (row) => {
        const item = VERIFICATION_LABELS[row.verification_status] || {
          label: row.verification_status,
          tone: "stone",
        };
        return (
          <StatusBadge value={row.verification_status}>
            {item.label}
          </StatusBadge>
        );
      },
    },
    {
      key: "handling_status",
      label: "Penanganan",
      sortValue: (row) => row.handling_status,
      render: (row) => {
        const item = HANDLING_LABELS[row.handling_status] || {
          label: row.handling_status,
          color: "bg-stone-100 text-stone-700",
        };
        return (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${item.color}`}
          >
            {item.label}
          </span>
        );
      },
    },
    {
      key: "photo",
      label: "Foto",
      render: (row) =>
        row.has_photo ? (
          <button
            type="button"
            onClick={() => {
              setModalPhotoUrl(`${API}/rutilahu/${row.id}/photo?t=${row.version}`);
              setActiveModal("photo");
            }}
            className="group relative h-10 w-14 overflow-hidden rounded-lg border border-stone-200 bg-stone-100 shadow-sm transition hover:opacity-90"
            title="Klik untuk melihat foto"
          >
            <img
              src={`${API}/rutilahu/${row.id}/photo?t=${row.version}`}
              alt={row.owner_name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <span className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition group-hover:opacity-100">
              <Eye size={14} className="text-white" />
            </span>
          </button>
        ) : (
          <span className="text-xs text-stone-400 italic">Tanpa foto</span>
        ),
    },
    {
      key: "actions",
      label: "Aksi",
      className: "text-right",
      render: (row) => (
        <div className="admin-row-actions justify-end">
          <button
            type="button"
            className="admin-row-action"
            title="Update Verifikasi & Penanganan"
            onClick={() => {
              setSelectedHouse(row);
              setActiveModal("status");
            }}
          >
            <ShieldCheck size={16} />
          </button>
          <button
            type="button"
            className="admin-row-action"
            title="Edit Lengkap"
            onClick={() => {
              setSelectedHouse(row);
              setActiveModal("form");
            }}
          >
            <Edit2 size={16} />
          </button>
          <button
            type="button"
            className="admin-row-action"
            title="Riwayat Perubahan"
            onClick={() => handleOpenHistory(row)}
          >
            <History size={16} />
          </button>
          <button
            type="button"
            className="admin-row-action admin-row-action--danger"
            title="Hapus"
            onClick={() => handleDelete(row)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Statistics Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Rumah</span>
            <Home size={18} className="text-forest-900" />
          </div>
          <p className="mt-3 text-2xl font-bold text-forest-950">
            {summary.total.toLocaleString("id-ID")}
          </p>
          <p className="mt-1 text-[11px] text-stone-500">Terdata di Kelurahan</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-semibold uppercase tracking-wider">Perlu Verifikasi</span>
            <Clock size={18} className="text-amber-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-amber-900">
            {summary.pending.toLocaleString("id-ID")}
          </p>
          <p className="mt-1 text-[11px] text-amber-700">Menunggu survei petugas</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-blue-800">
            <span className="text-xs font-semibold uppercase tracking-wider">Terverifikasi</span>
            <ShieldCheck size={18} className="text-blue-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-blue-900">
            {summary.verified.toLocaleString("id-ID")}
          </p>
          <p className="mt-1 text-[11px] text-blue-700">Layak bantuan RUTILAHU</p>
        </div>

        <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-orange-800">
            <span className="text-xs font-semibold uppercase tracking-wider">Dalam Proses</span>
            <Building size={18} className="text-orange-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-orange-900">
            {summary.in_progress.toLocaleString("id-ID")}
          </p>
          <p className="mt-1 text-[11px] text-orange-700">Sedang diperbaiki</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-semibold uppercase tracking-wider">Selesai</span>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-900">
            {summary.completed.toLocaleString("id-ID")}
          </p>
          <p className="mt-1 text-[11px] text-emerald-700">Telah ditangani</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-xs font-semibold uppercase tracking-wider">Ditolak</span>
            <ShieldAlert size={18} className="text-rose-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-rose-900">
            {summary.rejected.toLocaleString("id-ID")}
          </p>
          <p className="mt-1 text-[11px] text-rose-700">Tidak memenuhi kriteria</p>
        </div>
      </div>

      {/* RT Spatial Priority Breakdown Widget */}
      {summary.by_rt && summary.by_rt.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-bold text-forest-950 flex items-center gap-2 text-sm">
                <MapPin size={16} className="text-earth-500" />
                Persebaran Wilayah & Prioritas Penanganan per RT
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Urutan RT dengan jumlah rumah tidak layak huni aktif terbanyak di Kelurahan Kebon Lega.
              </p>
            </div>
            <span className="text-xs font-medium text-stone-400">
              Total {summary.by_rt.length} RT Terdata
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summary.by_rt.slice(0, 8).map((area, idx) => (
              <div
                key={`${area.rw}-${area.rt}`}
                className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50/80 p-3 hover:bg-sage-50 transition"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-bold ${
                      idx === 0
                        ? "bg-red-500 text-white shadow-sm"
                        : idx < 3
                        ? "bg-orange-500 text-white"
                        : "bg-stone-200 text-stone-700"
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <div>
                    <strong className="text-xs font-bold text-forest-950 block">
                      RW {area.rw} / RT {area.rt}
                    </strong>
                    <span className="text-[11px] text-stone-500">
                      Total: {area.total} rumah
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-md bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                    {area.active} Aktif
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Data Table */}
      <AdminDataTable
        title="Daftar Rumah Tidak Layak Huni (RUTILAHU)"
        description="Kelola survei fisik, verifikasi kelayakan, status penanganan perbaikan, dan foto kondisi rumah."
        rows={data.houses}
        columns={columns}
        loading={loading}
        searchText={(row) => `${row.record_code} ${row.owner_name} ${row.address} RW ${row.rw} RT ${row.rt}`}
        searchPlaceholder="Cari kode rumah, nama pemilik, alamat, RW/RT…"
        filterKey="verification_status"
        filters={[
          { value: "belum_diverifikasi", label: "Belum Diverifikasi" },
          { value: "terverifikasi", label: "Terverifikasi" },
          { value: "ditolak", label: "Ditolak" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`${API}/admin/rutilahu/export.xlsx`}
              className="admin-table-button"
              title="Ekspor Seluruh Data ke Excel"
            >
              <Download size={15} />
              <span>Ekspor Excel</span>
            </a>
            <button
              type="button"
              onClick={() => setActiveModal("import")}
              className="admin-table-button"
              title="Impor Data Excel Hasil Survei"
            >
              <Upload size={15} />
              <span>Impor Excel</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedHouse(null);
                setActiveModal("form");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-forest-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-forest-800 transition"
            >
              <Plus size={16} />
              <span>Tambah Rumah</span>
            </button>
          </div>
        }
      />

      {/* Create / Edit House Modal */}
      {activeModal === "form" && (
        <HouseFormModal
          house={selectedHouse}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            loadData();
            if (onDataChanged) onDataChanged();
          }}
        />
      )}

      {/* Status & Verification Update Modal */}
      {activeModal === "status" && selectedHouse && (
        <StatusUpdateModal
          house={selectedHouse}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            loadData();
            if (onDataChanged) onDataChanged();
          }}
        />
      )}

      {/* Audit Trail History Modal */}
      {activeModal === "history" && selectedHouse && (
        <HistoryModal
          house={selectedHouse}
          history={historyData}
          loading={loadingHistory}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Excel Import Modal */}
      {activeModal === "import" && (
        <ExcelImportModal
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            loadData();
            if (onDataChanged) onDataChanged();
          }}
        />
      )}

      {/* Photo Preview Modal */}
      {activeModal === "photo" && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl bg-white p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X size={18} />
            </button>
            <img
              src={modalPhotoUrl}
              alt="Foto Kondisi Rumah"
              className="max-h-[80vh] w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function HouseFormModal({ house, onClose, onSuccess }) {
  const isEdit = Boolean(house);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [photoPreview, setPhotoPreview] = useState(
    house?.has_photo ? `${API}/rutilahu/${house.id}/photo?t=${house.version}` : null
  );
  const [removePhoto, setRemovePhoto] = useState(false);

  // Map coordinate state
  const [lat, setLat] = useState(house ? Number(house.latitude) : KEBON_LEGA_CENTER[0]);
  const [lng, setLng] = useState(house ? Number(house.longitude) : KEBON_LEGA_CENTER[1]);

  const handlePositionChange = (newLat, newLng) => {
    setLat(Number(newLat.toFixed(7)));
    setLng(Number(newLng.toFixed(7)));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
      setRemovePhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("latitude", String(lat));
    formData.set("longitude", String(lng));
    if (removePhoto) formData.set("remove_photo", "true");
    if (isEdit) formData.set("version", String(house.version));

    try {
      const url = isEdit ? `${API}/admin/rutilahu/${house.id}` : `${API}/admin/rutilahu`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal menyimpan data.");
      onSuccess();
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rutilahu-house-form-overlay fixed inset-0 z-[2500] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      style={{ maxWidth: "none", width: "100vw", padding: "1rem" }}
    >
      <div className="relative my-8 w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <div>
            <h3 className="font-serif text-xl font-bold text-forest-950">
              {isEdit ? "Edit Data Rumah RUTILAHU" : "Tambah Data Rumah RUTILAHU"}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Kelurahan Kebon Lega, Kecamatan Bojongloa Kidul
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          {/* Bagian 1: Identitas & Lokasi */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500 mb-3">
              1. Identitas & Alamat Rumah
            </h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Kode Rumah *
                </label>
                <input
                  name="record_code"
                  defaultValue={house?.record_code || ""}
                  placeholder="Contoh: KBL-RTLH-001"
                  required
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm uppercase focus:border-forest-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nama Kepala Keluarga / Pemilik *
                </label>
                <input
                  name="owner_name"
                  defaultValue={house?.owner_name || ""}
                  placeholder="Nama lengkap pemilik"
                  required
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-forest-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  NIK (Nomor Induk Kependudukan)
                </label>
                <input
                  name="nik"
                  defaultValue={house?.nik || ""}
                  placeholder="16 Digit NIK KTP"
                  maxLength={20}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono focus:border-forest-900 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Alamat Lengkap *
                </label>
                <textarea
                  name="address"
                  defaultValue={house?.address || ""}
                  placeholder="Nama jalan, nomor rumah, gang, atau patokan lokasi"
                  rows={2}
                  required
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-forest-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  RW * (1–99)
                </label>
                <input
                  name="rw"
                  defaultValue={house?.rw || ""}
                  placeholder="01"
                  required
                  maxLength={3}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-forest-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  RT * (1–99)
                </label>
                <input
                  name="rt"
                  defaultValue={house?.rt || ""}
                  placeholder="02"
                  required
                  maxLength={3}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-forest-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Anggota Keluarga (Jiwa) *
                </label>
                <input
                  name="family_members"
                  type="number"
                  min={1}
                  max={99}
                  defaultValue={house?.family_members || 1}
                  required
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-forest-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Terdapat Lansia (Jiwa)
                </label>
                <input
                  name="elderly_count"
                  type="number"
                  min={0}
                  max={99}
                  defaultValue={house?.elderly_count || 0}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-forest-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Status Tanah *
                </label>
                <select
                  name="land_status"
                  defaultValue={house?.land_status || "milik"}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-forest-900 focus:outline-none bg-white"
                >
                  <option value="milik">Milik Sendiri</option>
                  <option value="sewa">Sewa / Kontrak</option>
                  <option value="menumpang">Menumpang</option>
                  <option value="girik">Girik / Adat</option>
                  <option value="tanah_negara">Tanah Negara</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bagian 2: WebGIS Coordinate Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500">
                2. Titik Koordinat Spasial (WebGIS)
              </h4>
              <span className="text-[11px] text-stone-500">
                Klik pada peta atau geser pin untuk menentukan titik
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-stone-200 shadow-inner h-56 w-full relative">
              <MapContainer
                center={[lat, lng]}
                zoom={16}
                maxZoom={20}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution="&copy; Google Maps Satellite 3D"
                  url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                  maxZoom={20}
                  subdomains={["mt0", "mt1", "mt2", "mt3"]}
                />
                <MapLocationPicker
                  position={[lat, lng]}
                  onPositionChange={handlePositionChange}
                />
              </MapContainer>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Latitude (Lintang) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                  required
                  className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-xs focus:border-forest-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Longitude (Bujur) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(Number(e.target.value))}
                  required
                  className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-xs focus:border-forest-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Bagian 3: Kondisi Fisik Rumah */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500 mb-3">
              3. Penilaian Kondisi Fisik Rumah
            </h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Kondisi Atap *
                </label>
                <select
                  name="roof_condition"
                  defaultValue={house?.roof_condition || "rusak_sedang"}
                  required
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-forest-900 focus:outline-none bg-white"
                >
                  <option value="baik">Baik</option>
                  <option value="rusak_ringan">Rusak Ringan</option>
                  <option value="rusak_sedang">Rusak Sedang</option>
                  <option value="rusak_berat">Rusak Berat</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Kondisi Dinding *
                </label>
                <select
                  name="wall_condition"
                  defaultValue={house?.wall_condition || "rusak_sedang"}
                  required
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-forest-900 focus:outline-none bg-white"
                >
                  <option value="baik">Baik</option>
                  <option value="rusak_ringan">Rusak Ringan</option>
                  <option value="rusak_sedang">Rusak Sedang</option>
                  <option value="rusak_berat">Rusak Berat</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Kondisi Lantai *
                </label>
                <select
                  name="floor_condition"
                  defaultValue={house?.floor_condition || "rusak_sedang"}
                  required
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-forest-900 focus:outline-none bg-white"
                >
                  <option value="baik">Baik</option>
                  <option value="rusak_ringan">Rusak Ringan</option>
                  <option value="rusak_sedang">Rusak Sedang</option>
                  <option value="rusak_berat">Rusak Berat</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Sanitasi & MCK *
                </label>
                <select
                  name="sanitation"
                  defaultValue={house?.sanitation || "tidak_layak"}
                  required
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-forest-900 focus:outline-none bg-white"
                >
                  <option value="layak">Layak</option>
                  <option value="tidak_layak">Tidak Layak</option>
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Catatan Kondisi Fisik Lapangan
                </label>
                <textarea
                  name="notes"
                  defaultValue={house?.notes || ""}
                  placeholder="Keterangan detail kerusakan struktur bangunan, atap bocor, pondasi, dll."
                  rows={2}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-forest-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Bagian 4: Foto & Verifikasi */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500 mb-3">
              4. Foto Rumah & Status Awal
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Upload Foto Rumah (JPG / PNG / WEBP)
                </label>
                <input
                  type="file"
                  name="photo"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="w-full text-xs text-stone-500 file:mr-3 file:rounded-lg file:border-0 file:bg-forest-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-forest-800"
                />
                {photoPreview && (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="h-16 w-24 rounded-lg object-cover border border-stone-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoPreview(null);
                        setRemovePhoto(true);
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Hapus Foto
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Status Verifikasi *
                  </label>
                  <select
                    name="verification_status"
                    defaultValue={house?.verification_status || "belum_diverifikasi"}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-forest-900 focus:outline-none bg-white"
                  >
                    <option value="belum_diverifikasi">Belum Diverifikasi</option>
                    <option value="terverifikasi">Terverifikasi (Layak Bantuan)</option>
                    <option value="ditolak">Ditolak (Tidak Memenuhi Syarat)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Catatan Verifikasi
                  </label>
                  <input
                    name="verification_note"
                    defaultValue={house?.verification_note || ""}
                    placeholder="Wajib jika status terverifikasi/ditolak"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-forest-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Status Penanganan *
                  </label>
                  <select
                    name="handling_status"
                    defaultValue={house?.handling_status || "belum_ditangani"}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-forest-900 focus:outline-none bg-white"
                  >
                    <option value="belum_ditangani">Belum Ditangani</option>
                    <option value="diusulkan">Diusulkan ke Program</option>
                    <option value="dalam_penanganan">Dalam Penanganan / Pengerjaan</option>
                    <option value="selesai">Selesai Ditangani</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Catatan Penanganan
                  </label>
                  <input
                    name="handling_note"
                    defaultValue={house?.handling_note || ""}
                    placeholder="Wajib jika status penanganan diubah"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-forest-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <footer className="flex items-center justify-end gap-3 border-t border-stone-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-300 px-5 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-forest-900 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-forest-800 disabled:opacity-60"
            >
              {loading && <LoaderCircle size={15} className="animate-spin" />}
              {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Data"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function StatusUpdateModal({ house, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verStatus, setVerStatus] = useState(house.verification_status);
  const [handlingStatus, setHandlingStatus] = useState(house.handling_status);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("version", String(house.version));

    // Copy original data
    formData.set("record_code", house.record_code);
    formData.set("owner_name", house.owner_name);
    formData.set("nik", house.nik || "");
    formData.set("address", house.address);
    formData.set("rw", house.rw);
    formData.set("rt", house.rt);
    formData.set("family_members", String(house.family_members || 1));
    formData.set("elderly_count", String(house.elderly_count || 0));
    formData.set("land_status", house.land_status || "milik");
    formData.set("latitude", String(house.latitude));
    formData.set("longitude", String(house.longitude));
    formData.set("roof_condition", house.roof_condition);
    formData.set("wall_condition", house.wall_condition);
    formData.set("floor_condition", house.floor_condition);
    formData.set("sanitation", house.sanitation);
    formData.set("notes", house.notes || "");

    try {
      const res = await fetch(`${API}/admin/rutilahu/${house.id}`, {
        method: "PUT",
        credentials: "include",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal memperbarui status.");
      onSuccess();
    } catch (err) {
      setError(err.message || "Gagal memperbarui status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-forest-950">
              Verifikasi & Status Penanganan
            </h3>
            <p className="text-xs text-stone-500">
              {house.record_code} · {house.owner_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Status Verifikasi Lapangan *
            </label>
            <select
              name="verification_status"
              value={verStatus}
              onChange={(e) => setVerStatus(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-forest-900 focus:outline-none bg-white"
            >
              <option value="belum_diverifikasi">Belum Diverifikasi</option>
              <option value="terverifikasi">Terverifikasi (Layak Bantuan)</option>
              <option value="ditolak">Ditolak (Tidak Memenuhi Syarat)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Catatan Verifikasi {verStatus !== "belum_diverifikasi" && "*"}
            </label>
            <textarea
              name="verification_note"
              defaultValue={house.verification_note || ""}
              placeholder="Berikan alasan verifikasi atau penolakan..."
              rows={2}
              required={verStatus !== "belum_diverifikasi"}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-forest-900 focus:outline-none"
            />
          </div>

          <div className="border-t border-stone-100 pt-3">
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Status Monitoring Penanganan *
            </label>
            <select
              name="handling_status"
              value={handlingStatus}
              onChange={(e) => setHandlingStatus(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-forest-900 focus:outline-none bg-white"
            >
              <option value="belum_ditangani">Belum Ditangani</option>
              <option value="diusulkan">Diusulkan ke Program Bantuan</option>
              <option value="dalam_penanganan">Dalam Penanganan / Perbaikan</option>
              <option value="selesai">Selesai Ditangani</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Catatan Penanganan {handlingStatus !== "belum_ditangani" && "*"}
            </label>
            <textarea
              name="handling_note"
              defaultValue={house.handling_note || ""}
              placeholder="Rincian alokasi program, tahapan renovasi, dll."
              rows={2}
              required={handlingStatus !== "belum_ditangani"}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-forest-900 focus:outline-none"
            />
          </div>

          <footer className="flex items-center justify-end gap-3 border-t border-stone-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-forest-900 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-forest-800 disabled:opacity-60"
            >
              {loading && <LoaderCircle size={14} className="animate-spin" />}
              {loading ? "Menyimpan..." : "Perbarui Status"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function HistoryModal({ house, history, loading, onClose }) {
  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-forest-950 flex items-center gap-2">
              <History size={18} className="text-earth-500" />
              Riwayat Perubahan & Audit Trail
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {house.record_code} · {house.owner_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X size={20} />
          </button>
        </header>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-xs font-semibold text-stone-500">
              <LoaderCircle size={22} className="animate-spin mx-auto mb-2 text-forest-900" />
              Memuat riwayat...
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-4 border-l-2 border-sage-200 pl-4 ml-2">
              {history.map((item) => (
                <div key={item.id} className="relative group">
                  <span className="absolute -left-[23px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-forest-900 shadow-sm" />
                  <div className="rounded-xl border border-stone-100 bg-stone-50 p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-semibold text-stone-800">
                      <span className="capitalize">{item.action.replace("_", " ")}</span>
                      <span className="text-[11px] text-stone-500">
                        {new Date(item.created_at).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Asia/Jakarta",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-stone-500">Petugas:</span>
                      <span className="font-bold text-forest-950">
                        {item.officer || "Sistem / Petugas"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1 text-[10px]">
                      <span className="rounded bg-white px-2 py-0.5 border border-stone-200 font-medium">
                        Verifikasi: {item.verification_status}
                      </span>
                      <span className="rounded bg-white px-2 py-0.5 border border-stone-200 font-medium">
                        Penanganan: {item.handling_status}
                      </span>
                    </div>
                    {item.note && (
                      <p className="text-stone-600 italic bg-white/60 p-2 rounded border border-stone-100 mt-1 whitespace-pre-line text-[11px]">
                        "{item.note}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-stone-500">
              Belum ada catatan riwayat perubahan.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ExcelImportModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError("");
    setSuccessMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API}/admin/rutilahu/import`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal mengimpor data.");
      setSuccessMsg(json.message || "Data berhasil diimpor!");
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err.message || "Gagal memproses file Excel.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rutilahu-excel-modal-overlay fixed inset-0 z-[2500] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      style={{ maxWidth: "none", width: "100vw", padding: "1rem" }}
    >
      <div
        className="rutilahu-excel-modal relative my-4 w-full rounded-2xl bg-white shadow-2xl"
        style={{ width: "min(760px, calc(100vw - 2rem))", maxWidth: "760px", padding: 0 }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-5 sm:px-8">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-serif text-lg font-bold text-forest-950 sm:text-xl">
              <FileSpreadsheet size={18} className="text-emerald-600" />
              <span>Impor Data Excel RUTILAHU</span>
            </h3>
            <p className="mt-1 text-xs leading-5 text-stone-500">
              Migrasi pendataan survei lapangan format Excel ke sistem WebGIS
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="max-h-[calc(100dvh-9rem)] space-y-5 overflow-y-auto p-6 sm:p-8">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 whitespace-pre-line">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
              {successMsg}
            </div>
          )}

          <div className="rounded-xl border border-stone-200 bg-sage-50/60 p-4">
            <h4 className="text-xs font-bold text-forest-950 mb-1">
              Petunjuk Format Excel:
            </h4>
            <p className="text-xs text-stone-600 leading-5">
              File dengan susunan seperti data verifikasi Kecamatan Bojongloa Kidul dapat langsung diunggah. Sistem membaca header bertingkat: Nama, NIK, Alamat, Anggota Keluarga, Lansia, Status Tanah, Atap, Lantai, Dinding, dan Keterangan. RT/RW dibaca dari alamat, sedangkan koordinat dapat dilengkapi setelah impor.
            </p>
            <a
              href={`${API}/admin/rutilahu/template.xlsx`}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-forest-900 hover:underline"
            >
              <Download size={14} />
              Unduh Template Excel Survei (.xlsx)
            </a>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Pilih Dokumen Excel (.xlsx) *
            </label>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
              className="w-full text-xs text-stone-500 file:mr-3 file:rounded-lg file:border-0 file:bg-forest-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-forest-800"
            />
          </div>

          <footer className="flex items-center justify-end gap-3 border-t border-stone-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="flex items-center gap-2 rounded-xl bg-forest-900 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-forest-800 disabled:opacity-60"
            >
              {loading && <LoaderCircle size={14} className="animate-spin" />}
              {loading ? "Memproses..." : "Unggah & Impor"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
