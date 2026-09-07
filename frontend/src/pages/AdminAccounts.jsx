import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Edit2, LoaderCircle, Plus, Save, Users, X } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const empty = { username: "", display_name: "", rw_number: "", whatsapp_number: "", password: "", is_active: true };

export default function AdminAccounts() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch(`${API}/admin/accounts/rw`, { credentials: "include" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message);
    setItems(body.data);
  }, []);
  useEffect(() => { load().catch((error) => setNotice(error.message)); }, [load]);
  function openForm(account = null) {
    setFormError("");
    setForm(account ? { ...account, password: "" } : { ...empty });
  }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setFormError("");
    try {
      const response = await fetch(`${API}/admin/accounts/rw${form.id ? `/${form.id}` : ""}`, { method: form.id ? "PUT" : "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setNotice(body.message); setForm(null); await load();
    } catch (error) { setFormError(error.message || "Akun belum berhasil disimpan"); }
    finally { setSaving(false); }
  }
  const modal = form && <div className="fixed inset-0 z-[5000] grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
    <form onSubmit={submit} className="my-8 w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex justify-between"><h3 className="font-bold text-forest-950">{form.id ? "Edit" : "Buat"} akun RW</h3><button type="button" aria-label="Tutup" onClick={() => setForm(null)}><X size={20} /></button></div>
      {formError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{formError}</p>}
      <label className="block text-xs font-bold">Nama akun<input required value={form.display_name || ""} onChange={(event) => setForm({ ...form, display_name: event.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label>
      <label className="block text-xs font-bold">Username<input required pattern="[a-z0-9._-]+" title="Gunakan huruf kecil, angka, titik, tanda hubung, atau garis bawah" value={form.username || ""} onChange={(event) => setForm({ ...form, username: event.target.value.toLowerCase() })} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label>
      <label className="block text-xs font-bold">Nomor RW<input required inputMode="numeric" pattern="[0-9]{1,3}" maxLength={3} title="Nomor RW harus 1 sampai 3 digit" value={form.rw_number || ""} onChange={(event) => setForm({ ...form, rw_number: event.target.value.replace(/\D/g, "").slice(0, 3) })} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label>
      <label className="block text-xs font-bold">Nomor WhatsApp aktif<input required type="tel" inputMode="tel" placeholder="Contoh: 081234567890" pattern="(?:\+62|62|0)8[0-9]{7,12}" title="Gunakan nomor Indonesia aktif, misalnya 081234567890" value={form.whatsapp_number || ""} onChange={(event) => setForm({ ...form, whatsapp_number: event.target.value.replace(/[^\d+]/g, "").slice(0, 16) })} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label>
      <label className="block text-xs font-bold">Kata sandi {form.id && "baru (opsional)"}<input required={!form.id} type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label>
      {form.id && <label className="flex gap-2 text-sm"><input type="checkbox" checked={Boolean(form.is_active)} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Akun aktif</label>}
      <button disabled={saving} className="flex w-full justify-center gap-2 rounded-xl bg-forest-900 py-3 text-sm font-bold text-white">{saving ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />} Simpan akun</button>
    </form>
  </div>;
  return <div className="space-y-5">
    {notice && <p className="rounded-xl border border-sage-200 bg-white p-4 text-sm font-semibold text-forest-900">{notice}</p>}
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4"><div><h2 className="flex items-center gap-2 font-bold text-forest-950"><Users size={19} /> Akun RW</h2><p className="mt-1 text-xs text-stone-500">Akun RW hanya dapat mengajukan dan memantau RUTILAHU miliknya.</p></div><button onClick={() => openForm()} className="flex items-center gap-2 rounded-xl bg-forest-900 px-4 py-2.5 text-xs font-bold text-white"><Plus size={16} /> Tambah akun</button></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-stone-500"><th className="p-3">RW</th><th className="p-3">Nama</th><th className="p-3">Username</th><th className="p-3">WhatsApp</th><th className="p-3">Status</th><th className="p-3">Aksi</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="p-3 font-bold">RW {item.rw_number}</td><td className="p-3">{item.display_name}</td><td className="p-3 font-mono text-xs">{item.username}</td><td className="p-3 whitespace-nowrap">{item.whatsapp_number || "-"}</td><td className="p-3">{item.is_active ? "Aktif" : "Nonaktif"}</td><td className="p-3"><button aria-label={`Edit ${item.display_name}`} onClick={() => openForm(item)} className="rounded-lg border p-2"><Edit2 size={15} /></button></td></tr>)}</tbody></table></div>
    </section>
    {modal && createPortal(modal, document.body)}
  </div>;
}
