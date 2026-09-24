import { useEffect, useState } from "react";
import { Edit3, Plus, Save, Trash2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useConfirm } from "@/components/confirmContext";
import OrganizationChart from "@/components/OrganizationChart";
import ImageCropper from "@/components/ImageCropper";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const emptyForm = {
  position: "",
  name: "",
  nip: "",
  description: "",
  personnel_type: "official",
  sort_order: 0,
  is_active: true,
  photo: null,
  image_url: "",
  parent_id: "",
  chart_x: "",
  chart_y: "",
};

export default function AdminOfficials() {
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [cropSource, setCropSource] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/admin/officials`, { credentials: "include" })
      .then(async (response) => {
        if (response.status === 401)
          return navigate("/admin/login", { replace: true });
        if (!response.ok)
          throw new Error("Data perangkat kelurahan belum dapat dimuat");
        setItems((await response.json()).data);
      })
      .catch((error) => setNotice(error.message));
  }, [navigate]);

  function change(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function edit(item) {
    setEditingId(item.id);
    setForm({
      position: item.position || "",
      name: item.name || "",
      nip: item.nip || "",
      description: item.description || "",
      personnel_type: item.personnel_type || "official",
      sort_order: item.sort_order ?? 0,
      is_active: Boolean(item.is_active),
      photo: null,
      image_url: item.image_url || "",
      parent_id: item.parent_id ?? "",
      chart_x: item.chart_x ?? "",
      chart_y: item.chart_y ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      const formData = new FormData();
      formData.append("position", form.position);
      formData.append("name", form.name);
      formData.append("nip", form.nip);
      formData.append("description", form.description);
      formData.append("personnel_type", form.personnel_type);
      formData.append("sort_order", String(form.sort_order));
      formData.append("is_active", String(form.is_active));
      formData.append("parent_id", String(form.parent_id ?? ""));
      formData.append("chart_x", String(form.chart_x ?? ""));
      formData.append("chart_y", String(form.chart_y ?? ""));
      if (form.photo) formData.append("photo", form.photo);
      const response = await fetch(
        `${API}/admin/officials${editingId ? `/${editingId}` : ""}`,
        {
          method: editingId ? "PUT" : "POST",
          credentials: "include",
          body: formData,
        },
      );
      const body = await response.json();
      if (response.status === 401)
        return navigate("/admin/login", { replace: true });
      if (!response.ok) throw new Error(body.message);
      setItems((current) => {
        const next = editingId
          ? current.map((item) => (item.id === editingId ? body.data : item))
          : [...current, body.data];
        return next.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
      });
      setNotice(body.message);
      reset();
    } catch (error) {
      setNotice(error.message || "Data perangkat kelurahan belum dapat disimpan");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    confirm({
      title: "Hapus perangkat kelurahan?",
      itemName: `${item.position}${item.name ? ` — ${item.name}` : ""}`,
      description:
        "Data perangkat kelurahan akan dihapus permanen dari struktur pemerintahan.",
      onConfirm: async () => {
        const response = await fetch(`${API}/admin/officials/${item.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? "Sesi berakhir. Silakan login kembali."
              : body.message,
          );
        setItems((current) => current.filter((entry) => entry.id !== item.id));
        if (editingId === item.id) reset();
        setNotice(body.message);
      },
    });
  }

  async function move(id, position) {
    try {
      const response = await fetch(`${API}/admin/officials/${id}/position`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x: position.x, y: position.y }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setItems((current) => current.map((item) => item.id === id ? body.data : item));
      setNotice("Posisi bagan berhasil disimpan");
    } catch (error) { setNotice(error.message || "Posisi belum dapat disimpan"); }
  }

  return (
    <main className="min-h-screen bg-sage-50">
      {notice && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-sage-200 bg-white px-5 py-4 text-sm font-semibold text-forest-900 shadow-xl">
          {notice}
        </div>
      )}
      <div className="mx-auto max-w-7xl px-5 py-10">
        <div className="grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
          <form
            onSubmit={submit}
            className="h-fit rounded-2xl border border-sage-200 bg-white p-6 md:p-8"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-forest-900 text-white">
                {editingId ? <Edit3 size={20} /> : <Plus size={20} />}
              </span>
              <div>
                <h1 className="font-serif text-2xl text-forest-950">
                  {editingId ? "Edit perangkat kelurahan" : "Tambah perangkat kelurahan"}
                </h1>
                <p className="text-sm text-stone-500">
                  Isi nama dan jabatan yang tampil kepada warga.
                </p>
              </div>
            </div>
            <div className="mt-7 space-y-5">
              <label className="block">
                <span className="text-sm font-semibold">Jenis personel *</span>
                <select value={form.personnel_type} onChange={(event) => change("personnel_type", event.target.value)} className="mt-2 w-full rounded-xl border bg-white px-3 py-3">
                  <option value="official">Perangkat Kelurahan</option>
                  <option value="pppk">PPPK</option>
                </select>
                <p className="mt-2 text-xs text-stone-500">PPPK ditampilkan pada bagian bawah struktur dan tetap dapat disusun dengan cara digeser.</p>
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Jabatan *</span>
                <input
                  required
                  value={form.position}
                  onChange={(e) => change("position", e.target.value)}
                  className="mt-2 w-full rounded-xl border px-3 py-3"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Nama lengkap</span>
                <input
                  value={form.name}
                  onChange={(e) => change("name", e.target.value)}
                  placeholder="Kosongkan jika belum tersedia"
                  className="mt-2 w-full rounded-xl border px-3 py-3"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">NIP</span>
                <input
                  value={form.nip}
                  onChange={(event) => change("nip", event.target.value)}
                  placeholder="Contoh: 19810101 200012 1 001"
                  className="mt-2 w-full rounded-xl border px-3 py-3"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Keterangan</span>
                <textarea
                  rows="4"
                  value={form.description}
                  onChange={(e) => change("description", e.target.value)}
                  placeholder="Contoh: Periode jabatan atau bidang pelayanan"
                  className="mt-2 w-full rounded-xl border p-3"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Atasan langsung</span>
                <select value={form.parent_id} onChange={(event) => change("parent_id", event.target.value)} className="mt-2 w-full rounded-xl border bg-white px-3 py-3">
                  <option value="">Tidak ada — posisi tertinggi</option>
                  {items.filter((item) => item.id !== editingId).map((item) => <option key={item.id} value={item.id}>{item.position} — {item.name || "Nama belum tersedia"}</option>)}
                </select>
                <p className="mt-2 text-xs text-stone-500">Pilihan ini menentukan garis hubungan pada struktur organisasi.</p>
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Foto</span>
                {(form.photo || form.image_url) && (
                  <img
                    src={form.photo ? URL.createObjectURL(form.photo) : `${API.replace(/\/api$/, "")}${form.image_url}`}
                    alt="Pratinjau foto"
                    className="mt-2 h-44 w-full rounded-xl object-cover object-top"
                  />
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const selected = event.target.files?.[0];
                    event.target.value = "";
                    if (selected) setCropSource(selected);
                  }}
                  className="mt-2 block w-full rounded-xl border border-dashed p-3 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-forest-900 file:px-3 file:py-2 file:font-bold file:text-white"
                />
                <p className="mt-2 text-xs text-stone-500">JPG, PNG, atau WEBP maksimal 5 MB. Setelah memilih foto, atur crop, zoom, dan posisinya.</p>
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Urutan tampil</span>
                <input
                  type="number"
                  min="0"
                  value={form.sort_order}
                  onChange={(e) => change("sort_order", Number(e.target.value))}
                  className="mt-2 w-full rounded-xl border px-3 py-3"
                />
              </label>
              <label className="flex items-center gap-3 rounded-xl bg-sage-50 p-4 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => change("is_active", e.target.checked)}
                />
                Tampilkan pada halaman pemerintahan
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-forest-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                <Save size={17} /> {saving ? "Menyimpan..." : "Simpan"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border px-5 py-3 text-sm font-bold"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
          <section>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-earth-500">
              Pemerintahan Kelurahan
            </p>
            <h2 className="mt-3 font-serif text-4xl text-forest-950">
              Perangkat kelurahan
            </h2>
            {items.length > 0 && <div className="mt-7"><div className="mb-3 flex items-center justify-between gap-4"><div><h3 className="font-bold text-forest-950">Susun bagan organisasi</h3><p className="mt-1 text-xs text-stone-500">Geser kartu ke posisi yang diinginkan. Posisi tersimpan otomatis saat dilepas.</p></div></div><OrganizationChart officials={items} editable onMove={move}/></div>}
            <div className="mt-7 space-y-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col gap-4 rounded-2xl border border-sage-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sage-100 text-forest-900">
                      <Users size={18} />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-earth-500">
                        {item.personnel_type === "pppk" ? "PPPK · " : ""}{item.position}
                      </p>
                      <h3 className="mt-1 font-bold text-forest-950">
                        {item.name || "Nama belum tersedia"}
                      </h3>
                      {item.nip && <p className="mt-1 font-mono text-xs text-stone-500">NIP {item.nip}</p>}
                      {item.description && (
                        <p className="mt-1 text-sm text-stone-500">
                          {item.description}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-stone-400">
                        Urutan {item.sort_order} ·{" "}
                        {item.is_active ? "Ditampilkan" : "Disembunyikan"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => edit(item)}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700"
                    >
                      <Trash2 size={14} /> Hapus
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
      {cropSource && <ImageCropper file={cropSource} onCancel={() => setCropSource(null)} onApply={(photo) => { change("photo", photo); setCropSource(null); }}/>}
    </main>
  );
}
