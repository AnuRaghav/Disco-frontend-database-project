// components/music-upload-modal.tsx
// =============================================================================
// MUSIC UPLOAD MODAL - Drag & Drop File Upload with Progress
// =============================================================================
// 
// BACKEND INTEGRATION NOTES:
// --------------------------
// This component handles music file uploads with progress tracking.
// To connect to the backend:
//
// 1. UPLOAD ENDPOINT:
//    - Expected endpoint: POST /api/music/upload
//    - Send as multipart/form-data with the music file
//    - Required headers: 
//      * Authorization: Bearer {token}
//      * Content-Type: multipart/form-data
//
// 2. REQUEST FORMAT:
//    - Field name: 'file' or 'musicFile'
//    - Optional metadata fields: title, artist, album, genre, etc.
//
// 3. RESPONSE FORMAT:
//    Success (200): { success: true, music: { id, title, url, ... } }
//    Error (4xx/5xx): { success: false, error: "Error message" }
//
// 4. PROGRESS TRACKING:
//    - The upload uses XMLHttpRequest for progress events
//    - Backend should accept chunked uploads for large files
//    - Consider adding resume capability for interrupted uploads
//
// 5. FILE VALIDATION:
//    - Frontend validates: file type, size (max 100MB currently)
//    - Backend should also validate: file format, audio codec, duration, etc.
//
// 6. OPTIONAL ENHANCEMENTS:
//    - Extract metadata (ID3 tags) from uploaded files
//    - Generate waveform/spectrogram
//    - Automatic transcoding to standard format
//    - Virus/malware scanning
//
// =============================================================================

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { UploadConfig } from '@/config/upload.config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// TYPES
// =============================================================================

interface MusicUploadModalProps {
  visible: boolean;
  onClose: () => void;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface UploadState {
  status: UploadStatus;
  progress: number;
  fileName: string | null;
  errorMessage: string | null;
}

// Use configuration from config file
const SUPPORTED_AUDIO_TYPES = UploadConfig.SUPPORTED_TYPES;
const MAX_FILE_SIZE = UploadConfig.MAX_FILE_SIZE;

// =============================================================================
// COMPONENT
// =============================================================================

export default function MusicUploadModal({ visible, onClose }: MusicUploadModalProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    fileName: null,
    errorMessage: null,
  });

  const [isDragging, setIsDragging] = useState(false);
  const uploadAbortRef = useRef<(() => void) | null>(null);

  // ---------------------------------------------------------------------------
  // FILE VALIDATION
  // ---------------------------------------------------------------------------
  const validateFile = (file: { mimeType?: string; size?: number; name: string }): string | null => {
    // Check file type
    if (file.mimeType && !SUPPORTED_AUDIO_TYPES.includes(file.mimeType)) {
      // Also check file extension as fallback
      const extension = file.name.toLowerCase().split('.').pop();
      const validExtensions = UploadConfig.SUPPORTED_EXTENSIONS;
      
      if (!extension || !validExtensions.includes(extension)) {
        return 'Unsupported file format. Please upload MP3, WAV, FLAC, OGG, AAC, M4A, or WebM files.';
      }
    }

    // Check file size
    if (file.size && file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`;
    }

    return null;
  };

  // ---------------------------------------------------------------------------
  // S3 UPLOAD LOGIC (RECOMMENDED)
  // ---------------------------------------------------------------------------
  const uploadToS3 = async (file: { uri: string; name: string; mimeType?: string; size?: number }) => {
    try {
      // Step 1: Request presigned URL from backend
      setUploadState({
        status: 'uploading',
        progress: 0,
        fileName: file.name,
        errorMessage: null,
      });

      // Get auth token from storage
      // TODO: Update this if you store token with different key
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const presignedResponse = await fetch(
        `${UploadConfig.API_BASE_URL}${UploadConfig.S3_CONFIG.PRESIGNED_URL_ENDPOINT}`,
        {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.mimeType,
          fileSize: file.size,
        }),
      });

      if (!presignedResponse.ok) {
        const error = await presignedResponse.json();
        throw new Error(error.error || 'Failed to get upload URL');
      }

      const { uploadUrl, key } = await presignedResponse.json();

      // Step 2: Upload directly to S3 using presigned URL
      if (Platform.OS === 'web') {
        // For web, fetch the file as blob and upload with progress tracking
        const response = await fetch(file.uri);
        const blob = await response.blob();

        await uploadToS3WithProgress(uploadUrl, blob, file.mimeType || 'audio/mpeg');
      } else {
        // For native platforms, use fetch to upload
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.mimeType || 'audio/mpeg',
          },
          body: await fetch(file.uri).then(r => r.blob()),
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload to S3');
        }

        setUploadState(prev => ({ ...prev, progress: 100 }));
      }

      // Step 3: Notify backend that upload is complete
      const completeResponse = await fetch(
        `${UploadConfig.API_BASE_URL}${UploadConfig.S3_CONFIG.UPLOAD_COMPLETE_ENDPOINT}`,
        {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          key: key,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.mimeType,
        }),
      });

      if (!completeResponse.ok) {
        const error = await completeResponse.json();
        throw new Error(error.error || 'Failed to complete upload');
      }

      // Success!
      setUploadState(prev => ({
        ...prev,
        status: 'success',
        progress: 100,
      }));

    } catch (error: any) {
      console.error('S3 upload error:', error);
      setUploadState({
        status: 'error',
        progress: 0,
        fileName: file.name,
        errorMessage: error.message || 'Upload failed. Please try again.',
      });
    }
  };

  // Upload to S3 with progress tracking (Web only)
  const uploadToS3WithProgress = (url: string, blob: Blob, contentType: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadState(prev => ({ ...prev, progress }));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`S3 upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
      xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', contentType);

      // Store abort function
      uploadAbortRef.current = () => xhr.abort();

      xhr.send(blob);
    });
  };

  // ---------------------------------------------------------------------------
  // LEGACY FILE UPLOAD LOGIC (Direct to Backend)
  // ---------------------------------------------------------------------------
  const uploadFile = async (file: { uri: string; name: string; mimeType?: string; size?: number }) => {
    // Use S3 upload if configured
    if (UploadConfig.USE_S3_UPLOAD) {
      return uploadToS3(file);
    }

    // Otherwise use legacy direct upload to backend
    setUploadState({
      status: 'uploading',
      progress: 0,
      fileName: file.name,
      errorMessage: null,
    });

    try {
      const uploadEndpoint = `${UploadConfig.API_BASE_URL}${UploadConfig.DIRECT_UPLOAD_CONFIG.UPLOAD_ENDPOINT}`;

      // For web platform, use fetch with progress simulation
      if (Platform.OS === 'web') {
        // Simulate upload progress for demo
        // TODO: Backend - For real web uploads, use XMLHttpRequest for progress events
        // See the commented code below for XMLHttpRequest implementation
        
        await simulateUpload(file);
      } else {
        // For native platforms (iOS/Android), use expo-file-system for upload with progress
        // TODO: Backend - Uncomment and configure this when backend is ready
        /*
        const uploadTask = FileSystem.createUploadTask(
          uploadEndpoint,
          file.uri,
          {
            fieldName: 'file',
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            headers: {
              'Authorization': `Bearer ${token}`, // TODO: Add your auth token
            },
          },
          (progressData) => {
            const progress = progressData.totalBytesSent / progressData.totalBytesExpectedToSend;
            setUploadState(prev => ({
              ...prev,
              progress: Math.round(progress * 100),
            }));
          }
        );

        uploadAbortRef.current = () => uploadTask.cancelAsync();
        const response = await uploadTask.uploadAsync();
        
        if (response && response.status === 200) {
          const result = JSON.parse(response.body);
          if (result.success) {
            setUploadState(prev => ({ ...prev, status: 'success', progress: 100 }));
          } else {
            throw new Error(result.error || 'Upload failed');
          }
        } else {
          throw new Error('Upload failed');
        }
        */

        // For now, simulate upload
        await simulateUpload(file);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadState({
        status: 'error',
        progress: 0,
        fileName: file.name,
        errorMessage: error.message || 'Upload failed. Please try again.',
      });
    }
  };

  // TODO: Backend - Remove this simulation function when backend is ready
  // This is just for demonstration purposes
  const simulateUpload = async (file: { name: string }) => {
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      if (uploadState.status === 'idle') break; // User cancelled
      
      setUploadState(prev => ({
        ...prev,
        progress: i,
      }));
      
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Simulate random success/failure for demo
    // TODO: Backend - Replace with actual upload result
    const isSuccess = Math.random() > 0.2; // 80% success rate for demo

    if (isSuccess) {
      setUploadState(prev => ({
        ...prev,
        status: 'success',
        progress: 100,
      }));
    } else {
      setUploadState({
        status: 'error',
        progress: 0,
        fileName: file.name,
        errorMessage: 'Upload failed. Server error.',
      });
    }
  };

  // ---------------------------------------------------------------------------
  // EXAMPLE: XMLHttpRequest implementation for web with progress
  // ---------------------------------------------------------------------------
  // TODO: Backend - Uncomment and adapt this for web uploads with real progress
  /*
  const uploadFileWithXHR = (file: File, token: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadState(prev => ({ ...prev, progress }));
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            setUploadState(prev => ({ ...prev, status: 'success', progress: 100 }));
            resolve();
          } else {
            reject(new Error(response.error || 'Upload failed'));
          }
        } else {
          reject(new Error(`Server error: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error')));
      xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

      // Setup request
      xhr.open('POST', 'http://localhost:3000/api/music/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      
      // Optional: Add metadata
      // formData.append('title', title);
      // formData.append('artist', artist);

      // Store abort function
      uploadAbortRef.current = () => xhr.abort();

      // Send request
      xhr.send(formData);
    });
  };
  */

  // ---------------------------------------------------------------------------
  // FILE SELECTION HANDLERS
  // ---------------------------------------------------------------------------
  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        Alert.alert('Invalid File', validationError);
        return;
      }

      // Upload file
      await uploadFile(file);
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to select file. Please try again.');
    }
  };

  // Handle drag and drop (web only)
  const handleDrop = useCallback(async (event: any) => {
    if (Platform.OS !== 'web') return;

    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file
    const validationError = validateFile({
      name: file.name,
      mimeType: file.type,
      size: file.size,
    });

    if (validationError) {
      Alert.alert('Invalid File', validationError);
      return;
    }

    // For web, create a file object compatible with our upload function
    const fileUri = URL.createObjectURL(file);
    await uploadFile({
      uri: fileUri,
      name: file.name,
      mimeType: file.type,
    });
  }, []);

  const handleDragOver = useCallback((event: any) => {
    if (Platform.OS !== 'web') return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: any) => {
    if (Platform.OS !== 'web') return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  // ---------------------------------------------------------------------------
  // MODAL HANDLERS
  // ---------------------------------------------------------------------------
  const handleClose = () => {
    if (uploadState.status === 'uploading') {
      Alert.alert(
        'Upload in Progress',
        'Are you sure you want to cancel the upload?',
        [
          { text: 'Continue Upload', style: 'cancel' },
          {
            text: 'Cancel Upload',
            style: 'destructive',
            onPress: () => {
              if (uploadAbortRef.current) {
                uploadAbortRef.current();
              }
              resetAndClose();
            },
          },
        ]
      );
    } else {
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setUploadState({
      status: 'idle',
      progress: 0,
      fileName: null,
      errorMessage: null,
    });
    setIsDragging(false);
    uploadAbortRef.current = null;
    onClose();
  };

  // ---------------------------------------------------------------------------
  // RENDER CONTENT BASED ON STATUS
  // ---------------------------------------------------------------------------
  const renderContent = () => {
    switch (uploadState.status) {
      case 'uploading':
        return (
          <View style={styles.contentContainer}>
            <ActivityIndicator size="large" color="#A855F7" />
            <Text style={styles.statusTitle}>Uploading...</Text>
            <Text style={styles.fileName}>{uploadState.fileName}</Text>
            
            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View 
                  style={[
                    styles.progressBarFill,
                    { width: `${uploadState.progress}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>{uploadState.progress}%</Text>
            </View>
          </View>
        );

      case 'success':
        return (
          <View style={styles.contentContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            </View>
            <Text style={styles.statusTitle}>Upload Complete!</Text>
            <Text style={styles.fileName}>{uploadState.fileName}</Text>
            <Text style={styles.successMessage}>
              Your music has been uploaded successfully.
            </Text>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={resetAndClose}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        );

      case 'error':
        return (
          <View style={styles.contentContainer}>
            <View style={styles.errorIcon}>
              <Ionicons name="close-circle" size={80} color="#EF4444" />
            </View>
            <Text style={styles.statusTitle}>Upload Failed</Text>
            <Text style={styles.fileName}>{uploadState.fileName}</Text>
            <Text style={styles.errorMessage}>
              {uploadState.errorMessage || 'Something went wrong. Please try again.'}
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleSelectFile}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={resetAndClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default: // idle
        return (
          <View
            style={[
              styles.dropZone,
              isDragging && styles.dropZoneDragging,
            ]}
            // @ts-ignore - Web only events
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <View style={styles.iconContainer}>
              <Ionicons 
                name={isDragging ? "musical-notes" : "cloud-upload-outline"} 
                size={64} 
                color={isDragging ? "#A855F7" : "#9CA3AF"} 
              />
            </View>
            
            <Text style={styles.dropZoneTitle}>
              {isDragging ? 'Drop your file here' : 'Upload your music'}
            </Text>
            
            <Text style={styles.dropZoneSubtitle}>
              You can upload any number of music and listen across devices!
            </Text>

            <TouchableOpacity
              style={styles.selectButton}
              onPress={handleSelectFile}
            >
              <Text style={styles.selectButtonText}>Select Files to Upload</Text>
            </TouchableOpacity>

            <Text style={styles.supportedFormats}>
              Supported: MP3, WAV, FLAC, OGG, AAC, M4A, WebM (Max 100MB)
            </Text>
          </View>
        );
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      {/* Dark overlay */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        {/* Modal content */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <LinearGradient
            colors={['#1E3A5F', '#2D5A7B', '#1A1A2E']}
            locations={[0, 0.5, 1]}
            style={styles.modalContainer}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleClose}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {renderContent()}
            </ScrollView>
          </LinearGradient>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 600,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  contentContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  dropZone: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    minHeight: 400,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    borderStyle: 'dashed',
  },
  dropZoneDragging: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: '#A855F7',
  },
  iconContainer: {
    marginBottom: 20,
  },
  dropZoneTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  dropZoneSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  selectButton: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginBottom: 16,
  },
  selectButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  supportedFormats: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  fileName: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 24,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#A855F7',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  successIcon: {
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 14,
    color: '#D1D5DB',
    textAlign: 'center',
    marginBottom: 24,
  },
  doneButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: '#FCA5A5',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#A855F7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

