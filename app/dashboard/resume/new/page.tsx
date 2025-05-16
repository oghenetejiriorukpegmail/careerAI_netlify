"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader, Upload, Check, X } from "lucide-react";

export default function UploadResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      
      // Check file type
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(selectedFile.type)) {
        setError("Please upload a PDF or DOCX file");
        return;
      }
      
      // Check file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
  });
  
  const uploadResume = async () => {
    if (!file) return;
    
    try {
      setUploading(true);
      setError(null);
      
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("User not found");
      
      // Upload file to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `resumes/${userData.user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user_files')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Create record in resumes table
      const { error: dbError } = await supabase
        .from('resumes')
        .insert({
          user_id: userData.user.id,
          file_name: file.name,
          file_type: file.type,
          file_path: filePath,
        });
        
      if (dbError) throw dbError;
      
      // Start AI analysis (simulated for now)
      setUploading(false);
      setAnalyzing(true);
      
      // Simulate AI processing time
      setTimeout(() => {
        setAnalyzing(false);
        toast({
          title: "Resume Uploaded",
          description: "Your resume has been uploaded and analyzed successfully.",
        });
        router.push("/dashboard/resume");
      }, 3000);
      
    } catch (error: any) {
      setUploading(false);
      setAnalyzing(false);
      setError(error.message || "Failed to upload resume");
    }
  };
  
  const clearFile = () => {
    setFile(null);
    setError(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Resume</h1>
        <p className="text-muted-foreground">
          Upload your current resume to get started with CareerAI
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Resume</CardTitle>
          <CardDescription>
            Upload your existing resume in PDF or DOCX format
          </CardDescription>
        </CardHeader>
        <CardContent>
          {file ? (
            <div className="flex items-center justify-between p-4 border rounded-md">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-md">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFile}
                disabled={uploading || analyzing}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div {...getRootProps()} className="cursor-pointer">
              <div className={`border-2 border-dashed rounded-md p-8 text-center ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}>
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <h3 className="text-lg font-medium">Drag & drop your resume</h3>
                  <p className="text-sm text-muted-foreground">
                    or click to browse files (PDF or DOCX, max 5MB)
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-3 rounded-md bg-destructive/15 text-destructive text-sm">
              {error}
            </div>
          )}
          
          <div className="mt-6 space-y-4">
            <h3 className="text-md font-medium">What happens next?</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center space-x-2">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center ${file ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span>Upload your resume</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center ${analyzing ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {analyzing ? (
                    <Loader className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span className="text-xs">2</span>
                  )}
                </div>
                <span>AI analyzes your resume content</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="h-6 w-6 rounded-full flex items-center justify-center bg-muted">
                  <span className="text-xs">3</span>
                </div>
                <span>Generate tailored resumes for job applications</span>
              </li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/dashboard/resume")}>
            Cancel
          </Button>
          <Button
            onClick={uploadResume}
            disabled={!file || uploading || analyzing}
          >
            {uploading ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : analyzing ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Upload & Analyze"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}