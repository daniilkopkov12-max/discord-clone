export const Permissions = {
  ADMINISTRATOR: 'ADMINISTRATOR',
  MANAGE_SERVER: 'MANAGE_SERVER',
  MANAGE_ROLES: 'MANAGE_ROLES',
  MANAGE_CHANNELS: 'MANAGE_CHANNELS',
  KICK_MEMBERS: 'KICK_MEMBERS',
  SEND_MESSAGES: 'SEND_MESSAGES',
  ATTACH_FILES: 'ATTACH_FILES',
  ADD_REACTIONS: 'ADD_REACTIONS',
  CONNECT_VOICE: 'CONNECT_VOICE',
  SPEAK_VOICE: 'SPEAK_VOICE',
  STREAM_VIDEO: 'STREAM_VIDEO',
} as const;

export function hasPermission(
  userPermissions: string | null | undefined,
  requiredPermission: string,
  isOwner: boolean = false
): boolean {
  if (isOwner) return true;
  if (!userPermissions) return false;
  
  const perms = userPermissions.split(',').map((p) => p.trim());
  if (perms.includes(Permissions.ADMINISTRATOR)) return true;
  return perms.includes(requiredPermission);
}
