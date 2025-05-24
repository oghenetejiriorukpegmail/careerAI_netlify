'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuthStatusPage() {
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to check session
  const checkSession = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      setSessionData(data);
      console.log('Session data:', data);
    } catch (err: any) {
      console.error('Error checking session:', err);
      setError(err.message || 'Error checking session');
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      // Clear session data and reload page
      setSessionData(null);
      window.location.reload();
    } catch (err: any) {
      console.error('Error logging out:', err);
      setError(err.message || 'Error logging out');
    } finally {
      setLoading(false);
    }
  };

  // Check session on component mount
  useEffect(() => {
    checkSession();
  }, []);

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Status</CardTitle>
          <CardDescription>Current authentication state information</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="bg-destructive/15 text-destructive p-4 rounded-md">
              {error}
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-bold mb-2">Session Status</h2>
              <div className="bg-muted p-4 rounded-md mb-4">
                <p className="font-semibold mb-1">
                  Status: <span className={sessionData?.session ? "text-green-600" : "text-red-600"}>
                    {sessionData?.session ? "Authenticated" : "Not Authenticated"}
                  </span>
                </p>
                {sessionData?.session && (
                  <>
                    <p className="mb-1">User ID: {sessionData.session.user.id}</p>
                    <p className="mb-1">Email: {sessionData.session.user.email}</p>
                    <p className="mb-1">Created At: {new Date(sessionData.session.user.created_at).toLocaleString()}</p>
                    <p className="mb-1">Expires At: {new Date(sessionData.session.expires_at * 1000).toLocaleString()}</p>
                  </>
                )}
              </div>
              
              <h2 className="text-lg font-bold mb-2">Local Storage</h2>
              <div className="bg-muted p-4 rounded-md mb-4 text-xs">
                <p className="mb-2">Supabase Auth:</p>
                <pre className="overflow-auto max-h-24">
                  {localStorage.getItem('supabase.auth.token') || 'No auth token found'}
                </pre>
              </div>
              
              <h2 className="text-lg font-bold mb-2">Cookies</h2>
              <div className="bg-muted p-4 rounded-md mb-4 overflow-auto max-h-24 text-xs">
                <p>{document.cookie || 'No cookies found'}</p>
              </div>
              
              <h2 className="text-lg font-bold mb-2">Raw Session Data</h2>
              <pre className="bg-muted p-4 rounded-md overflow-auto max-h-96 text-xs">
                {JSON.stringify(sessionData, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2 justify-between">
          <Button onClick={checkSession} disabled={loading}>
            {loading ? "Checking..." : "Refresh Status"}
          </Button>
          
          {sessionData?.session ? (
            <Button variant="destructive" onClick={handleLogout} disabled={loading}>
              {loading ? "Processing..." : "Sign Out"}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          )}
        </CardFooter>
      </Card>
      
      <div className="flex justify-between mt-4">
        <Button variant="outline" onClick={() => window.location.href = '/'}>
          Home
        </Button>
        <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
          Dashboard
        </Button>
      </div>
      
      <div className="mt-8 bg-muted p-6 rounded-lg">
        <h2 className="text-lg font-bold mb-2">Authentication Troubleshooting</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>If you're experiencing login issues, try clearing your browser cache and cookies</li>
          <li>Make sure you're using the correct email and password</li>
          <li>If you're stuck in a redirect loop, try using a private/incognito browser window</li>
          <li>Session tokens expire after a certain time period and require re-authentication</li>
          <li>This page is always accessible without authentication to help with debugging</li>
        </ul>
      </div>
    </div>
  );
}