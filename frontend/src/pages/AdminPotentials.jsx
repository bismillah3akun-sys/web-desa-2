import { useEffect, useMemo, useState } from "react";
import { Edit3, ImagePlus, MapPin, Plus, Save, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useConfirm } from "@/components/confirmContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const mediaUrl = (value) => value?.startsWith("/uploads/")
  ? `${new URL(API, window.location.origin).origin}${value}` : value;
const empty = { name: "", category: "", address: "", description: "", latitude: "-6.9467000", longitude: "107.5982000", image_url: "" };

export default function AdminPotentials() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [image, setImage] = useState(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const preview = useMemo(() => image ? URL.createObjectURL(image) : mediaUrl(form.image_url), [image, form.image_url]);

  useEffect(() => () => { if (image && preview?.startsWith("blob:")) URL.revokeObjectURL(preview); }, [image, preview]);
  useEffect(() => {
    fetch(`${API}/admin/potentials`, { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) return navigate("/admin/login", { replace: true });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message);
        setItems(body.data || []);
      })
      .catch((error) => setNotice(error.message || "Data potensi belum dapat dimuat"));
  }, [navigate]);

  function change(name, value) { setForm((current) => ({ ...current, [name]: value })); }
  function reset() { setForm(empty); setEditingId(null); setImage(null); }
  function edit(item) {
    setEditingId(item.id); setImage(null);
    setForm({ name: item.name || "", category: item.category || "", address: item.address || "", description: item.description || "", latitude: item.latitude ?? "", longitude: item.longitude ?? "", image_url: item.image_url || "" });
    document.getElementById("potential-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit(event) {
    event.preventDefault(); setSaving(true); setNotice("");
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => key !== "image_url" && payload.append(key, value));
    if (image) payload.append("image", image);
    try {
      const response = await fetch(`${API}/admin/potentials${editingId ? `/${editingId}` : ""}`, { method: editingId ? "PUT" : "POST", credentials: "include", body: payload });
      const body = await response.json();
      if (response.status === 401) return navigate("/admin/login", { replace: true });
      if (!response.ok) throw new Error(body.message);
      setItems((current) => editingId ? current.map((item) => item.id === editingId ? body.data : item) : [body.data, ...current]);
      setNotice(body.message); reset();
    } catch (error) { setNotice(error.message || "Potensi desa belum dapat disimpan"); }
    finally { setSaving(false); }
  }

  function remove(item) {
    confirm({ title: "Hapus potensi desa?", itemName: item.name, description: "Data dan gambar potensi akan dihapus permanen.", onConfirm: async () => {
      const response = await fetch(`${API}/admin/potentials/${item.id}`, { method: "DELETE", credentials: "include" });
      const body = await response.json(); if (!response.ok) throw new Error(body.message);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      if (editingId === item.id) reset(); setNotice(body.message);
    }});
  }

  return <main className="min-h-screen bg-sage-50">
    {notice && <div role="status" className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border bg-white px-5 py-4 text-sm font-semibold shadow-xl">{notice}</div>}
    <div className="mx-auto max-w-7xl px-5 py-10">
      <div className="grid gap-7 lg:grid-cols-[.82fr_1.18fr]">
        <form id="potential-form" onSubmit={submit} className="h-fit rounded-2xl border border-sage-200 bg-white p-6 md:p-8">
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-forest-900 text-white">{editingId ? <Edit3 size={20}/> : <Plus size={20}/>}</span><div><h1 className="font-serif text-2xl text-forest-950">{editingId ? "Edit potensi desa" : "Tambah potensi desa"}</h1><p className="text-sm text-stone-500">Data ini tampil di landing page, halaman potensi, dan WebGIS.</p></div></div>
          <div className="mt-7 space-y-4">
            <Field label="Nama potensi *" value={form.name} onChange={(v) => change("name", v)} required/>
            <Field label="Kategori" value={form.category} onChange={(v) => change("category", v)} placeholder="Contoh: UMKM, Kuliner, Kerajinan"/>
            <Field label="Alamat" value={form.address} onChange={(v) => change("address", v)}/>
            <label className="block"><span className="text-sm font-semibold">Deskripsi</span><textarea rows="4" value={form.description} onChange={(e) => change("description", e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Latitude *" type="number" step="any" value={form.latitude} onChange={(v) => change("latitude", v)} required/><Field label="Longitude *" type="number" step="any" value={form.longitude} onChange={(v) => change("longitude", v)} required/></div>
            <label className="block"><span className="text-sm font-semibold">Gambar</span>{preview && <img src={preview} alt="Pratinjau potensi" className="mt-2 h-44 w-full rounded-xl object-cover"/>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImage(e.target.files?.[0] || null)} className="mt-2 block w-full rounded-xl border border-dashed p-3 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-forest-900 file:px-3 file:py-2 file:font-bold file:text-white"/><p className="mt-2 text-xs text-stone-500">JPG, PNG, atau WEBP maksimal 5 MB.</p></label>
          </div>
          <div className="mt-6 flex gap-3"><button disabled={saving} className="flex items-center gap-2 rounded-xl bg-forest-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><Save size={17}/>{saving ? "Menyimpan..." : "Simpan"}</button>{editingId && <button type="button" onClick={reset} className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold"><X size={16}/>Batal</button>}</div>
        </form>
        <section><p className="text-xs font-bold uppercase tracking-[.2em] text-earth-500">Konten Wilayah</p><h2 className="mt-3 font-serif text-4xl text-forest-950">Potensi desa</h2><div className="mt-7 grid gap-4 sm:grid-cols-2">
          {items.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-sage-200 bg-white">{item.image_url ? <img src={mediaUrl(item.image_url)} alt={item.name} className="h-40 w-full object-cover"/> : <div className="grid h-40 place-items-center bg-sage-100 text-forest-900"><ImagePlus size={30}/></div>}<div className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-earth-500">{item.category || "Potensi"}</p><h3 className="mt-2 text-lg font-bold text-forest-950">{item.name}</h3><p className="mt-2 line-clamp-2 text-sm text-stone-500">{item.description || "Belum ada deskripsi"}</p><p className="mt-3 flex items-start gap-2 text-xs text-stone-400"><MapPin size={14} className="shrink-0"/>{item.address || `${item.latitude}, ${item.longitude}`}</p><div className="mt-5 flex gap-2"><button type="button" onClick={() => edit(item)} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"><Edit3 size={14}/>Edit</button><button type="button" onClick={() => remove(item)} className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700"><Trash2 size={14}/>Hapus</button></div></div></article>)}
          {!items.length && <p className="col-span-full rounded-2xl border border-dashed p-10 text-center text-sm text-stone-500">Belum ada potensi desa.</p>}
        </div></section>
      </div>
    </div>
  </main>;
}

function Field({ label, value, onChange, type = "text", ...props }) {
  return <label className="block"><span className="text-sm font-semibold">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3" {...props}/></label>;
}
