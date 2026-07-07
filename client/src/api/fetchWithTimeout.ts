/** Fetch with a timeout so hung Gemini requests cannot lock the UI. */

export class FetchTimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message)
    this.name = 'FetchTimeoutError'
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 120_000,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const userSignal = init?.signal
  if (userSignal) {
    if (userSignal.aborted) {
      controller.abort()
    } else {
      userSignal.addEventListener('abort', () => controller.abort(), { once: true })
    }
  }

  try {
    const res = await fetch(input, { ...init, signal: controller.signal })
    return res
  } catch (err) {
    if (controller.signal.aborted && !userSignal?.aborted) {
      throw new FetchTimeoutError()
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}
