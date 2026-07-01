/* ============================================================
   MOCK-DATA.JS — Dataset inicial para prototipo
   Plataforma Reservación Sala de Juntas · Ibero CDMX
   ============================================================ */

const MOCK_DATA = {
  users: [
    {
      id: "u001",
      name: "Julieta Esquinca Gómez",
      email: "julieta.esquinca@ibero.mx",
      role: "secretaria",
      password: "Admin123!",
      isAdmin: true,
      active: true,
      lastLogin: null,
      createdAt: "2026-01-15T08:00:00"
    },
    {
      id: "u002",
      name: "Dr. Miguel Ángel Álvarez",
      email: "miguel.alvarez@ibero.mx",
      role: "academico",
      password: "Acad456!",
      isAdmin: false,
      active: true,
      lastLogin: null,
      createdAt: "2026-01-15T08:00:00"
    },
    {
      id: "u003",
      name: "Lic. Patricia Torres Mendoza",
      email: "patricia.torres@ibero.mx",
      role: "academico",
      password: "Acad789!",
      isAdmin: false,
      active: true,
      lastLogin: null,
      createdAt: "2026-02-01T10:00:00"
    }
  ],

  reservations: [
    {
      id: "r001",
      title: "Junta de Academia",
      responsible: "Dr. Miguel Ángel Álvarez Hernández",
      area: "Academia de Telecomunicaciones",
      date: "2026-04-15",
      startTime: "10:00",
      endTime: "12:00",
      observations: "Revisión plan semestral",
      status: "active",
      createdBy: "u001",
      createdAt: "2026-04-01T09:00:00",
      updatedAt: "2026-04-01T09:00:00",
      isRecurring: false,
      recurringGroupId: null
    },
    {
      id: "r002",
      title: "Reunión Directiva",
      responsible: "Lic. Patricia Torres Mendoza",
      area: "Coordinación Administrativa",
      date: "2026-04-16",
      startTime: "09:00",
      endTime: "10:30",
      observations: "",
      status: "active",
      createdBy: "u001",
      createdAt: "2026-04-02T08:30:00",
      updatedAt: "2026-04-02T08:30:00",
      isRecurring: false,
      recurringGroupId: null
    },
    {
      id: "r003",
      title: "Sesión de Titulación",
      responsible: "Dr. Ricardo Sánchez Zepeda",
      area: "Posgrado en Ingeniería",
      date: "2026-04-17",
      startTime: "14:00",
      endTime: "16:00",
      observations: "3 alumnos de titulación",
      status: "active",
      createdBy: "u001",
      createdAt: "2026-04-02T10:00:00",
      updatedAt: "2026-04-02T10:00:00",
      isRecurring: false,
      recurringGroupId: null
    },
    {
      id: "r004",
      title: "Reunión Semanal de Coordinación",
      responsible: "Mtra. Wendy Guzmán Orta",
      area: "Coordinación Académica",
      date: "2026-04-22",
      startTime: "09:00",
      endTime: "10:00",
      observations: "Reunión semanal fija",
      status: "active",
      createdBy: "u001",
      createdAt: "2026-04-03T09:00:00",
      updatedAt: "2026-04-03T09:00:00",
      isRecurring: true,
      recurringGroupId: "rg001"
    },
    {
      id: "r005",
      title: "Reunión Semanal de Coordinación",
      responsible: "Mtra. Wendy Guzmán Orta",
      area: "Coordinación Académica",
      date: "2026-04-29",
      startTime: "09:00",
      endTime: "10:00",
      observations: "Reunión semanal fija",
      status: "active",
      createdBy: "u001",
      createdAt: "2026-04-03T09:00:00",
      updatedAt: "2026-04-03T09:00:00",
      isRecurring: true,
      recurringGroupId: "rg001"
    },
    {
      id: "r006",
      title: "Presentación de Proyecto",
      responsible: "Dr. Miguel Ángel Álvarez Hernández",
      area: "Academia de Telecomunicaciones",
      date: "2026-04-08",
      startTime: "11:00",
      endTime: "13:00",
      observations: "Presentación final de proyectos integradores",
      status: "cancelled",
      createdBy: "u001",
      createdAt: "2026-03-20T11:00:00",
      updatedAt: "2026-04-05T14:00:00",
      isRecurring: false,
      recurringGroupId: null,
      cancelledAt: "2026-04-05T14:00:00",
      cancelReason: "Cambio de fecha"
    },
    {
      id: "r007",
      title: "Consejo Universitario",
      responsible: "Lic. Patricia Torres Mendoza",
      area: "Rectoría",
      date: "2026-05-06",
      startTime: "10:00",
      endTime: "13:00",
      observations: "",
      status: "active",
      createdBy: "u001",
      createdAt: "2026-04-10T09:00:00",
      updatedAt: "2026-04-10T09:00:00",
      isRecurring: false,
      recurringGroupId: null
    }
  ],

  recurringGroups: [
    {
      id: "rg001",
      pattern: "weekly",
      startDate: "2026-04-22",
      endDate: "2026-05-13",
      maxOcurrences: 4,
      createdBy: "u001",
      createdAt: "2026-04-03T09:00:00"
    }
  ],

  holidays: [
    { id: "h001", date: "2026-05-01", name: "Día del Trabajo",               type: "holiday" },
    { id: "h002", date: "2026-09-16", name: "Independencia de México",        type: "holiday" },
    { id: "h003", date: "2026-11-02", name: "Día de Muertos",                 type: "holiday" },
    { id: "h004", date: "2026-11-20", name: "Revolución Mexicana",            type: "holiday" },
    { id: "h005", date: "2026-12-25", name: "Navidad",                        type: "holiday" },
    { id: "h006", date: "2026-01-01", name: "Año Nuevo",                      type: "holiday" },
    { id: "h007", date: "2026-04-30", name: "Cierre Fin de Semestre",         type: "closure" },
    { id: "h008", date: "2026-07-01", name: "Inicio Vacaciones Verano",       type: "closure" },
    { id: "h009", date: "2026-07-31", name: "Fin Vacaciones Verano",          type: "closure" },
    { id: "h010", date: "2026-12-20", name: "Inicio Vacaciones Invernales",   type: "closure" }
  ],

  responsibleHistory: [
    "Dr. Miguel Ángel Álvarez Hernández",
    "Lic. Patricia Torres Mendoza",
    "Dr. Ricardo Sánchez Zepeda",
    "Mtra. Wendy Guzmán Orta",
    "Dr. Jorge Luis Hernández Pérez",
    "Mtra. Ana Sofía Martínez López",
    "Lic. Roberto García Jiménez",
    "Dr. Carlos Fuentes Ramírez",
    "Mtra. Laura Beatriz Vázquez Morales",
    "Dr. Ernesto Medina Torres"
  ],

  notificationLog: []
};
