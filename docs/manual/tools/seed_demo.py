"""Siembra datos FICTICIOS de demostración (personas, salas, calendario y reservaciones de octubre de 2026).
Solo para la pila docker-compose.demo.yml; nunca lo ejecutes contra datos reales."""
import os, json, urllib.request, subprocess, sys
BASE = "http://localhost:8090/api"
PW = os.environ.get("DEMO_PASSWORD") or sys.exit("Define DEMO_PASSWORD (contraseña de las cuentas de demostración; debe cumplir la política: 8+, mayúscula, minúscula, número y símbolo).")
SEED_ADMIN_PASSWORD = "Admin123!"   # contraseña por defecto documentada en el README

def call(method, path, body=None, token=None):
    req = urllib.request.Request(BASE + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json", **({"Authorization": "Bearer " + token} if token else {})})
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read(); return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, method, path, e.read().decode()[:200]); sys.exit(1)

def sql(q):
    subprocess.run(["docker","exec","ibero-demo-db-1","psql","-U","ibero","-d","sala_juntas","-c",q], check=True, capture_output=True)

# 1. Make the seeded super-admin a fictional person (the seed names a real person)
sql("UPDATE users SET name='Administrador General', email='admin@demo.ibero.mx' WHERE email='julieta.esquinca@ibero.mx';")
adm = call("POST", "/auth/login", {"email":"admin@demo.ibero.mx","password":SEED_ADMIN_PASSWORD})["token"]
call("PUT", "/auth/change-password", {"currentPassword":SEED_ADMIN_PASSWORD,"newPassword":PW}, adm)

# 2. Users
def mk(name, email, role, admin=False):
    return call("POST", "/users", {"name":name,"email":email,"password":PW,"role":role,"is_admin":admin}, adm)
laura  = mk("Laura Méndez Ortega", "laura.mendez@demo.ibero.mx", "secretaria")
ric    = mk("Dr. Ricardo Salas Vega", "ricardo.salas@demo.ibero.mx", "academico")
elena  = mk("Dra. Elena Torres Ruiz", "elena.torres@demo.ibero.mx", "academico")
andres = mk("Mtro. Andrés Navarro Díaz", "andres.navarro@demo.ibero.mx", "academico")
ext    = call("POST", "/external-contacts", {"name":"Camila Rivas","email":"camila.rivas@proveedor-demo.mx","organization":"Constructora Delta"}, adm)

# 3. Rooms
rooms = call("GET", "/rooms", None, adm)
sp = rooms[0]["id"]
call("PUT", f"/rooms/{sp}", {"name":"Sala Principal","location":"Edificio P, planta baja","capacity":20}, adm)
se = call("POST", "/rooms", {"name":"Sala Ejecutiva","location":"Edificio P, 2.º piso","capacity":12}, adm)["id"]

# 4. Calendar
call("POST", "/calendar/holidays", {"date":"2026-10-12","name":"Asueto institucional","type":"holiday"}, adm)
call("POST", "/calendar/holidays", {"date":"2026-10-23","name":"Cierre por mantenimiento","type":"closure"}, adm)
call("PUT", "/settings", {"semester_start":"2026-08-10","semester_end":"2026-12-04"}, adm)

# 5. Reservations (as the demo secretary)
sec = call("POST", "/auth/login", {"email":"laura.mendez@demo.ibero.mx","password":PW})["token"]
def book(room, day, s, e, who, area, obs="", ext_id=None, **extra):
    body = {"room_id":room, "start_time":f"{day}T{s}:00", "end_time":f"{day}T{e}:00", "area":area, "observations":obs, **extra}
    if ext_id: body["external_responsible_id"] = ext_id
    else: body["responsible_id"] = who["id"]
    return call("POST", "/reservations", body, sec)

book(sp,"2026-09-29","10:00","11:00",ric,"Seminario de investigación")
book(se,"2026-09-30","12:00","13:00",elena,"Reunión de academia")
cancelled = book(sp,"2026-10-01","12:00","13:00",andres,"Comité de titulación")
call("DELETE", f"/reservations/{cancelled['id']}", None, sec)
book(sp,"2026-10-02","09:00","10:30",ric,"Consejo académico")

book(sp,"2026-10-05","09:00","10:30",ric,"Consejo académico", "Traer el acta de la sesión anterior.")
book(se,"2026-10-05","12:00","13:00",elena,"Revisión de presupuesto 2027")
book(sp,"2026-10-06","10:00","11:00",elena,"Junta de posgrado")
book(sp,"2026-10-06","16:00","17:30",andres,"Comité de titulación")
modified = book(sp,"2026-10-07","09:00","11:00",ric,"Taller de investigación")
call("PUT", f"/reservations/{modified['id']}", {"observations":"Se requiere proyector adicional."}, sec)
book(se,"2026-10-07","11:00","12:00",None,"Entrevista con proveedor","Visita externa.", ext_id=ext["id"])
book(sp,"2026-10-08","13:00","14:00",elena,"Reunión de coordinación")
book(sp,"2026-10-09","10:00","12:00",andres,"Presentación de proyectos")

grp = call("POST", "/reservations/recurring-group", {"pattern":"weekly","endDate":"2026-12-04","maxOccurrences":4}, sec)
for d in ("2026-10-07","2026-10-14","2026-10-21","2026-10-28"):
    book(sp,d,"08:00","09:00",laura,"Seguimiento semanal de secretaría", is_recurring=True, recurring_group=grp["id"])
book(sp,"2026-10-13","11:00","12:30",ric,"Sesión de tesis")
book(se,"2026-10-15","15:00","16:00",elena,"Reunión de academia")
book(sp,"2026-10-20","09:00","10:00",andres,"Revisión de planes de estudio")
book(sp,"2026-10-22","14:00","16:00",elena,"Junta de posgrado")
book(sp,"2026-10-27","10:00","11:30",ric,"Consejo académico")
# 6. Que el historial de cambios se vea realista: la reservación se creó dos días antes de editarse/cancelarse
sql("UPDATE reservations SET created_at = created_at - interval '2 days' WHERE area IN ('Taller de investigación','Comité de titulación');")
sql('UPDATE audit_log SET "timestamp" = "timestamp" - interval \'2 days\' WHERE action = \'create_reservation\' AND entity_id IN (SELECT id FROM reservations WHERE area IN (\'Taller de investigación\',\'Comité de titulación\'));')
print("demo data ready")
