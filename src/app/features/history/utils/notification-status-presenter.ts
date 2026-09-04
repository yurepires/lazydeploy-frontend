export interface NotificationStatusPresentation {
  readonly label: string;
  readonly icon: string;
  readonly tone: 'success' | 'failure' | 'unknown';
}

export function presentNotificationStatus(
  status: string | null | undefined,
): NotificationStatusPresentation {
  switch (status?.toUpperCase()) {
    case 'SUCCESS':
    case 'DELIVERED':
      return {
        label: 'Enviado',
        icon: 'check_circle',
        tone: 'success',
      };
    case 'FAILED':
    case 'ERROR':
      return {
        label: 'Falha',
        icon: 'error',
        tone: 'failure',
      };
    default:
      return {
        label: 'Desconhecido',
        icon: 'help_outline',
        tone: 'unknown',
      };
  }
}
