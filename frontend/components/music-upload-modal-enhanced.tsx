// components/music-upload-modal-enhanced.tsx
// Enhanced music upload with Album/Single support

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
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { UploadConfig } from '@/config/upload.config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_TOKEN_KEY, STORAGE_USER_KEY } from '@/constants/storage';

interface MusicUploadModalProps {
  visible: boolean;
  onClose: () => void;
}

type UploadType = 'album' | 'single' | null;
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface Album {
  id: string;
  name: string;
  artist: string;
}

export default function MusicUploadModalEnhanced({ visible, onClose }: MusicUploadModalProps) {
  const [uploadType, setUploadType] = useState<UploadType>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Album upload fields
  const [albumName, setAlbumName] = useState('');
  const [albumArtist, setAlbumArtist] = useState('');
  const [albumCover, setAlbumCover] = useState<{ uri: string; name: string } | null>(null);
  const [albumSongs, setAlbumSongs] = useState<any[]>([]);

  // Single upload fields
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [singleFile, setSingleFile] = useState<any>(null);

  // Get current user from storage
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [userAlbums, setUserAlbums] = React.useState<Album[]>([]);
  
  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_USER_KEY);
        if (stored) {
          const user = JSON.parse(stored);
          setCurrentUser(user);
          
          // Set default album with user's name
          setUserAlbums([
            { 
              id: 'default', 
              name: `${user.name || user.username || 'User'}'s Album`, 
              artist: user.name || user.username || 'User' 
            },
            // TODO: Fetch user's actual albums from your database
          ]);
          
          // Auto-select default album
          setSelectedAlbum({
            id: 'default',
            name: `${user.name || user.username || 'User'}'s Album`,
            artist: user.name || user.username || 'User'
          });
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, [visible]);

  const resetState = () => {
    setUploadType(null);
    setUploadStatus('idle');
    setProgress(0);
    setErrorMessage(null);
    setAlbumName('');
    setAlbumArtist('');
    setAlbumCover(null);
    setAlbumSongs([]);
    setSelectedAlbum(null);
    setSingleFile(null);
  };

  const handleClose = () => {
    if (uploadStatus === 'uploading') {
      Alert.alert(
        'Upload in Progress',
        'Are you sure you want to cancel?',
        [
          { text: 'Continue', style: 'cancel' },
          { text: 'Cancel Upload', style: 'destructive', onPress: () => { resetState(); onClose(); } },
        ]
      );
    } else {
      resetState();
      onClose();
    }
  };

  // ===== Album Cover Selection =====
  const selectAlbumCover = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setAlbumCover({
          uri: result.assets[0].uri,
          name: result.assets[0].fileName || 'cover.jpg',
        });
      }
    } catch (error) {
      console.error('Error selecting cover:', error);
    }
  };

  // ===== Album Songs Selection =====
  const selectAlbumSongs = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        // Process files to ensure proper MIME types
        const processedFiles = result.assets.map(file => {
          let mimeType = file.mimeType || 'audio/mpeg';
          
          // Fallback: detect MIME type from file extension
          if (!file.mimeType || file.mimeType === 'application/octet-stream') {
            const ext = file.name.toLowerCase().split('.').pop();
            const mimeMap = {
              'mp3': 'audio/mpeg',
              'mp4': 'audio/mp4',
              'm4a': 'audio/mp4',
              'wav': 'audio/wav',
              'wave': 'audio/wav',
              'aac': 'audio/aac',
              'ogg': 'audio/ogg',
              'flac': 'audio/flac',
              'webm': 'audio/webm',
            };
            mimeType = mimeMap[ext] || 'audio/mpeg';
          }
          
          return {
            ...file,
            mimeType,
            size: file.size || 0,
          };
        });
        setAlbumSongs(processedFiles);
      }
    } catch (error) {
      console.error('Error selecting songs:', error);
      Alert.alert('Error', 'Failed to select audio files');
    }
  };

  // ===== Single File Selection =====
  const selectSingleFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const file = result.assets[0];
        let mimeType = file.mimeType || 'audio/mpeg';
        
        // Fallback: detect MIME type from file extension
        if (!file.mimeType || file.mimeType === 'application/octet-stream') {
          const ext = file.name.toLowerCase().split('.').pop();
          const mimeMap = {
            'mp3': 'audio/mpeg',
            'mp4': 'audio/mp4',
            'm4a': 'audio/mp4',
            'wav': 'audio/wav',
            'wave': 'audio/wav',
            'aac': 'audio/aac',
            'ogg': 'audio/ogg',
            'flac': 'audio/flac',
            'webm': 'audio/webm',
          };
          mimeType = mimeMap[ext] || 'audio/mpeg';
        }
        
        setSingleFile({
          ...file,
          mimeType,
          size: file.size || 0,
        });
      }
    } catch (error) {
      console.error('Error selecting file:', error);
      Alert.alert('Error', 'Failed to select audio file');
    }
  };

  // ===== Upload Album =====
  const uploadAlbum = async () => {
    if (!albumName || !albumArtist || !albumCover || albumSongs.length === 0) {
      Alert.alert('Missing Information', 'Please fill all fields and select songs');
      return;
    }

    setUploadStatus('uploading');
    setProgress(0);

    try {
      const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
      if (!token) throw new Error('No auth token');

      // Create album folder name (match existing format)
      const albumId = albumName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const albumFolder = `music/${albumId}`;
      
      console.log('Creating album:', albumFolder);
      setProgress(5);

      // 1. Upload cover image (detect extension)
      const coverExt = albumCover.name?.split('.').pop()?.toLowerCase() || 'jpg';
      const coverKey = `${albumFolder}/cover.${coverExt}`;
      console.log('Uploading cover:', coverKey);
      await uploadFileToS3(albumCover, coverKey, albumCover.mimeType || 'image/jpeg', token);
      setProgress(10);

      // 2. Upload songs (match format: "01. Song Name.mp3")
      for (let i = 0; i < albumSongs.length; i++) {
        const song = albumSongs[i];
        const trackNumber = String(i + 1).padStart(2, '0');
        const songKey = `${albumFolder}/${trackNumber}. ${song.name}`;
        
        console.log(`Uploading track ${i + 1}/${albumSongs.length}:`, songKey);
        setProgress(10 + ((i + 1) / albumSongs.length) * 70);
        await uploadFileToS3(song, songKey, song.mimeType || 'audio/mpeg', token);
      }

      // 3. Create metadata.json (match existing format exactly)
      const metadata = {
        title: albumName,
        artist: albumArtist,
        cover: `https://disco-music-bucket.s3.us-east-1.amazonaws.com/${albumFolder}/cover.${coverExt}`,
        songs: albumSongs.map((s, i) => {
          const trackNumber = String(i + 1).padStart(2, '0');
          const cleanName = s.name.replace(/\.[^.]+$/, ''); // Remove extension
          return {
            title: cleanName,
            url: `https://disco-music-bucket.s3.us-east-1.amazonaws.com/${albumFolder}/${trackNumber}. ${s.name}`,
          };
        }),
      };
      
      console.log('Creating metadata.json:', metadata);
      const metadataKey = `${albumFolder}/metadata.json`;
      await uploadJSONToS3(metadata, metadataKey, token);

      setProgress(100);
      setUploadStatus('success');
      
      // Notify success
      setTimeout(() => {
        Alert.alert(
          'Album Uploaded!',
          `"${albumName}" is now live. Refresh the page to see it on the home screen!`,
          [{ text: 'OK' }]
        );
      }, 500);
    } catch (error: any) {
      console.error('Album upload error:', error);
      setUploadStatus('error');
      setErrorMessage(error.message || 'Upload failed');
    }
  };

  // ===== Upload Single =====
  const uploadSingle = async () => {
    if (!singleFile || !selectedAlbum) {
      Alert.alert('Missing Information', 'Please select a song and album');
      return;
    }

    setUploadStatus('uploading');
    setProgress(0);

    try {
      const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
      if (!token) throw new Error('No auth token');

      // Upload to album folder (or create user's default folder)
      let albumFolder = `music/${selectedAlbum.id}`;
      
      // If it's the default album, create it with user's name
      if (selectedAlbum.id === 'default') {
        const userName = currentUser?.username || currentUser?.name || 'user';
        albumFolder = `music/${userName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-album`;
      }
      
      // Find next track number if needed
      const songKey = `${albumFolder}/${singleFile.name}`;
      
      console.log('Uploading single to:', songKey);
      await uploadFileToS3(singleFile, songKey, singleFile.mimeType || 'audio/mpeg', token);

      setProgress(100);
      setUploadStatus('success');
      
      // Notify user
      setTimeout(() => {
        Alert.alert('Success!', `Song added to ${selectedAlbum.name}! Refresh to see changes.`);
      }, 500);
    } catch (error: any) {
      console.error('Single upload error:', error);
      setUploadStatus('error');
      setErrorMessage(error.message || 'Upload failed');
    }
  };

  // ===== S3 Upload Helper =====
  const uploadFileToS3 = async (file: any, key: string, contentType: string, token: string) => {
    console.log('uploadFileToS3 called with key:', key);
    
    // Request presigned URL - send full S3 key path
    const fileName = file.name || key.split('/').pop() || 'file';
    
    const requestBody = {
      fileName: fileName,
      fileType: contentType,
      fileSize: file.size || 0,
      s3Key: key, // Send the full path we want in S3
    };
    
    console.log('Requesting presigned URL with:', requestBody);
    
    const presignedResponse = await fetch(
      `${UploadConfig.API_BASE_URL}${UploadConfig.S3_CONFIG.PRESIGNED_URL_ENDPOINT}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!presignedResponse.ok) {
      const errorData = await presignedResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Presigned URL error:', errorData);
      throw new Error(errorData.error || `Failed to get upload URL (${presignedResponse.status})`);
    }

    const { uploadUrl } = await presignedResponse.json();
    console.log('Got presigned URL, uploading to S3...');

    // Upload to S3 using the presigned URL
    const fileBlob = await fetch(file.uri).then(r => r.blob());
    console.log('File blob size:', fileBlob.size, 'type:', fileBlob.type);
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: fileBlob,
    });

    if (!uploadResponse.ok) {
      console.error('S3 upload failed:', uploadResponse.status, uploadResponse.statusText);
      throw new Error(`Failed to upload to S3 (${uploadResponse.status})`);
    }
    
    console.log('Successfully uploaded to S3:', key);
  };

  // ===== Upload JSON Helper =====
  const uploadJSONToS3 = async (data: any, key: string, token: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const file = { uri: URL.createObjectURL(blob), size: blob.size };
    await uploadFileToS3(file, key, 'application/json', token);
  };

  // ===== Render Type Selection =====
  if (!uploadType && uploadStatus === 'idle') {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <LinearGradient
              colors={['#1E3A5F', '#2D5A7B', '#1A1A2E']}
              style={styles.modalContainer}
            >
              <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleClose}>
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Upload Music</Text>
              </View>

              <View style={styles.typeSelection}>
                <TouchableOpacity
                  style={styles.typeCard}
                  onPress={() => setUploadType('album')}
                >
                  <Ionicons name="albums-outline" size={48} color="#A855F7" />
                  <Text style={styles.typeTitle}>Upload Album</Text>
                  <Text style={styles.typeDescription}>
                    Upload multiple songs with cover art
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.typeCard}
                  onPress={() => setUploadType('single')}
                >
                  <Ionicons name="musical-note-outline" size={48} color="#10B981" />
                  <Text style={styles.typeTitle}>Upload Single</Text>
                  <Text style={styles.typeDescription}>
                    Add a song to an existing album
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  }

  // ===== Render Album Upload =====
  if (uploadType === 'album') {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.fullModal}>
            <LinearGradient colors={['#1E3A5F', '#2D5A7B']} style={{ flex: 1, padding: 20 }}>
              <View style={styles.header}>
                <TouchableOpacity onPress={() => setUploadType(null)}>
                  <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Upload Album</Text>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Album Name"
                placeholderTextColor="#9CA3AF"
                value={albumName}
                onChangeText={setAlbumName}
              />

              <TextInput
                style={styles.input}
                placeholder="Artist Name"
                placeholderTextColor="#9CA3AF"
                value={albumArtist}
                onChangeText={setAlbumArtist}
              />

              <Text style={styles.label}>Album Cover:</Text>
              <TouchableOpacity style={styles.selectButton} onPress={selectAlbumCover}>
                {albumCover ? (
                  <Image source={{ uri: albumCover.uri }} style={styles.coverPreview} />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={24} color="#FFF" />
                    <Text style={styles.buttonText}>Select Cover Image</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>Album Songs:</Text>
              <TouchableOpacity style={styles.selectButton} onPress={selectAlbumSongs}>
                <Ionicons name="musical-notes-outline" size={24} color="#FFF" />
                <Text style={styles.buttonText}>
                  {albumSongs.length > 0 ? `${albumSongs.length} songs selected` : 'Select Songs'}
                </Text>
              </TouchableOpacity>

              {uploadStatus === 'uploading' && (
                <View style={styles.progressContainer}>
                  <ActivityIndicator color="#A855F7" size="large" />
                  <Text style={styles.progressText}>Uploading album... {progress}%</Text>
                </View>
              )}

              {uploadStatus === 'success' && (
                <View style={styles.statusContainer}>
                  <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                  <Text style={styles.successText}>Album uploaded successfully!</Text>
                  <TouchableOpacity 
                    style={styles.doneButton}
                    onPress={() => { resetState(); onClose(); }}
                  >
                    <Text style={styles.uploadButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}

              {uploadStatus === 'error' && (
                <View style={styles.statusContainer}>
                  <Ionicons name="close-circle" size={48} color="#EF4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                  <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={() => setUploadStatus('idle')}
                  >
                    <Text style={styles.uploadButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              )}

              {uploadStatus !== 'success' && uploadStatus !== 'error' && (
                <TouchableOpacity 
                  style={[
                    styles.uploadButtonMain,
                    (!albumName || !albumArtist || !albumCover || albumSongs.length === 0 || uploadStatus === 'uploading') && styles.uploadButtonDisabled
                  ]} 
                  onPress={uploadAlbum}
                  disabled={!albumName || !albumArtist || !albumCover || albumSongs.length === 0 || uploadStatus === 'uploading'}
                >
                  <Text style={styles.uploadButtonText}>Upload Album</Text>
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>
        </View>
      </Modal>
    );
  }

  // ===== Render Single Upload =====
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.fullModal}>
          <LinearGradient colors={['#1E3A5F', '#2D5A7B']} style={{ flex: 1, padding: 20 }}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setUploadType(null)}>
                <Ionicons name="arrow-back" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Upload Single</Text>
            </View>

            <Text style={styles.label}>Select Song File:</Text>
            <TouchableOpacity style={styles.selectButton} onPress={selectSingleFile}>
              <Ionicons name="musical-note" size={24} color="#FFF" />
              <Text style={styles.buttonText}>
                {singleFile ? singleFile.name : 'Choose Music File'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>Select Destination Album:</Text>
            <View style={styles.dropdownContainer}>
              {userAlbums.map((album) => (
                <TouchableOpacity
                  key={album.id}
                  style={[
                    styles.albumOption,
                    selectedAlbum?.id === album.id && styles.albumOptionSelected,
                  ]}
                  onPress={() => setSelectedAlbum(album)}
                >
                  <View style={styles.radioCircle}>
                    {selectedAlbum?.id === album.id && (
                      <View style={styles.radioSelected} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.albumOptionText}>{album.name}</Text>
                    <Text style={styles.albumArtistText}>{album.artist}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {uploadStatus === 'uploading' && (
              <View style={styles.progressContainer}>
                <ActivityIndicator color="#10B981" size="large" />
                <Text style={styles.progressText}>Uploading... {progress}%</Text>
              </View>
            )}

            {uploadStatus === 'success' && (
              <View style={styles.statusContainer}>
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                <Text style={styles.successText}>Single uploaded successfully!</Text>
                <TouchableOpacity 
                  style={styles.doneButton}
                  onPress={() => { resetState(); onClose(); }}
                >
                  <Text style={styles.uploadButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}

            {uploadStatus === 'error' && (
              <View style={styles.statusContainer}>
                <Ionicons name="close-circle" size={48} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => setUploadStatus('idle')}
                >
                  <Text style={styles.uploadButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {uploadStatus !== 'success' && uploadStatus !== 'error' && (
              <TouchableOpacity 
                style={[
                  styles.uploadButtonMain,
                  (!singleFile || !selectedAlbum || uploadStatus === 'uploading') && styles.uploadButtonDisabled
                ]} 
                onPress={uploadSingle}
                disabled={!singleFile || !selectedAlbum || uploadStatus === 'uploading'}
              >
                <Text style={styles.uploadButtonText}>Upload to Album</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 16,
    padding: 20,
  },
  fullModal: {
    width: '90%',
    maxWidth: 600,
    height: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeSelection: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  typeCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  typeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  typeDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#FFF',
    marginBottom: 12,
  },
  selectButton: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
  },
  statusContainer: {
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dropdownContainer: {
    marginBottom: 20,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10B981',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
  },
  albumArtistText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
  coverPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  progressContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  progressText: {
    color: '#FFF',
    marginTop: 8,
  },
  successText: {
    color: '#10B981',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    fontSize: 16,
  },
  uploadButtonMain: {
    backgroundColor: '#A855F7',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  uploadButtonDisabled: {
    backgroundColor: '#6B7280',
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    minWidth: 200,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    minWidth: 200,
  },
  label: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 12,
    marginTop: 8,
  },
  albumOption: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumOptionSelected: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  albumOptionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

