import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  Download,
  FileText,
  Home,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Mail,
  MapPinned,
  Menu,
  Newspaper,
  RefreshCw,
  Settings2,
  Users,
  UserCog,
  X,
} from "lucide-react";
import Brand from "@/components/VillageBrand";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const navigation = [
  [
    "dashboard",
    "Ringkasan",
    LayoutDashboard,
    "Aktivitas dan informasi terkini",
  ],
  [
    "rutilahu",
    "Data RUTILAHU",
    Home,
    "Pendataan, verifikasi, dan monitoring WebGIS RUTILAHU",
  ],
  ["accounts", "Akun RW", UserCog, "Kelola akun dan akses pengurus RW"],
  [
    "applications",
    "Pengajuan warga",
    FileText,
    "Tinjau dan proses permohonan warga",
  ],
  ["services", "Layanan kelurahan", Settings2, "Atur layanan dan persyaratannya"],
  ["news", "Kabar & informasi", Newspaper, "Kelola berita untuk masyarakat"],
  ["potentials", "Potensi kelurahan", MapPinned, "Kelola potensi, gambar, dan lokasi"],
  ["guestbook", "Buku tamu", BookOpen, "Catatan kunjungan ke kantor kelurahan"],
  ["contacts", "Pesan warga", Mail, "Baca dan tindak lanjuti pesan masuk"],
  ["officials", "Perangkat kelurahan", Users, "Kelola struktur pemerintahan"],
  [
    "profile",
    "Profil & penduduk",
    Building2,
    "Identitas, wilayah, dan demografi kelurahan",
  ],
];
const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }).format(new Date(value)) + " WIB"
    : "—";

export default function AdminWorkspace({ panels, initialPanel = "dashboard" }) {
  const [active, setActive] = useState(initialPanel);
  const [visited, setVisited] = useState([initialPanel]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();
  const load = useCallback(async () => {
    try {
      const [session, dashboard] = await Promise.all([
        fetch(`${API}/auth/me`, { credentials: "include" }),
        fetch(`${API}/admin/dashboard`, { credentials: "include" }),
      ]);
      if (session.status === 401 || dashboard.status === 401) {
        navigate("/admin/login", { replace: true });
        return;
      }
      if (!session.ok || !dashboard.ok)
        throw new Error("Dashboard belum dapat dimuat. Silakan coba lagi.");
      setAdmin((await session.json()).data);
      setSummary((await dashboard.json()).data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);
  useEffect(() => {
    void load();
  }, [load]);
  function reload() {
    setLoading(true);
    void load();
  }
  function selectPanel(key) {
    setActive(key);
    setVisited((current) =>
      current.includes(key) ? current : [...current, key],
    );
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    if (key === "dashboard") reload();
  }
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const response = await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok)
        throw new Error("Belum dapat keluar. Silakan coba lagi.");
      navigate("/admin/login", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoggingOut(false);
    }
  }
  const counts = summary?.counts || {};
  const visibleNavigation = admin?.role === "rw" ? navigation.filter(([key]) => ["dashboard", "rutilahu"].includes(key)) : navigation;
  const selected = visibleNavigation.find(([key]) => key === active) || visibleNavigation[0];
  const PageIcon = selected[2];
  const stats = [
    [
      "RUTILAHU Terdata",
      counts.rutilahu_count || 0,
      Home,
      "rutilahu",
      counts.unverified_rutilahu_count > 0
        ? `${counts.unverified_rutilahu_count} perlu verifikasi`
        : "Pemetaan & monitoring",
    ],
    [
      "Pengajuan aktif",
      counts.active_application_count || 0,
      FileText,
      "applications",
      "Menunggu tindak lanjut",
    ],
    [
      "Tamu baru",
      counts.new_guestbook_count || 0,
      BookOpen,
      "guestbook",
      "Kunjungan belum ditinjau",
    ],
    [
      "Berita",
      counts.news_count || 0,
      Newspaper,
      "news",
      "Konten dalam pengelolaan",
    ],
  ];
  if (admin?.role === "rw") stats.splice(1);
  if (!admin)
    return (
      <div className="admin-loading">
        <LayoutDashboard size={32} />
        <h1>Menyiapkan ruang kerja Anda</h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button type="button" onClick={reload}>
              Coba lagi
            </button>
          </>
        ) : (
          <LoaderCircle className="animate-spin" size={22} />
        )}
      </div>
    );
  return (
    <div className="admin-workspace">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <Brand />
          <span>Ruang administrasi</span>
        </div>
        <p className="admin-sidebar__label">Ruang kerja</p>
        <nav aria-label="Menu administrasi">
          {visibleNavigation.map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              aria-current={active === key ? "page" : undefined}
              onClick={() => selectPanel(key)}
            >
              <span className={`admin-nav-icon admin-nav-icon--${key}`}><Icon size={17} strokeWidth={1.8} /></span>
              <span>{label}</span>
              {key === "rutilahu" && counts.unverified_rutilahu_count > 0 && (
                <small>{counts.unverified_rutilahu_count}</small>
              )}
              {key === "applications" &&
                counts.active_application_count > 0 && (
                  <small>{counts.active_application_count}</small>
                )}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar__bottom">
          <Link to="/" target="_blank" rel="noreferrer">
            Lihat website kelurahan <ArrowUpRight size={17} />
          </Link>
          <button type="button" className="admin-logout" onClick={logout} disabled={loggingOut}>
            {loggingOut ? <LoaderCircle size={19} className="animate-spin" /> : <LogOut size={19} />}
            <span>{loggingOut ? "Sedang keluar…" : "Keluar"}</span>
          </button>
        </div>
      </aside>
      <div className="admin-workspace__body">
        <header className="admin-topbar">
          <div className="admin-topbar__title">
            <button
              className="admin-mobile-toggle"
              type="button"
              aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={mobileOpen}
              aria-controls="admin-mobile-nav"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span className="admin-topbar__page-icon" aria-hidden="true">
              <PageIcon size={22} strokeWidth={1.7} />
            </span>
            <div className="admin-topbar__heading">
              <small>Kelurahan KebonLega <span> / Administrasi</span></small>
              <p>{selected[1]}</p>
            </div>
          </div>
          <div className="admin-topbar__actions">
            <Link className="admin-topbar__website" to="/" target="_blank" rel="noreferrer">
              Lihat website <ArrowUpRight size={16} />
            </Link>
            <div className="admin-topbar__account" role="group" aria-label={`Akun ${admin.displayName || "Administrator"}, ${admin.role}`}>
              <span className="admin-avatar" aria-hidden="true">
                {(admin.displayName || "Administrator").trim().split(/\s+/).slice(0, 2).map((word) => word.charAt(0)).join("").toUpperCase()}
              </span>
              <div>
                <b>{admin.displayName || "Administrator"}</b>
                <small>{admin.role} <span>· Pengelola kelurahan</span></small>
              </div>
            </div>
          </div>
        </header>
        {mobileOpen && (
          <nav
            id="admin-mobile-nav"
            className="admin-mobile-nav"
            aria-label="Menu administrasi seluler"
          >
            {visibleNavigation.map(([key, label, Icon]) => (
              <button
                type="button"
                key={key}
                aria-current={active === key ? "page" : undefined}
                onClick={() => selectPanel(key)}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
            <button type="button" className="admin-logout" onClick={logout} disabled={loggingOut}>
              {loggingOut ? <LoaderCircle size={19} className="animate-spin" /> : <LogOut size={19} />}
              <span>{loggingOut ? "Sedang keluar…" : "Keluar"}</span>
            </button>
          </nav>
        )}
        <div className="admin-content">
          {error && (
            <p role="alert" className="admin-error">
              {error}
            </p>
          )}
          <div hidden={active !== "dashboard"}>
            <section className="admin-welcome">
              <div>
                <span className="admin-eyebrow">{admin.role === "rw" ? `Ruang kerja RW ${admin.rwNumber}` : "Ringkasan kelurahan"}</span>
                <h1>{admin.role === "rw" ? "Kelola pengajuan RUTILAHU." : "Selamat datang kembali."}</h1>
                <p>
                  {admin.role === "rw" ? "Ajukan rumah yang perlu ditangani dan pantau progres verifikasi dari Kelurahan." : <>Semua aktivitas kelurahan, dalam satu ruang kerja.<br />Pantau informasi dan lanjutkan pelayanan hari ini.</>}
                </p>
                <button
                  type="button"
                  onClick={() => selectPanel(admin.role === "rw" ? "rutilahu" : "applications")}
                >
                  {admin.role === "rw" ? "Buka pengajuan RUTILAHU" : "Tinjau pengajuan"} <ArrowRight size={17} />
                </button>
              </div>
              <div className="admin-welcome__aside">
                <span className="admin-welcome__date">
                  {new Intl.DateTimeFormat("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "Asia/Jakarta",
                  }).format(new Date())}
                </span>
                <div className="admin-welcome__focus">
                  <span className="admin-welcome__focus-icon">{admin.role === "rw" ? <Home size={22} strokeWidth={1.6} /> : <FileText size={22} strokeWidth={1.6} />}</span>
                  <div><strong>{Number(admin.role === "rw" ? counts.rutilahu_count || 0 : counts.active_application_count || 0).toLocaleString("id-ID")}</strong><span>{admin.role === "rw" ? "pengajuan RUTILAHU" : "pengajuan aktif"}</span></div>
                </div>
                <p>{admin.role === "rw" ? (counts.rutilahu_count > 0 ? "Pengajuan Anda sedang dipantau Kelurahan." : "Belum ada pengajuan RUTILAHU dari RW ini.") : (counts.active_application_count > 0 ? "Siap untuk Anda tindak lanjuti." : "Belum ada pengajuan yang perlu ditindaklanjuti.")}</p>
              </div>
            </section>
            <div className="admin-section-heading">
              <div>
                <h2>{admin.role === "rw" ? "Ringkasan pengajuan" : "Aktivitas kelurahan"}</h2>
                <p>{admin.role === "rw" ? `Data RUTILAHU yang diajukan oleh RW ${admin.rwNumber}.` : "Ringkasan data dan aktivitas website kelurahan."}</p>
              </div>
              <button type="button" disabled={loading} onClick={reload}>
                <RefreshCw
                  size={15}
                  className={loading ? "animate-spin" : ""}
                />
                {loading ? "Memuat…" : "Perbarui data"}
              </button>
            </div>
            <section className={admin.role === "rw" ? "admin-stats !grid-cols-1 max-w-sm" : "admin-stats"} aria-label="Ringkasan aktivitas">
              {stats.map(([label, value, Icon, key, caption]) => (
                <button
                  type="button"
                  key={key}
                  className="admin-stat"
                  onClick={() => selectPanel(key)}
                >
                  <div>
                    <span className="admin-stat__icon">
                      <Icon size={21} />
                    </span>
                    <ArrowUpRight size={17} />
                  </div>
                  <p>{label}</p>
                  <strong>{Number(value).toLocaleString("id-ID")}</strong>
                  <small>{caption}</small>
                </button>
              ))}
            </section>
            <section className="admin-quick">
              <div>
                <h2>Akses cepat</h2>
                <p>{admin.role === "rw" ? "Buat pengajuan baru atau pantau status pengajuan." : "Kelola kebutuhan harian kelurahan."}</p>
              </div>
              <button type="button" onClick={() => selectPanel("rutilahu")}>
                <Home size={18} />
                Data RUTILAHU
                <ArrowRight size={16} />
              </button>
              {admin.role !== "rw" && <><button type="button" onClick={() => selectPanel("news")}>
                <Newspaper size={18} />
                Kelola berita
                <ArrowRight size={16} />
              </button>
              <button type="button" onClick={() => selectPanel("services")}>
                <Settings2 size={18} />
                Atur layanan
                <ArrowRight size={16} />
              </button>
              <a href={`${API}/admin/export.xlsx`}>
                <Download size={18} />
                Ekspor Excel
                <ArrowRight size={16} />
              </a>
              </>}
            </section>
            {admin.role !== "rw" && <section className="admin-activity-grid">
              <Activity
                title="Kunjungan terbaru"
                subtitle="Lima kunjungan terakhir ke kantor kelurahan"
                icon={BookOpen}
                items={summary?.recentGuestbook || []}
                empty="Belum ada kunjungan tercatat."
                onView={() => selectPanel("guestbook")}
              />
              <Activity
                title="Pesan warga"
                subtitle="Pesan terbaru dari halaman kontak"
                icon={Mail}
                items={summary?.recentContacts || []}
                empty="Belum ada pesan masuk."
                id="admin-contacts"
                onView={() => selectPanel("contacts")}
              />
            </section>}
            <footer className="admin-overview-footer">
              <span>{admin.role === "rw" ? `Kelurahan KebonLega · Akun RW ${admin.rwNumber}` : "Kelurahan KebonLega · Ruang administrasi"}</span>
              {admin.role !== "rw" && <span>
                <MapPinned size={14} />
                {counts.facility_count || 0} fasilitas ·{" "}
                {counts.potential_count || 0} potensi kelurahan
              </span>}
            </footer>
          </div>
          {visited
            .filter((key) => key !== "dashboard")
            .map((key) => {
              const Panel = panels[key];
              return Panel ? (
                <div key={key} hidden={active !== key}>
                  <div className="admin-module-heading">
                    <span className="admin-eyebrow">Pengelolaan kelurahan</span>
                    <h1>{navigation.find(([id]) => id === key)?.[1]}</h1>
                    <p>{navigation.find(([id]) => id === key)?.[3]}</p>
                  </div>
                  <div className="admin-embedded">
                    <Panel onDataChanged={reload} admin={admin} />
                  </div>
                </div>
              ) : null;
            })}
        </div>
      </div>
    </div>
  );
}

function Activity({ title, subtitle, icon: Icon, items, empty, onView, id }) {
  return (
    <article className="admin-activity" id={id}>
      <header>
        <span className="admin-activity__icon">
          <Icon size={20} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {onView && (
          <button
            type="button"
            onClick={onView}
            aria-label={`Lihat semua ${title.toLowerCase()}`}
          >
            <ArrowUpRight size={19} />
          </button>
        )}
      </header>
      <div>
        {items.length ? (
          items.map((item) => (
            <div className="admin-activity__row" key={item.id}>
              <span className="admin-initial">
                {item.name?.charAt(0)?.toUpperCase() || "W"}
              </span>
              <div>
                <h3>{item.name}</h3>
                <p>{item.visit_purpose || item.subject}</p>
                <small>{dateTime(item.created_at)}</small>
              </div>
              <span className="admin-status" data-status={item.status}>{item.status}</span>
            </div>
          ))
        ) : (
          <div className="admin-empty">
            <Icon size={30} />
            <p>{empty}</p>
          </div>
        )}
      </div>
    </article>
  );
}
