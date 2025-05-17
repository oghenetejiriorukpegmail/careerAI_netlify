import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/client';
import fs from 'fs';
import path from 'path';

/**
 * API route to initialize storage policies
 * This should be run with admin privileges
 */
export async function GET() {
  // Get current user session from cookies
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  // This endpoint requires authentication for security
  if (sessionError || !session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  try {
    // First check if this is being run in a production environment
    if (process.env.NODE_ENV === 'production') {
      // Get the SQL file content
      const sqlFilePath = path.join(process.cwd(), 'supabase', 'storage-policies.sql');
      const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
      
      // Split the SQL content into individual statements
      const statements = sqlContent
        .split(';')
        .map(statement => statement.trim())
        .filter(statement => statement.length > 0);
      
      // Execute each statement
      const results = [];
      
      for (const statement of statements) {
        try {
          // Execute SQL using Supabase admin client
          const { data, error } = await supabaseAdmin.rpc('execute_sql', { sql: statement + ';' });
          
          if (error) {
            results.push({
              statement: statement.substring(0, 50) + '...',
              success: false,
              error: error.message
            });
          } else {
            results.push({
              statement: statement.substring(0, 50) + '...',
              success: true
            });
          }
        } catch (statementError: any) {
          results.push({
            statement: statement.substring(0, 50) + '...',
            success: false,
            error: statementError.message
          });
        }
      }
      
      // Check for any failures
      const failures = results.filter(r => !r.success);
      
      if (failures.length > 0) {
        return NextResponse.json({
          success: false,
          message: 'Some policies failed to apply',
          failures,
          results
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Storage policies successfully applied',
        results
      });
    } else {
      // In development, just provide instructions
      return NextResponse.json({
        success: false,
        message: 'Policy application via API is only available in production. For development, apply the SQL script manually using the Supabase Dashboard SQL Editor.',
        instructions: 'Open the Supabase Dashboard, go to the SQL Editor, and run the contents of /supabase/storage-policies.sql'
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error applying storage policies:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to apply storage policies',
      error: error.message
    }, { status: 500 });
  }
}