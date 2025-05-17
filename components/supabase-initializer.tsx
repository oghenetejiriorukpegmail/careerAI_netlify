"use client";

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase/client';
import { checkStorageBuckets } from '@/lib/supabase/storage';

/**
 * Client component that initializes Supabase resources
 * when the app is first loaded
 */
export function SupabaseInitializer() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initSupabase = async () => {
      try {
        // Check if storage buckets are available and properly set up
        const { initialized: bucketsInitialized, missingBuckets, error: bucketError } = await checkStorageBuckets();
        
        if (!bucketsInitialized || bucketError) {
          console.warn('Storage might not be properly set up:', bucketError || `Missing buckets: ${missingBuckets.join(', ')}`);
          
          // Try to initialize via API, but handle errors gracefully
          try {
            const response = await fetch('/api/init');
            const data = await response.json();
            
            if (!data.success) {
              console.warn('Bucket initialization failed, but will continue:', data.message);
              
              // Show a warning toast to the user
              toast({
                title: 'Storage initialization issue',
                description: 'Some features related to file upload may not work correctly.',
                variant: 'warning',
              });
            } else {
              console.log('Storage buckets initialized successfully:', data.buckets);
            }
          } catch (initError) {
            console.warn('API init failed, but app will continue:', initError);
            
            // Show a warning toast to the user
            toast({
              title: 'Storage initialization issue',
              description: 'Some features related to file upload may not work correctly.',
              variant: 'warning',
            });
          }
        }
        
        // Continue initializing the app regardless of storage status
        setInitialized(true);
      } catch (err: any) {
        console.error('Error during initialization:', err);
        setError(err.message || 'An error occurred during initialization');
        
        // Don't block the app - just show a warning
        toast({
          title: 'Storage initialization issue',
          description: 'Some features related to file upload may not work correctly.',
          variant: 'destructive',
        });
        
        // Continue anyway
        setInitialized(true);
      }
    };

    initSupabase();
  }, [toast]);

  // This component doesn't render anything visible
  return null;
}

export default SupabaseInitializer;