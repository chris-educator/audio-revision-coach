import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  PinterestIcon,
  RedditIcon,
  ShareIcon,
  TelegramIcon,
  WhatsAppIcon,
  XIcon,
} from './ShareIcons'
import {
  facebookShareUrl,
  getShareUrl,
  instagramShareUrl,
  linkedInShareUrl,
  pinterestShareUrl,
  redditShareUrl,
  telegramShareUrl,
  whatsAppShareUrl,
  xShareUrl,
} from '../utils/shareLinks'

type ShareMenuLink = {
  kind: 'link'
  sortLabel: string
  href: string
  ariaLabel: string
  icon: ReactNode
  onNavigate?: () => void
}

type ShareMenuItem = ShareMenuLink

/** Alphabetical by sortLabel — Facebook, Instagram, LinkedIn, Pinterest, Reddit, Telegram, WhatsApp, X */
const SHARE_LINK_DEFINITIONS = [
  {
    sortLabel: 'Facebook',
    ariaLabel: 'Share on Facebook',
    buildHref: facebookShareUrl,
    Icon: FacebookIcon,
  },
  {
    sortLabel: 'Instagram',
    ariaLabel: 'Share on Instagram',
    buildHref: instagramShareUrl,
    Icon: InstagramIcon,
    copyOnNavigate: true,
  },
  {
    sortLabel: 'LinkedIn',
    ariaLabel: 'Share on LinkedIn',
    buildHref: linkedInShareUrl,
    Icon: LinkedInIcon,
  },
  {
    sortLabel: 'Pinterest',
    ariaLabel: 'Share on Pinterest',
    buildHref: pinterestShareUrl,
    Icon: PinterestIcon,
  },
  {
    sortLabel: 'Reddit',
    ariaLabel: 'Share on Reddit',
    buildHref: redditShareUrl,
    Icon: RedditIcon,
  },
  {
    sortLabel: 'Telegram',
    ariaLabel: 'Share on Telegram',
    buildHref: telegramShareUrl,
    Icon: TelegramIcon,
  },
  {
    sortLabel: 'WhatsApp',
    ariaLabel: 'Share on WhatsApp',
    buildHref: whatsAppShareUrl,
    Icon: WhatsAppIcon,
  },
  {
    sortLabel: 'X',
    ariaLabel: 'Share on X',
    buildHref: xShareUrl,
    Icon: XIcon,
  },
] as const

function buildShareMenuItems(
  shareUrl: string,
  copyLink: () => void,
): ShareMenuItem[] {
  return SHARE_LINK_DEFINITIONS.map((def) => ({
    kind: 'link' as const,
    sortLabel: def.sortLabel,
    href: def.buildHref(shareUrl),
    ariaLabel: def.ariaLabel,
    icon: <def.Icon />,
    onNavigate: 'copyOnNavigate' in def && def.copyOnNavigate ? copyLink : undefined,
  })).sort((a, b) => a.sortLabel.localeCompare(b.sortLabel))
}

type ShareMenuProps = {
  triggerAriaLabel?: string
  className?: string
}

export function ShareMenu({
  triggerAriaLabel = 'Share',
  className = 'share-menu site-top-bar__share',
}: ShareMenuProps) {
  const [open, setOpen] = useState(false)
  const leaveTimer = useRef<number | undefined>(undefined)
  const shareUrl = useMemo(() => getShareUrl(), [])
  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      window.prompt('Copy this link:', shareUrl)
    }
  }, [shareUrl])
  const menuItems = useMemo(
    () => buildShareMenuItems(shareUrl, () => void copyLink()),
    [shareUrl, copyLink],
  )

  const handleOpen = useCallback(() => {
    if (leaveTimer.current !== undefined) {
      window.clearTimeout(leaveTimer.current)
      leaveTimer.current = undefined
    }
    setOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    leaveTimer.current = window.setTimeout(() => setOpen(false), 120)
  }, [])

  return (
    <div
      className={[className, open ? 'share-menu--open' : ''].join(' ')}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      onFocus={handleOpen}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false)
        }
      }}
    >
      <button
        type="button"
        className="share-menu__trigger"
        aria-label={triggerAriaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ShareIcon />
      </button>
      <div className="share-menu__popover" role="menu" aria-label="Share options">
        {menuItems.map((item) => (
          <a
            key={item.sortLabel}
            href={item.href}
            className="share-menu__item"
            role="menuitem"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.ariaLabel}
            title={item.ariaLabel}
            onClick={() => item.onNavigate?.()}
          >
            {item.icon}
          </a>
        ))}
      </div>
    </div>
  )
}
