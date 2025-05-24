-- Storage Bucket Policies for CareerAI
-- Run this SQL script in the Supabase SQL editor to set up proper policies

-- =============================================================================
-- User Files Bucket Policies
-- =============================================================================

-- Allow users to select their own files
CREATE POLICY "Users can view their own files" ON storage.objects FOR SELECT
USING (bucket_id = 'user_files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to insert their own files
CREATE POLICY "Users can upload their own files" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user_files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own files
CREATE POLICY "Users can update their own files" ON storage.objects FOR UPDATE
USING (bucket_id = 'user_files' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'user_files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files" ON storage.objects FOR DELETE
USING (bucket_id = 'user_files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================================================
-- Resumes Bucket Policies
-- =============================================================================

-- Allow users to select their own resume files
CREATE POLICY "Users can view their own resumes" ON storage.objects FOR SELECT
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to insert their own resume files
CREATE POLICY "Users can upload their own resumes" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resumes' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own resume files
CREATE POLICY "Users can update their own resumes" ON storage.objects FOR UPDATE
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own resume files
CREATE POLICY "Users can delete their own resumes" ON storage.objects FOR DELETE
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================================================
-- Generated Documents Bucket Policies
-- =============================================================================

-- Allow users to select their own generated documents
CREATE POLICY "Users can view their own generated documents" ON storage.objects FOR SELECT
USING (bucket_id = 'generated' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to insert their own generated documents
CREATE POLICY "Users can upload their own generated documents" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'generated' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own generated documents
CREATE POLICY "Users can update their own generated documents" ON storage.objects FOR UPDATE
USING (bucket_id = 'generated' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'generated' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own generated documents
CREATE POLICY "Users can delete their own generated documents" ON storage.objects FOR DELETE
USING (bucket_id = 'generated' AND auth.uid()::text = (storage.foldername(name))[1]);