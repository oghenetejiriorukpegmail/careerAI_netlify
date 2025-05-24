// Utility functions for calling Netlify Functions

/**
 * Call a Netlify Function
 */
export async function callNetlifyFunction(functionName: string, data?: any) {
  const response = await fetch(`/.netlify/functions/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Function call failed' }));
    throw new Error(error.error || `Function ${functionName} failed`);
  }

  return response.json();
}

/**
 * Call a background function for long-running tasks
 */
export async function callBackgroundFunction(functionName: string, data: any) {
  // Background functions return immediately
  const result = await callNetlifyFunction(functionName, data);
  
  // You can implement polling or webhooks to check status
  return {
    ...result,
    isBackground: true,
    checkStatusUrl: `/.netlify/functions/${functionName}-status`,
  };
}

/**
 * Call an Edge Function for fast operations
 */
export async function callEdgeFunction(path: string, options?: RequestInit) {
  const response = await fetch(`/api/edge/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Edge function ${path} failed`);
  }

  return response.json();
}

/**
 * Example usage in components:
 * 
 * // For quick operations
 * const health = await callNetlifyFunction('health-check');
 * 
 * // For long-running operations
 * const job = await callBackgroundFunction('process-resume-background', {
 *   fileBuffer: base64File,
 *   userId: user.id
 * });
 * 
 * // For edge operations
 * const authStatus = await callEdgeFunction('auth-check');
 */