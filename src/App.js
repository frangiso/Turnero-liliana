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
const DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];
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
 const parts = iso.split("-");
 dates.push({ iso, label, display: label + " " + parts[2] + "/" + parts[1] + "/" + parts[0] });
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
 <p style={{ color: "#3a8f6a", marginTop: 16, fontFamily: "Georgia, serif" }}>Cargando.. </div>
 );
 return (
 <div style={styles.root}>
 <div style={styles.bgBlob1} />
 <div style={styles.bgBlob2} />
 {vista === "home" && <HomeView onPaciente={() => setVista("paciente")} onPsicologa={()  {vista === "login" && <LoginView value={loginInput} onChange={setLoginInput} onLogin={h {vista === "paciente" && <PacienteView turnos={turnos} onAgregar={agregarTurno} onBack= {vista === "psicologa" && psyLoggedIn && <PsicologaView turnos={turnos} onActualizar={a </div>
 );
}
function HomeView({ onPaciente, onPsicologa }) {
 return (
 <div style={styles.centered}>
 <div style={styles.homeCard}>
 <div style={styles.logoRing}><span style={styles.logoEmoji}> </span></div>
 <h1 style={styles.heroTitle}>Consultorio</h1>
 <p style={styles.heroSubtitle}>Lic. Liliana Gomez</p>
 <p style={styles.heroDes}>Psicologa Clinica</p>
 <div style={styles.dividerLine} />
 <div style={styles.noticeBanner}>Los turnos deben ser previamente aprobados por la ps <p style={styles.heroInvite}>Como queres ingresar?</p>
 <div style={styles.homeButtons}>
 <button style={styles.btnPrimary} onClick={onPaciente}>Reservar turno</button>
 <button style={styles.btnSecondary} onClick={onPsicologa}>Acceso profesional</butto </div>
 </div>
 </div>
 );
}
function LoginView({ value, onChange, onLogin, error, onBack }) {
 return (
 <div style={styles.centered}>
 <div style={{ ...styles.homeCard, maxWidth: 360 }}>
 <button style={styles.backBtn} onClick={onBack}>Volver</button>
 <div style={{ ...styles.logoRing, background: "#e8f4f0" }}><span style={styles.logoEm <h2 style={styles.sectionTitle}>Acceso Profesional</h2>
 <p style={{ color: "#7a8f8a", marginBottom: 20, fontSize: 14 }}>Ingresa tu contrasena <input type="password" placeholder="Contrasena" value={value} onChange={e => onChange {error && <p style={{ color: "#e05c5c", fontSize: 13, marginTop: 6 }}>Contrasena inco <button style={{ ...styles.btnPrimary, marginTop: 16, width: "100%" }} onClick={onLog </div>
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
 const ocupados = turnos.filter(t => t.estado !== "rechazado").map(t => t.fecha + "|" + t.ho
 const isOcupado = (f, h) => ocupados.includes(f + "|" + h);
 const handleReservar = async () => {
 if (!nombre.trim() || !telefono.trim()) return;
 setGuardando(true);
 await onAgregar({
 nombre: nombre.trim(),
 telefono: telefono.trim(),
 fecha: fecha.iso,
 fechaDisplay: fecha.display,
 hora,
 estado: "pendiente",
 creadoEnTexto: new Date().toLocaleString("es-AR"),
 });
 setGuardando(false);
 setConfirmado(true);
 };
 if (confirmado) return (
 <div style={styles.centered}>
 <div style={{ ...styles.homeCard, maxWidth: 400, textAlign: "center" }}>
 <div style={{ fontSize: 64, marginBottom: 12 }}> </div>
 <h2 style={{ ...styles.sectionTitle, color: "#3a8f6f" }}>Turno solicitado!</h2>
 <div style={styles.confirmBox}>
 <p><strong>{nombre}</strong></p>
 <p>{fecha.display} a las {hora}</p>
 </div>
 <p style={{ color: "#7a8f8a", fontSize: 14, marginTop: 12 }}>
 Tu turno esta pendiente de aprobacion. Los turnos deben ser previamente aprobados p </p>
 <button style={{ ...styles.btnPrimary, marginTop: 20, width: "100%" }} onClick={onBac </div>
 </div>
 );
 return (
 <div style={styles.pageWrap}>
 <div style={styles.pageHeader}>
 <button style={styles.backBtn} onClick={onBack}>Volver</button>
 <h2 style={styles.pageTitle}>Reservar turno</h2>
 </div>
 <div style={styles.stepsBar}>
 {[1, 2, 3].map(s => (
 <div key={s} style={{ ...styles.stepDot, ...(step >= s ? styles.stepDotActive : {}) ))}
 </div>
 {step === 1 && (
 <div style={styles.stepContent}>
 <h3 style={styles.stepLabel}>Elegi un dia disponible</h3>
 <div style={styles.dateGrid}>
 {dates.map(d => (
 <button key={d.iso} style={{ ...styles.dateBtn, ...(fecha && fecha.iso === d.is <span style={{ fontSize: 11, opacity: 0.7 }}>{d.label}</span>
 <span style={{ fontSize: 18, fontWeight: 700 }}>{d.iso.slice(8)}/{d.iso.slice </button>
 ))}
 </div>
 {fecha && (
 <div style={{ marginTop: 24 }}>
 <h3 style={styles.stepLabel}>Elegi un horario</h3>
 <div style={styles.horaGrid}>
 {HORARIOS.map(h => {
 const ocu = isOcupado(fecha.iso, h);
 return (
 <button key={h} disabled={ocu} style={{ ...styles.horaBtn, ...(hora === h {h}
 {ocu && <span style={{ fontSize: 9, display: "block", opacity: 0.6 }}>O </button>
 );
 })}
 </div>
 </div>
 )}
 <button style={{ ...styles.btnPrimary, marginTop: 28, opacity: (!fecha || !hora) ?  Continuar
 </button>
 </div>
 )}
 {step === 2 && (
 <div style={styles.stepContent}>
 <h3 style={styles.stepLabel}>Tus datos</h3>
 <label style={styles.label}>Nombre completo</label>
 <input style={styles.input} placeholder="Ej: Maria Gonzalez" value={nombre} onChang <label style={styles.label}>Telefono / WhatsApp</label>
 <input style={styles.input} placeholder="Ej: 11-4567-8901" value={telefono} onChang <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
 <button style={styles.btnSecondary} onClick={() => setStep(1)}>Atras</button>
 <button style={{ ...styles.btnPrimary, flex: 1, opacity: (!nombre || !telefono) ? </div>
 </div>
 )}
 {step === 3 && (
 <div style={styles.stepContent}>
 <h3 style={styles.stepLabel}>Confirma tu turno</h3>
 <div style={styles.confirmBox}>
 <div style={styles.confirmRow}><span> </span><span>{nombre}</span></div>
 <div style={styles.confirmRow}><span> </span><span>{telefono}</span></div>
 <div style={styles.confirmRow}><span> </span><span>{fecha ? fecha.display : ""}  </div>
 <p style={{ color: "#7a8f8a", fontSize: 13, marginTop: 12, textAlign: "center" }}>
 Al confirmar, tu turno quedara pendiente de aprobacion por la profesional.
 </p>
 <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
 <button style={styles.btnSecondary} onClick={() => setStep(2)}>Atras</button>
 <button style={{ ...styles.btnPrimary, flex: 1, opacity: guardando ? 0.6 : 1 }} d {guardando ? "Guardando..." : "Confirmar turno"}
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
 pendiente: { bg: "#fff8e1", color: "#b07a00", label: "Pendiente" },
 aprobado: { bg: "#e6f7ef", color: "#2a7a50", label: "Aprobado" },
 rechazado: { bg: "#fde8e8", color: "#b03030", label: "Rechazado" },
 };
 const enviarWhatsapp = (turno, aprobado) => {
 const tel = turno.telefono.replace(/\D/g, "");
 const msg = aprobado
 ? "Hola " + turno.nombre + ", le confirmamos su turno con la Lic. Liliana Gomez para el : "Hola " + turno.nombre + ", lamentablemente el turno solicitado para el " + turno.fec window.open("https://wa.me/54" + tel + "?text=" + encodeURIComponent(msg), "_blank");
 };
 return (
 <div style={styles.pageWrap}>
 <div style={styles.pageHeader}>
 <button style={styles.backBtn} onClick={onBack}>Salir</button>
 <h2 style={styles.pageTitle}>Mi agenda</h2>
 {pendientes.length > 0 && <div style={styles.badge}>{pendientes.length}</div>}
 </div>
 {pendientes.length > 0 && (
 <div style={styles.alertBanner}>
 <span>Tenes {pendientes.length} turno{pendientes.length > 1 ? "s" : ""} pendiente{p </div>
 )}
 <div style={styles.filtroBar}>
 {["pendiente", "aprobado", "rechazado", "todos"].map(f => (
 <button key={f} style={{ ...styles.filtroBtn, ...(filtro === f ? styles.filtroBtnAc {f === "todos" ? "Todos" : estadoStyle[f] ? estadoStyle[f].label : f}
 </button>
 ))}
 </div>
 <div style={styles.turnosList}>
 {filtrados.length === 0 && (
 <div style={styles.emptyState}>
 <div style={{ fontSize: 40 }}> </div>
 <p>No hay turnos en esta categoria</p>
 </div>
 )}
 {filtrados
 .slice()
 .sort((a, b) => (a.fecha || "").localeCompare(b.fecha || "") || (a.hora || "").loca .map(turno => {
 const es = estadoStyle[turno.estado] || estadoStyle.pendiente;
 return (
 <div key={turno.id} style={styles.turnoCard}>
 <div style={styles.turnoCardTop}>
 <div>
 <p style={styles.turnoPaciente}>{turno.nombre}</p>
 <p style={styles.turnoFecha}>{turno.fechaDisplay} - {turno.hora}hs</p>
 <p style={styles.turnoTel}>{turno.telefono}</p>
 </div>
 <div style={{ ...styles.estadoBadge, background: es.bg, color: es.color }}> </div>
 {turno.estado === "pendiente" && (
 <div style={styles.actionRow}>
 <button style={styles.btnAprobar} onClick={() => onActualizar(turno.id, " <button style={styles.btnRechazar} onClick={() => onActualizar(turno.id,  </div>
 )}
 {turno.estado === "aprobado" && (
 <button style={styles.btnWhatsapp} onClick={() => enviarWhatsapp(turno, tru Enviar confirmacion por WhatsApp
 </button>
 )}
 {turno.estado === "rechazado" && (
 <button style={styles.btnWhatsappGris} onClick={() => enviarWhatsapp(turno, Avisar por WhatsApp
 </button>
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
 root: { minHeight: "100vh", background: "linear-gradient(135deg, #f0f7f4 0%, #e8f4ef 50%, # bgBlob1: { position: "fixed", top: -100, right: -100, width: 400, height: 400, borderRadius bgBlob2: { position: "fixed", bottom: -120, left: -80, width: 350, height: 350, borderRadiu loadingScreen: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems:  loadingSpinner: { width: 36, height: 36, borderRadius: "50%", border: "3px solid #d0ede0",  centered: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "cen homeCard: { background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)", borderRadiu logoRing: { width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg logoEmoji: { fontSize: 36 },
 heroTitle: { fontSize: 28, fontWeight: 700, color: "#2a4a3a", margin: "0 0 4px", letterSpac heroSubtitle: { fontSize: 18, color: "#3a7a5a", margin: "0 0 4px", fontStyle: "italic" },
 heroDes: { fontSize: 13, color: "#9aaba6", margin: 0 },
 dividerLine: { height: 1, background: "linear-gradient(90deg, transparent, #c0dcd0, transpa noticeBanner: { background: "#fff8e0", border: "1px solid #f0d080", borderRadius: 10, paddi heroInvite: { color: "#5a7a6a", fontSize: 15, marginBottom: 20 },
 homeButtons: { display: "flex", flexDirection: "column", gap: 12 },
 btnPrimary: { background: "linear-gradient(135deg, #3a8f6a, #5aaf8a)", color: "#fff", borde btnSecondary: { background: "transparent", color: "#3a7a5a", border: "2px solid #b0d8c4", b pageWrap: { maxWidth: 560, margin: "0 auto", padding: "24px 16px 60px", minHeight: "100vh"  pageHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
 pageTitle: { fontSize: 22, fontWeight: 700, color: "#2a4a3a", margin: 0, flex: 1 },
 backBtn: { background: "rgba(255,255,255,0.8)", border: "1px solid #d0e8dc", borderRadius:  stepsBar: { display: "flex", justifyContent: "center", gap: 8, marginBottom: 28 },
 stepDot: { width: 32, height: 32, borderRadius: "50%", background: "#e0ede8", color: "#9ab" stepDotActive: { background: "linear-gradient(135deg, #3a8f6a, #5aaf8a)", color: "#fff", bo
 stepContent: { background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)", borderRad stepLabel: { fontSize: 16, fontWeight: 700, color: "#2a4a3a", marginBottom: 16, marginTop:  dateGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", g dateBtn: { background: "#f0f7f4", border: "2px solid transparent", borderRadius: 12, paddin dateBtnActive: { background: "#e0f0e8", borderColor: "#4a9f7a" },
 horaGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", g horaBtn: { background: "#f0f7f4", border: "2px solid transparent", borderRadius: 10, paddin horaBtnActive: { background: "#e0f0e8", borderColor: "#4a9f7a" },
 horaBtnOcupado: { background: "#f5f0f0", color: "#bbb", cursor: "not-allowed", opacity: 0.6 label: { display: "block", fontSize: 13, color: "#5a7a6a", marginBottom: 6, marginTop: 14,  input: { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #d0e8d confirmBox: { background: "#f0f7f4", borderRadius: 14, padding: 18, border: "1px solid #c0d confirmRow: { display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid #e0ede8" alertBanner: { background: "linear-gradient(135deg, #fff8e0, #fff3cc)", border: "1px solid  badge: { background: "#e05c5c", color: "#fff", borderRadius: "50%", width: 22, height: 22,  filtroBar: { display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" },
 filtroBtn: { background: "rgba(255,255,255,0.7)", border: "1.5px solid #d0e8dc", borderRadi filtroBtnActive: { background: "#3a8f6a", color: "#fff", borderColor: "#3a8f6a", fontWeight turnosList: { display: "flex", flexDirection: "column", gap: 12 },
 turnoCard: { background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", borderRadius turnoCardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", turnoPaciente: { fontSize: 16, fontWeight: 700, color: "#2a4a3a", margin: "0 0 4px" },
 turnoFecha: { fontSize: 13, color: "#4a7a6a", margin: "0 0 2px" },
 turnoTel: { fontSize: 12, color: "#9aaba6", margin: 0 },
 estadoBadge: { borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 700, whiteS actionRow: { display: "flex", gap: 8, marginTop: 14 },
 btnAprobar: { flex: 1, background: "linear-gradient(135deg, #3a8f6a, #5aaf8a)", color: "#ff btnRechazar: { flex: 1, background: "#fde8e8", color: "#c03030", border: "1.5px solid #f0c0 btnWhatsapp: { width: "100%", background: "linear-gradient(135deg, #25D366, #128C7E)", colo btnWhatsappGris: { width: "100%", background: "#f0f0f0", color: "#555", border: "1.5px soli turnoMeta: { fontSize: 11, color: "#c0cfc8", marginTop: 10, marginBottom: 0, textAlign: "ri emptyState: { textAlign: "center", padding: "40px 20px", color: "#9aaba6", fontSize: 15 },
 sectionTitle: { fontSize: 20, fontWeight: 700, color: "#2a4a3a", margin: "12px 0 8px" },
};
