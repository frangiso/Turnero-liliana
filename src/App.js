import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection, onSnapshot, addDoc, doc, updateDoc,
  serverTimestamp, query, orderBy
} from "firebase/firestore";

const HORARIOS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "14:00", "14:30", "15:00", "15:30", "16:00",
  "16:30", "17:00", "17:30", "18:00"
];

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const PSICOLOGA_PASSWORD = "Liliana2024";

function getNextDates() {
  const dates = [];
  const today = new Date();
  let d = new Date(today);
  while (dates.length < 10) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) {
      const label = DIAS[dow - 1];
      const iso = d.toISOString().slice(0, 10);
      const [y, m, day] = iso.split("-");
      dates.push({ iso, label, display: `${label} ${day}/${m}/${y}` });
    }
  }
  return dates;
}

export default function App() {
  const [vista, setVista] = useState("home");
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loginInput, setLoginInput] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [psyLoggedIn, setPsyLoggedIn] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "turnos"), orderBy("creadoEn", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTurnos(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = () => {
    if (loginInput === PSICOLOGA_PASSWORD) {
      setPsyLoggedIn(true);
      setLoginError(false);
      setVista("psicologa");
    } else {
      setLoginError(true);
    }
  };

  const actualizarTurno = async (id, estado) => {
    await updateDoc(doc(db, "turnos", id), { estado });
  };

  const agregarTurno = async (nuevo) => {
    await addDoc(collection(db, "turnos"), {
      ...nuevo,
      creadoEn: serverTimestamp(),
    });
  };

  if (loading) return (
    <div style={styles.loadingScreen}>
      <div style={styles.loadingSpinner} />
      <p style={{ color: "#3a8f6a", marginTop: 16, fontFamily: "Georgia, serif" }}>Cargando...</p>
    </div>
  );

  return (
    <div style={styles.root}>
      <div style={styles.bgBlob1} />
      <div style={styles.bgBlob2} />

      {vista === "home" && (
        <HomeView
          onPaciente={() => setVista("paciente")}
          onPsicologa={() => setVista("login")}
        />
      )}
      {vista === "login" && (
        <LoginView
          value={loginInput}
          onChange={setLoginInput}
          onLogin={handleLogin}
          error={loginError}
          onBack={() => { setVista("home"); setLoginInput(""); setLoginError(false); }}
        />
      )}
      {vista === "paciente" && (
        <PacienteView
          turnos={turnos}
          onAgregar={agregarTurno}
          onBack={() => setVista("home")}
        />
      )}
      {vista === "psicologa" && psyLoggedIn && (
        <PsicologaView
          turnos={turnos}
          onActualizar={actualizarTurno}
          onBack={() => { setVista("home"); setPsyLoggedIn(false); }}
        />
      )}
    </div>
  );
}

function HomeView({ onPaciente, onPsicologa }) {
  return (
    <div style={styles.centered}>
      <div style={styles.homeCard}>
        <div style={styles.logoRing}>
          <span style={styles.logoEmoji}>🌿</span>
        </div>
        <h1 style={styles.heroTitle}>Consultorio</h1>
        <p style={styles.heroSubtitle}>Lic. Liliana Gómez</p>
        <p style={styles.heroDes}>Psicóloga Clínica</p>
        <div style={styles.dividerLine} />
        <div style={styles.noticeBanner}>
          ⚠️ Los turnos deben ser previamente aprobados por la psicóloga
        </div>
        <p style={styles.heroInvite}>¿Cómo querés ingresar?</p>
        <div style={styles.homeButtons}>
          <button style={styles.btnPrimary} onClick={onPaciente}>
            <span>📅</span> Reservar turno
          </button>
          <button style={styles.btnSecondary} onClick={onPsicologa}>
            <span>🔐</span> Acceso profesional
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginView({ value, onChange, onLogin, error, onBack }) {
  return (
    <div style={styles.centered}>
      <div style={{ ...styles.homeCard, maxWidth: 360 }}>
        <button style={styles.backBtn} onClick={onBack}>← Volver</button>
        <div style={{ ...styles.logoRing, background: "#e8f4f0" }}>
          <span style={styles.logoEmoji}>🔐</span>
        </div>
        <h2 style={styles.sectionTitle}>Acceso Profesional</h2>
        <p style={{ color: "#7a8f8a", marginBottom: 20, fontSize: 14 }}>
          Ingresá tu contraseña para ver la agenda
        </p>
        <input
          type="password"
          placeholder="Contraseña"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onLogin()}
          style={{ ...styles.input, textAlign: "center", letterSpacing: 4 }}
        />
        {error && <p style={{ color: "#e05c5c", fontSize: 13, marginTop: 6 }}>Contraseña incorrecta</p>}
        <button style={{ ...styles.btnPrimary, marginTop: 16, width: "100%" }} onClick={onLogin}>
          Ingresar
        </button>
      </div>
    </div>
  );
}

function PacienteView({ turnos, onAgregar, onBack }) {
  const [step, setStep] = useState(1);
  const [fecha, setFecha] = useState(null);
  const [hora, setHora] = useState(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [confirmado, setConfirmado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const dates = getNextDates();

  const ocupados = turnos
    .filter(t => t.estado !== "rechazado")
    .map(t => `${t.fecha}|${t.hora}`);

  const isOcupado = (f, h) => ocupados.includes(`${f}|${h}`);

  const handleReservar = async () => {
    if (!nombre.trim() || !telefono.trim()) return;
    setGuardando(true);
    const nuevo = {
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      fecha: fecha.iso,
      fechaDisplay: fecha.display,
      hora,
      estado: "pendiente",
      creadoEnTexto: new Date().toLocaleString("es-AR"),
    };
    await onAgregar(nuevo);
    setGuardando(false);
    setConfirmado(true);
  };

  if (confirmado) return (
    <div style={styles.centered}>
      <div style={{ ...styles.homeCard, maxWidth: 400, textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>✅</div>
        <h2 style={{ ...styles.sectionTitle, color: "#3a8f6f" }}>¡Turno solicitado!</h2>
        <div style={styles.confirmBox}>
          <p><strong>{nombre}</strong></p>
          <p>📅 {fecha.display} a las {hora}</p>
        </div>
        <p style={{ color: "#7a8f8a", fontSize: 14, marginTop: 12 }}>
          ⚠️ Tu turno está <strong>pendiente de aprobación</strong>. Los turnos deben ser previamente aprobados por la psicóloga, quien te contactará para confirmarlo.
        </p>
        <button style={{ ...styles.btnPrimary, marginTop: 20, width: "100%" }} onClick={onBack}>
          Volver al inicio
        </button>
      </div>
    </div>
  );

  return (
    <div style={styles.pageWrap}>
      <div style={styles.pageHeader}>
        <button style={styles.backBtn} onClick={onBack}>← Volver</button>
        <h2 style={styles.pageTitle}>Reservar turno</h2>
      </div>

      <div style={styles.stepsBar}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ ...styles.stepDot, ...(step >= s ? styles.stepDotActive : {}) }}>
            {s}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div style={styles.stepContent}>
          <h3 style={styles.stepLabel}>Elegí un día disponible</h3>
          <div style={styles.dateGrid}>
            {dates.map(d => (
              <button
                key={d.iso}
                style={{ ...styles.dateBtn, ...(fecha?.iso === d.iso ? styles.dateBtnActive : {}) }}
                onClick={() => { setFecha(d); setHora(null); }}
              >
                <span style={{ fontSize: 11, opacity: 0.7 }}>{d.label}</span>
                <span style={{ fontSize: 18, fontWeight: 700 }}>{d.iso.slice(8)}/{d.iso.slice(5, 7)}</span>
              </button>
            ))}
          </div>
          {fecha && (
            <>
              <h3 style={{ ...styles.stepLabel, marginTop: 24 }}>Elegí un horario</h3>
              <div style={styles.horaGrid}>
                {HORARIOS.map(h => {
                  const ocu = isOcupado(fecha.iso, h);
                  return (
                    <button
                      key={h}
                      disabled={ocu}
                      style={{
                        ...styles.horaBtn,
                        ...(hora === h ? styles.horaBtnActive : {}),
                        ...(ocu ? styles.horaBtnOcupado : {})
                      }}
                      onClick={() => !ocu && setHora(h)}
                    >
                      {h}
                      {ocu && <span style={{ fontSize: 9, display: "block", opacity: 0.6 }}>Ocupado</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <button
            style={{ ...styles.btnPrimary, marginTop: 28, opacity: (!fecha || !hora) ? 0.4 : 1 }}
            disabled={!fecha || !hora}
            onClick={() => setStep(2)}
          >
            Continuar →
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={styles.stepContent}>
          <h3 style={styles.stepLabel}>Tus datos</h3>
          <label style={styles.label}>Nombre completo</label>
          <input style={styles.input} placeholder="Ej: María González" value={nombre} onChange={e => setNombre(e.target.value)} />
          <label style={styles.label}>Teléfono / WhatsApp</label>
          <input style={styles.input} placeholder="Ej: 11-4567-8901" value={telefono} onChange={e => setTelefono(e.target.value)} />
          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            <button style={styles.btnSecondary} onClick={() => setStep(1)}>← Atrás</button>
            <button
              style={{ ...styles.btnPrimary, flex: 1, opacity: (!nombre || !telefono) ? 0.4 : 1 }}
              disabled={!nombre || !telefono}
              onClick={() => setStep(3)}
            >
              Revisar →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={styles.stepContent}>
          <h3 style={styles.stepLabel}>Confirmá tu turno</h3>
          <div style={styles.confirmBox}>
            <div style={styles.confirmRow}><span>👤</span><span>{nombre}</span></div>
            <div style={styles.confirmRow}><span>📞</span><span>{telefono}</span></div>
            <div style={styles.confirmRow}><span>📅</span><span>{fecha?.display} — {hora}hs</span></div>
          </div>
          <p style={{ color: "#7a8f8a", fontSize: 13, marginTop: 12, textAlign: "center" }}>
            Al confirmar, tu turno quedará pendiente de aprobación por la profesional.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button style={styles.btnSecondary} onClick={() => setStep(2)}>← Atrás</button>
            <button
              style={{ ...styles.btnPrimary, flex: 1, opacity: guardando ? 0.6 : 1 }}
              disabled={guardando}
              onClick={handleReservar}
            >
              {guardando ? "Guardando..." : "✅ Confirmar turno"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PsicologaView({ turnos, onActualizar, onBack }) {
  const [filtro, setFiltro] = useState("pendiente");

  const pendientes = turnos.filter(t => t.estado === "pendiente");
  const filtrados = filtro === "todos" ? turnos : turnos.filter(t => t.estado === filtro);

  const estadoStyle = {
    pendiente: { bg: "#fff8e1", color: "#b07a00", label: "⏳ Pendiente" },
    aprobado: { bg: "#e6f7ef", color: "#2a7a50", label: "✅ Aprobado" },
    rechazado: { bg: "#fde8e8", color: "#b03030", label: "❌ Rechazado" },
  };

  return (
    <div style={styles.pageWrap}>
      <div style={styles.pageHeader}>
        <button style={styles.backBtn} onClick={onBack}>← Salir</button>
        <h2 style={styles.pageTitle}>Mi agenda</h2>
        {pendientes.length > 0 && (
          <div style={styles.badge}>{pendientes.length}</div>
        )}
      </div>

      {pendientes.length > 0 && (
        <div style={styles.alertBanner}>
          <span>🔔</span>
          <span>Tenés <strong>{pendientes.length}</strong> turno{pendientes.length > 1 ? "s" : ""} pendiente{pendientes.length > 1 ? "s" : ""} de revisión</span>
        </div>
      )}

      <div style={styles.filtroBar}>
        {["pendiente", "aprobado", "rechazado", "todos"].map(f => (
          <button
            key={f}
            style={{ ...styles.filtroBtn, ...(filtro === f ? styles.filtroBtnActive : {}) }}
            onClick={() => setFiltro(f)}
          >
            {f === "todos" ? "Todos" : estadoStyle[f]?.label}
          </button>
        ))}
      </div>

      <div style={styles.turnosList}>
        {filtrados.length === 0 && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 40 }}>📭</div>
            <p>No hay turnos en esta categoría</p>
          </div>
        )}
        {filtrados
          .slice()
          .sort((a, b) => (a.fecha || "").localeCompare(b.fecha || "") || (a.hora || "").localeCompare(b.hora || ""))
          .map(turno => {
            const es = estadoStyle[turno.estado] || estadoStyle.pendiente;
            return (
              <div key={turno.id} style={styles.turnoCard}>
                <div style={styles.turnoCardTop}>
                  <div>
                    <p style={styles.turnoPaciente}>{turno.nombre}</p>
                    <p style={styles.turnoFecha}>📅 {turno.fechaDisplay} · {turno.hora}hs</p>
                    <p style={styles.turnoTel}>📞 {turno.telefono}</p>
                  </div>
                  <div style={{ ...styles.estadoBadge, background: es.bg, color: es.color }}>
                    {es.label}
                  </div>
                </div>
                {turno.estado === "pendiente" && (
                  <div style={styles.actionRow}>
                    <button style={styles.btnAprobar} onClick={() => onActualizar(turno.id, "aprobado")}>
                      ✅ Aprobar
                    </button>
                    <button style={styles.btnRechazar} onClick={() => onActualizar(turno.id, "rechazado")}>
                      ❌ Rechazar
                    </button>
                  </div>
                )}
                <p style={styles.turnoMeta}>Solicitado el {turno.creadoEnTexto}</p>
              </div>
            );
          })}
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f0f7f4 0%, #e8f4ef 50%, #f5f0f7 100%)",
    fontFamily: "'Georgia', 'Times New Roman', serif",
    position: "relative",
    overflow: "hidden",
  },
  bgBlob1: {
    position: "fixed", top: -100, right: -100,
    width: 400, height: 400, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(120,200,160,0.15) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  bgBlob2: {
    position: "fixed", bottom: -120, left: -80,
    width: 350, height: 350, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(170,140,200,0.12) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  loadingScreen: {
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", background: "#f0f7f4",
  },
  loadingSpinner: {
    width: 36, height: 36, borderRadius: "50%",
    border: "3px solid #d0ede0",
    borderTop: "3px solid #3a8f6a",
    animation: "spin 1s linear infinite",
  },
  centered: {
    minHeight: "100vh", display: "flex", alignItems: "center",
    justifyContent: "center", padding: 20,
  },
  homeCard: {
    background: "rgba(255,255,255,0.88)",
    backdropFilter: "blur(12px)",
    borderRadius: 24, padding: "40px 36px",
    maxWidth: 440, width: "100%",
    textAlign: "center",
    boxShadow: "0 8px 40px rgba(60,100,80,0.12)",
    border: "1px solid rgba(120,180,150,0.2)",
  },
  logoRing: {
    width: 80, height: 80, borderRadius: "50%",
    background: "linear-gradient(135deg, #d4ede2, #e8d4f0)",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 20px",
    boxShadow: "0 4px 20px rgba(80,160,120,0.2)",
  },
  logoEmoji: { fontSize: 36 },
  heroTitle: { fontSize: 28, fontWeight: 700, color: "#2a4a3a", margin: "0 0 4px", letterSpacing: "-0.5px" },
  heroSubtitle: { fontSize: 18, color: "#3a7a5a", margin: "0 0 4px", fontStyle: "italic" },
  heroDes: { fontSize: 13, color: "#9aaba6", margin: 0 },
  dividerLine: {
    height: 1,
    background: "linear-gradient(90deg, transparent, #c0dcd0, transparent)",
    margin: "20px 0",
  },
  noticeBanner: {
    background: "#fff8e0", border: "1px solid #f0d080",
    borderRadius: 10, padding: "10px 14px",
    fontSize: 13, color: "#7a5500", marginBottom: 16, fontWeight: 500,
  },
  heroInvite: { color: "#5a7a6a", fontSize: 15, marginBottom: 20 },
  homeButtons: { display: "flex", flexDirection: "column", gap: 12 },
  btnPrimary: {
    background: "linear-gradient(135deg, #3a8f6a, #5aaf8a)",
    color: "#fff", border: "none", borderRadius: 12,
    padding: "14px 24px", fontSize: 15, cursor: "pointer",
    fontFamily: "inherit", fontWeight: 600,
    boxShadow: "0 4px 16px rgba(60,140,100,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  },
  btnSecondary: {
    background: "transparent", color: "#3a7a5a",
    border: "2px solid #b0d8c4", borderRadius: 12,
    padding: "12px 24px", fontSize: 14, cursor: "pointer",
    fontFamily: "inherit", fontWeight: 600,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  },
  pageWrap: { maxWidth: 560, margin: "0 auto", padding: "24px 16px 60px", minHeight: "100vh" },
  pageHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#2a4a3a", margin: 0, flex: 1 },
  backBtn: {
    background: "rgba(255,255,255,0.8)", border: "1px solid #d0e8dc",
    borderRadius: 8, padding: "6px 12px", cursor: "pointer",
    fontSize: 13, color: "#3a7a5a", fontFamily: "inherit",
  },
  stepsBar: { display: "flex", justifyContent: "center", gap: 8, marginBottom: 28 },
  stepDot: {
    width: 32, height: 32, borderRadius: "50%",
    background: "#e0ede8", color: "#9ab",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700,
  },
  stepDotActive: {
    background: "linear-gradient(135deg, #3a8f6a, #5aaf8a)",
    color: "#fff", boxShadow: "0 2px 10px rgba(60,140,100,0.3)",
  },
  stepContent: {
    background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)",
    borderRadius: 20, padding: 24,
    boxShadow: "0 4px 24px rgba(60,100,80,0.08)",
    border: "1px solid rgba(120,180,150,0.15)",
  },
  stepLabel: { fontSize: 16, fontWeight: 700, color: "#2a4a3a", marginBottom: 16, marginTop: 0 },
  dateGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8 },
  dateBtn: {
    background: "#f0f7f4", border: "2px solid transparent",
    borderRadius: 12, padding: "10px 8px", cursor: "pointer",
    textAlign: "center", display: "flex", flexDirection: "column", gap: 2,
    color: "#2a4a3a", fontFamily: "inherit",
  },
  dateBtnActive: { background: "#e0f0e8", borderColor: "#4a9f7a" },
  horaGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 6 },
  horaBtn: {
    background: "#f0f7f4", border: "2px solid transparent",
    borderRadius: 10, padding: "9px 4px", cursor: "pointer",
    fontSize: 13, fontWeight: 600, color: "#2a4a3a", fontFamily: "inherit",
  },
  horaBtnActive: { background: "#e0f0e8", borderColor: "#4a9f7a" },
  horaBtnOcupado: { background: "#f5f0f0", color: "#bbb", cursor: "not-allowed", opacity: 0.6 },
  label: { display: "block", fontSize: 13, color: "#5a7a6a", marginBottom: 6, marginTop: 14, fontWeight: 600 },
  input: {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: "1.5px solid #d0e8dc", fontSize: 14,
    fontFamily: "inherit", color: "#2a4a3a",
    background: "#fafdfc", outline: "none", boxSizing: "border-box",
  },
  confirmBox: { background: "#f0f7f4", borderRadius: 14, padding: 18, border: "1px solid #c0dcd0" },
  confirmRow: { display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid #e0ede8", fontSize: 14, color: "#2a4a3a" },
  alertBanner: {
    background: "linear-gradient(135deg, #fff8e0, #fff3cc)",
    border: "1px solid #f0d080", borderRadius: 12, padding: "12px 16px",
    display: "flex", gap: 10, alignItems: "center",
    fontSize: 14, color: "#7a5500", marginBottom: 16, fontWeight: 500,
  },
  badge: {
    background: "#e05c5c", color: "#fff", borderRadius: "50%",
    width: 22, height: 22, display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 12, fontWeight: 700,
  },
  filtroBar: { display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" },
  filtroBtn: {
    background: "rgba(255,255,255,0.7)", border: "1.5px solid #d0e8dc",
    borderRadius: 20, padding: "6px 12px", cursor: "pointer",
    fontSize: 12, color: "#5a7a6a", fontFamily: "inherit",
  },
  filtroBtnActive: { background: "#3a8f6a", color: "#fff", borderColor: "#3a8f6a", fontWeight: 600 },
  turnosList: { display: "flex", flexDirection: "column", gap: 12 },
  turnoCard: {
    background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)",
    borderRadius: 16, padding: 18,
    boxShadow: "0 2px 16px rgba(60,100,80,0.08)",
    border: "1px solid rgba(120,180,150,0.15)",
  },
  turnoCardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  turnoPaciente: { fontSize: 16, fontWeight: 700, color: "#2a4a3a", margin: "0 0 4px" },
  turnoFecha: { fontSize: 13, color: "#4a7a6a", margin: "0 0 2px" },
  turnoTel: { fontSize: 12, color: "#9aaba6", margin: 0 },
  estadoBadge: { borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 },
  actionRow: { display: "flex", gap: 8, marginTop: 14 },
  btnAprobar: {
    flex: 1, background: "linear-gradient(135deg, #3a8f6a, #5aaf8a)",
    color: "#fff", border: "none", borderRadius: 10,
    padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
  },
  btnRechazar: {
    flex: 1, background: "#fde8e8", color: "#c03030",
    border: "1.5px solid #f0c0c0", borderRadius: 10, padding: "10px",
    cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
  },
  turnoMeta: { fontSize: 11, color: "#c0cfc8", marginTop: 10, marginBottom: 0, textAlign: "right" },
  emptyState: { textAlign: "center", padding: "40px 20px", color: "#9aaba6", fontSize: 15 },
  sectionTitle: { fontSize: 20, fontWeight: 700, color: "#2a4a3a", margin: "12px 0 8px" },
};
