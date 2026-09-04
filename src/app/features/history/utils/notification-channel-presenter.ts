export interface NotificationChannelPresentation {
  readonly label: string;
  readonly icon: string;
}

export function presentNotificationChannel(
  channelType: string | null | undefined,
): NotificationChannelPresentation {
  if (channelType?.toUpperCase() === 'EMAIL') {
    return {
      label: 'Email',
      icon: 'mail',
    };
  }

  return {
    label: 'Canal desconhecido',
    icon: 'notifications',
  };
}
