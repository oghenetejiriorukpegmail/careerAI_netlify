exports.handler = async (event, context) => {
  console.log('[HELLO FUNCTION] Function called');
  console.log('[HELLO FUNCTION] Method:', event.httpMethod);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Hello from Netlify Function!',
      timestamp: new Date().toISOString(),
      method: event.httpMethod,
      path: event.path
    })
  };
};