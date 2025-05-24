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
 */