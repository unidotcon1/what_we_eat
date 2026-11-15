import { avatar_label, type Avatar } from '../../domain/avatar'

/** The designed profile picture. Shape and colour are styled from the data attributes. */
export function AvatarBadge({ avatar, size = 96 }: { avatar: Avatar; size?: number }) {
  return (
    <span
      className="avatar"
      role="img"
      aria-label={avatar_label(avatar)}
      data-shape={avatar.shape}
      data-colour={avatar.colour}
      data-kind={avatar.kind}
      style={{ width: size, height: size, fontSize: size * (avatar.kind === 'emoji' ? 0.5 : 0.38) }}
    >
      <span aria-hidden="true">{avatar.text}</span>
    </span>
  )
}
