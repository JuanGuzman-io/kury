const cities: Record<string, string> = { BOG: "Bogotá", MEX: "Ciudad de México", LIM: "Lima" };
const statuses: Record<string, string> = { CREATED: "Creado", ACCEPTED: "Aceptado", COURIER_ASSIGNED: "Courier asignado", PICKED_UP: "Recogido" };
export const cityLabel = (value: string) => cities[value] ?? value;
export const statusLabel = (value: string) => statuses[value] ?? value;
export const money = (cents: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD" }).format(cents / 100);
export const dateTime = (value: string) => new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
