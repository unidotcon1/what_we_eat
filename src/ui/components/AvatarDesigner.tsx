import { useState } from 'react'
import {
  AVATAR_COLOURS,
  AVATAR_EMOJI,
  AVATAR_KINDS,
  AVATAR_SHAPES,
  clean_initials,
  type Avatar,
  type AvatarColour,
  type AvatarKind,
  type AvatarShape,
} from '../../domain/avatar'
import { AvatarBadge } from './AvatarBadge'

const title = (word: string) => word[0].toUpperCase() + word.slice(1)

interface Props {
  start: Avatar
  on_save: (avatar: Avatar) => void
  on_cancel: () => void
}

/** Build a profile picture from a shape, a palette colour and an emoji or initials. Nothing is uploaded. */
export function AvatarDesigner({ start, on_save, on_cancel }: Props) {
  const [shape, set_shape] = useState<AvatarShape>(start.shape)
  const [colour, set_colour] = useState<AvatarColour>(start.colour)
  const [kind, set_kind] = useState<AvatarKind>(start.kind)
  // each kind keeps its own text, so switching back and forth loses nothing
  const [emoji, set_emoji] = useState<string>(start.kind === 'emoji' ? start.text : AVATAR_EMOJI[0])
  const [initials, set_initials] = useState(start.kind === 'initials' ? start.text : '')

  const draft: Avatar = { shape, colour, kind, text: kind === 'emoji' ? emoji : initials }

  return (
    <form
      className="avatar-designer"
      aria-label="Design your picture"
      onSubmit={(e) => {
        e.preventDefault()
        on_save(draft)
      }}
    >
      <AvatarBadge avatar={draft} />

      <div className="mini-seg" role="radiogroup" aria-label="Shape">
        {AVATAR_SHAPES.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={shape === s} onClick={() => set_shape(s)}>
            {title(s)}
          </button>
        ))}
      </div>

      <div className="swatches" role="radiogroup" aria-label="Colour">
        {AVATAR_COLOURS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            className="swatch"
            data-colour={c}
            aria-label={title(c)}
            aria-checked={colour === c}
            onClick={() => set_colour(c)}
          />
        ))}
      </div>

      <div className="mini-seg" role="radiogroup" aria-label="Picture">
        {AVATAR_KINDS.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => set_kind(k)}>
            {title(k)}
          </button>
        ))}
      </div>

      {kind === 'emoji' ? (
        <div className="emoji-grid" role="radiogroup" aria-label="Emoji">
          {AVATAR_EMOJI.map((e) => (
            <button key={e} type="button" role="radio" aria-label={e} aria-checked={emoji === e} onClick={() => set_emoji(e)}>
              <span aria-hidden="true">{e}</span>
            </button>
          ))}
        </div>
      ) : (
        <label className="initials-field">
          Your initials (up to 2)
          <input
            value={initials}
            onChange={(e) => set_initials(clean_initials(e.target.value))}
            autoComplete="off"
            autoCapitalize="characters"
            inputMode="text"
          />
        </label>
      )}

      <div className="designer-actions">
        <button type="submit" className="cta">
          Save picture
        </button>
        <button type="button" className="chip" onClick={on_cancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
