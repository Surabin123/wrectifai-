let razorpayScriptPromise: Promise<boolean> | null = null;
const processedPaymentIds = new Set<string>();

/**
 * Loads the Razorpay Checkout script dynamically in an idempotent manner.
 * Prevents duplicate script elements in the DOM and memoizes the loading promise.
 */
export function loadRazorpaySdk(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if ((window as any).Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise<boolean>((resolve) => {
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    const timeoutId = setTimeout(() => {
      console.warn('[Razorpay] Script loading timed out after 10 seconds.');
      resolve(false);
    }, 10000);

    script.onload = () => {
      clearTimeout(timeoutId);
      resolve(true);
    };

    script.onerror = () => {
      clearTimeout(timeoutId);
      console.error('[Razorpay] Failed to load Razorpay SDK.');
      resolve(false);
    };

    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

/**
 * Prevents duplicate payment callback replay processing.
 * Returns true if the payment ID has already been handled in the current session.
 */
export function isPaymentAlreadyProcessed(paymentId: string): boolean {
  if (!paymentId) return false;
  if (processedPaymentIds.has(paymentId)) {
    return true;
  }
  processedPaymentIds.add(paymentId);
  return false;
}
