import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

export type SignInGatedButtonProps = {
  requiresSignIn?: boolean
  requiresEmailVerification?: boolean
  signInTo: string
  emailVerifyTo?: string
  signInPrompt?: string
  emailVerifyPrompt?: string
  disabled?: boolean
  onAuthorizedClick?: () => void
  className?: string
  children: ReactNode
  type?: 'button' | 'submit'
  functionalTitle?: string
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick' | 'disabled' | 'type' | 'className' | 'children' | 'title'
>

export function SignInGatedButton({
  requiresSignIn = false,
  requiresEmailVerification = false,
  signInTo,
  emailVerifyTo,
  signInPrompt = 'Sign in to continue.',
  emailVerifyPrompt = 'Verify your email to continue.',
  disabled = false,
  onAuthorizedClick,
  className = '',
  children,
  type = 'button',
  functionalTitle,
  ...rest
}: SignInGatedButtonProps) {
  const navigate = useNavigate()
  const authBlocked = requiresSignIn || requiresEmailVerification
  const prompt = requiresEmailVerification ? emailVerifyPrompt : signInPrompt
  const destination = requiresEmailVerification ? (emailVerifyTo ?? signInTo) : signInTo
  const actionLabel = requiresEmailVerification ? 'Go to account →' : 'Sign in →'
  const buttonType = authBlocked ? 'button' : type
  const isHtmlDisabled = disabled && !authBlocked

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (authBlocked) {
      event.preventDefault()
      navigate(destination)
      return
    }
    if (buttonType === 'button') {
      event.preventDefault()
      onAuthorizedClick?.()
    }
  }

  return (
    <span
      className={[
        'sign-in-gated-button',
        authBlocked ? 'sign-in-gated-button--blocked' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        {...rest}
        type={buttonType}
        aria-disabled={disabled || authBlocked || undefined}
        disabled={isHtmlDisabled}
        onClick={handleClick}
        title={!authBlocked && disabled ? functionalTitle : undefined}
        className={className}
      >
        {children}
      </button>
      {authBlocked ? (
        <span className="sign-in-gated-button__tooltip" role="tooltip">
          {prompt}
          <span className="sign-in-gated-button__tooltip-action">{actionLabel}</span>
        </span>
      ) : null}
    </span>
  )
}
