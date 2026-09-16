import { ApiClientError } from "./client";
export function spanishApiError(error: unknown): string {
  if (!(error instanceof ApiClientError)) return "No pudimos completar la solicitud. Inténtalo de nuevo.";
  if (error.status === 403) return "Tu rol no tiene permisos para esta operación.";
  if (error.status === 404) return "No encontramos el recurso solicitado.";
  if (error.status === 409) return "La información cambió mientras la revisabas. Actualiza e inténtalo de nuevo.";
  if (error.status === 400) return "Revisa la información enviada.";
  if (error.status === 429) return "Hay demasiadas solicitudes. Espera un momento.";
  if (error.status >= 500) return "El servicio no está disponible. Inténtalo de nuevo.";
  return "No pudimos completar la solicitud. Inténtalo de nuevo.";
}
