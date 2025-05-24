// Simple test function to verify Netlify Functions are working
exports.handler = async (event, context) => {
  console.log('[TEST-HELLO FUNCTION] Function called');
  console.log('[TEST-HELLO FUNCTION] Method:', event.httpMethod);
  console.log('[TEST-HELLO FUNCTION] Path:', event.path);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Hello from Netlify Function!',
      timestamp: new Date().toISOString(),
      method: event.httpMethod,
      path: event.path
    })
  };
};