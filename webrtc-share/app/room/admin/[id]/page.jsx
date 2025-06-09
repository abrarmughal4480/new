"use client"
import { useState, useRef, use, useEffect, useCallback } from "react"
import { Camera, Trash2, ImageIcon, Plus, Maximize2, VideoIcon, PlayIcon, Save, Edit, Minimize2, Expand, ZoomIn, ZoomOut, Pencil, X } from "lucide-react"
import useWebRTC from "@/hooks/useWebRTC"
import useDrawingTools from "@/hooks/useDrawingTools"
import { createRequest, getMeetingByMeetingId, deleteRecordingRequest, deleteScreenshotRequest } from "@/http/meetingHttp"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDialog } from "@/provider/DilogsProvider"
import { Button } from "@/components/ui/button"
import { logoutRequest } from "@/http/authHttp"
import { useUser } from "@/provider/UserProvider"

export default function Page({ params }) {
  const { id } = use(params);
  const router = useRouter();
  
  // Add hydration state at the top
  const [isClient, setIsClient] = useState(false);
  
  const [targetTime, setTargetTime] = useState("Emergency 24 Hours")
  const [showDropdown, setShowDropdown] = useState(false)
  const [residentName, setResidentName] = useState("")
  const [residentAddress, setResidentAddress] = useState("")
  const [postCode, setPostCode] = useState("")
  const [repairDetails, setRepairDetails] = useState("")
  const [callDuration, setCallDuration] = useState(0);
  
  // Add state for existing meeting data
  const [existingMeetingData, setExistingMeetingData] = useState(null);
  const [isLoadingMeetingData, setIsLoadingMeetingData] = useState(true);
  const [existingScreenshots, setExistingScreenshots] = useState([]); // Add state for existing screenshots
  
  // Add missing maximized item state
  const [maximizedItem, setMaximizedItem] = useState(null);
  
  // Screen recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingStream, setRecordingStream] = useState(null);
  const [playingVideos, setPlayingVideos] = useState(new Set());
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const [currentRecordingDuration, setCurrentRecordingDuration] = useState(0);

  // Add state for tracking video progress - MOVED HERE FROM BOTTOM
  const [videoProgress, setVideoProgress] = useState({});

  
  // Pencil tool states - updated to use drawing hook
  const [activePencilScreenshot, setActivePencilScreenshot] = useState(null);
  const [showPencilDropdown, setShowPencilDropdown] = useState(null);
  
  // Add state for token-specific landlord info 
  const [tokenLandlordInfo, setTokenLandlordInfo] = useState(null);
  const [isLoadingTokenInfo, setIsLoadingTokenInfo] = useState(true);

  // Initialize drawing tools hook
  const {
    colors,
    tools,
    selectedColor,
    setSelectedColor,
    selectedTool,
    setSelectedTool,
    lineWidth,
    setLineWidth,
    initializeCanvas,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas: clearDrawingCanvas,
    mergeWithBackground,
    drawingData
  } = useDrawingTools();

  const videoRef = useRef(null);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const recordingChunks = useRef([]);
  const recordingTimerRef = useRef(null);
  
  const { handleDisconnect, isConnected, screenshots, takeScreenshot, startPeerConnection, deleteScreenshot } = useWebRTC(true, id, videoRef);
  const { setResetOpen, setMessageOpen, setLandlordDialogOpen, setTickerOpen, setInviteOpen, setFeedbackOpen, setFaqOpen } = useDialog();
  const { user, isAuth, setIsAuth, setUser } = useUser();
  // Helper function to convert blob to base64
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Add new function to handle "End Video and Save Images"
  const handleEndVideoAndSave = async (e) => {
    // Prevent form submission and page refresh
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      console.log('🎬 Starting End Video and Save process...');
      
      // First disconnect the video call
      if (isConnected) {
        handleDisconnect();
      }
      
      // Stop any ongoing recording
      if (isRecording) {
        stopScreenRecording();
      }
      
      // Wait a moment for any final recording to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Now save everything
      await handleSave(e);
      
      toast.success("Video ended and all content saved successfully!");
      
    } catch (error) {
      console.error('❌ End Video and Save failed:', error);
      toast.error("Failed to end video and save content", {
        description: error?.response?.data?.message || error.message
      });
    }
  };

  const handleSave = async (e) => {
    // Prevent form submission and page refresh
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      console.log('💾 Starting save process...');
      
      // Separate new recordings from existing ones
      const newRecordings = recordings.filter(recording => !recording.isExisting && recording.blob);
      const existingRecordings = recordings.filter(recording => recording.isExisting);
      
      // Prepare NEW screenshots data for upload (no drawing logic)
      const screenshotsData = [];
      for (let i = 0; i < screenshots.length; i++) {
        const screenshot = screenshots[i];
        
        console.log(`📸 Processing NEW screenshot ${i + 1}/${screenshots.length}...`);
        
        try {
          screenshotsData.push({
            data: screenshot,
            timestamp: new Date().toISOString(),
            size: screenshot.length
          });
          console.log(`✅ NEW screenshot ${i + 1} processed successfully`);
        } catch (error) {
          console.error(`❌ Error processing NEW screenshot ${i + 1}:`, error);
          screenshotsData.push({
            data: screenshot,
            timestamp: new Date().toISOString(),
            size: screenshot.length
          });
        }
      }

      // Prepare NEW recordings data for upload only
      const recordingsData = [];
      for (let i = 0; i < newRecordings.length; i++) {
        const recording = newRecordings[i];
        console.log(`🎥 Processing NEW recording ${i + 1}/${newRecordings.length}...`);
        
        try {
          const base64Data = await blobToBase64(recording.blob);
          recordingsData.push({
            data: base64Data,
            timestamp: recording.timestamp,
            duration: recording.duration || Math.floor((recording.blob.size / 1000) / 16),
            size: recording.blob.size
          });
          console.log(`✅ NEW recording ${i + 1} processed successfully`);
        } catch (error) {
          console.error(`❌ Error processing NEW recording ${i + 1}:`, error);
        }
      }

      const formData = {
        meeting_id: id,
        name: residentName,
        address: residentAddress,
        post_code: postCode,
        repair_detail: repairDetails,
        target_time: targetTime,
        recordings: recordingsData,
        screenshots: screenshotsData,
        update_mode: existingMeetingData ? 'update' : 'create'
      };

      console.log('📤 Sending data to server...');
      console.log('📋 Form data summary:', {
        meeting_id: id,
        update_mode: formData.update_mode,
        new_recordings_count: recordingsData.length,
        new_screenshots_count: screenshotsData.length,
        existing_recordings_count: existingRecordings.length,
        total_recordings_after_save: existingRecordings.length + recordingsData.length
      });

      const response = await createRequest(formData);
      
      console.log('✅ Save successful!');
      
      toast.success("Repair saved successfully!", {
        description: `Added ${recordingsData.length} new recordings and ${screenshotsData.length} new screenshots.`
      });
      
      // Reset pencil mode (UI only)
      setActivePencilScreenshot(null);
      
      // Update recordings state to mark all recordings as existing/saved
      setRecordings(prev => prev.map(rec => ({
        ...rec,
        isExisting: true // Mark all recordings as saved
      })));

      // Move all new screenshots to existing screenshots and mark them as saved
      if (screenshotsData.length > 0) {
        const newSavedScreenshots = screenshotsData.map((screenshot, index) => ({
          id: `saved-${Date.now()}-${index}`,
          url: screenshot.data,
          timestamp: new Date(screenshot.timestamp).toLocaleString(),
          isExisting: true
        }));
        
        setExistingScreenshots(prev => [...prev, ...newSavedScreenshots]);
        
        // Clear the new screenshots array since they're now saved
        // Note: This would require updating the useWebRTC hook to clear screenshots
      }

      // Update existing meeting data reference
      if (!existingMeetingData) {
        setExistingMeetingData({
          meeting_id: id,
          name: residentName,
          address: residentAddress,
          post_code: postCode,
          repair_detail: repairDetails,
          target_time: targetTime
        });
      }

    } catch (error) {
      console.error('❌ Save failed:', error);
      toast.error("Failed to save repair", {
        description: error?.response?.data?.message || error.message
      });
    }
  }



  const handleLogout = async () => {
    try {
      const res = await logoutRequest();
      toast("Logout Successfull", {
        description: res.data.message
      });
      setIsAuth(false);
      setUser(null);
      // Redirect to main page
      router.push("../../../");
    } catch (error) {
      toast("Logout Unsuccessfull", {
        description: error?.response?.data?.message || error.message
      });
    }
  }

  // Add dashboard handler
  const handleDashboard = () => {
    router.push("../../../dashboard/");
  }

  // Simple timer effect that doesn't interfere with WebRTC - with localStorage persistence
  useEffect(() => {
    if (!isClient) return;
    
    // Load saved timer data from localStorage on component mount
    const savedStartTime = localStorage.getItem(`call-start-time-${id}`);
    const savedDuration = localStorage.getItem(`call-duration-${id}`);
    
    if (isConnected && !startTimeRef.current) {
      // If there's saved data and we're reconnecting, restore it
      if (savedStartTime) {
        const savedTime = parseInt(savedStartTime);
        const elapsedSinceStart = Math.floor((Date.now() - savedTime) / 1000);
        startTimeRef.current = savedTime;
        setCallDuration(elapsedSinceStart);
        console.log('Restored call timer from localStorage:', elapsedSinceStart);
      } else {
        // New call - save start time
        const startTime = Date.now();
        startTimeRef.current = startTime;
        localStorage.setItem(`call-start-time-${id}`, startTime.toString());
        console.log('Started new call timer');
      }
      
      timerRef.current = setInterval(() => {
        const currentDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setCallDuration(currentDuration);
        // Save current duration to localStorage
        localStorage.setItem(`call-duration-${id}`, currentDuration.toString());
      }, 1000);
    }
    
    if (!isConnected && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      startTimeRef.current = null;
      setCallDuration(0);
      // Clear localStorage when call ends
      localStorage.removeItem(`call-start-time-${id}`);
      localStorage.removeItem(`call-duration-${id}`);
      console.log('Call ended, cleared timer from localStorage');
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isConnected, id, isClient]);

  // Load saved duration on component mount (for page refresh scenarios)
  useEffect(() => {
    if (!isClient) return;
    
    const savedDuration = localStorage.getItem(`call-duration-${id}`);
    const savedStartTime = localStorage.getItem(`call-start-time-${id}`);
    
    if (savedDuration && savedStartTime && !isConnected) {
      // If we have saved data but not connected, show the last known duration
      const duration = parseInt(savedDuration);
      setCallDuration(duration);
      console.log('Loaded call duration from localStorage on mount:', duration);
    }
  }, [id, isClient]);

  // Format time to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format recording duration
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Recording timer effect
  useEffect(() => {
    if (isRecording && recordingStartTime) {
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        setCurrentRecordingDuration(elapsed);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setCurrentRecordingDuration(0);
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording, recordingStartTime]);

  // Screen recording functions
  const startScreenRecording = async () => {
    try {
      // Get video stream from the video element instead of screen
      if (!videoRef.current || !videoRef.current.srcObject) {
        toast('No video stream available to record');
        return;
      }

      // Set recording start time
      const startTime = Date.now();
      setRecordingStartTime(startTime);

      // Hide video controls during recording
      if (videoRef.current) {
        videoRef.current.controls = false;
        videoRef.current.style.pointerEvents = 'none';
      }

      const stream = videoRef.current.srcObject;
      
      setRecordingStream(stream);
      
      // Create MediaRecorder with higher quality settings
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000, // Increased to 5 Mbps for higher quality
        audioBitsPerSecond: 128000   // Add audio bitrate for better audio quality
      });
      
      // Reset chunks
      recordingChunks.current = [];
      
      // Handle data available event - record in smaller chunks for better quality
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunks.current.push(event.data);
        }
      };
      
      // Handle recording stop event
      recorder.onstop = () => {
        // Calculate final duration
        const endTime = Date.now();
        const duration = Math.floor((endTime - startTime) / 1000);
        
        // Restore video controls after recording
        if (videoRef.current) {
          videoRef.current.style.pointerEvents = 'auto';
        }

        const blob = new Blob(recordingChunks.current, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        
        const newRecording = {
          id: Date.now(),
          url: videoUrl,
          blob: blob,
          timestamp: new Date().toLocaleString(),
          duration: duration
        };
        
        setRecordings(prev => [...prev, newRecording]);
        setIsRecording(false);
        setRecordingStartTime(null);
      };
      
      setMediaRecorder(recorder);
      // Start recording with timeslice for better quality chunks
      recorder.start(1000); // Record in 1 second chunks
      setIsRecording(true);
      toast('Video recording started');
      
    } catch (error) {
      console.error('Error starting video recording:', error);
      // Fallback to webm if vp9 not supported
      try {
        const stream = videoRef.current.srcObject;
        const startTime = Date.now();
        setRecordingStartTime(startTime);
        
        const recorder = new MediaRecorder(stream, {
          mimeType: 'video/webm',
          videoBitsPerSecond: 3000000, // Higher fallback quality
          audioBitsPerSecond: 128000
        });
        
        // Hide controls
        if (videoRef.current) {
          videoRef.current.controls = false;
          videoRef.current.style.pointerEvents = 'none';
        }
        
        // Reset chunks
        recordingChunks.current = [];
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordingChunks.current.push(event.data);
          }
        };
        
        recorder.onstop = () => {
          const endTime = Date.now();
          const duration = Math.floor((endTime - startTime) / 1000);
          
          if (videoRef.current) {
            videoRef.current.style.pointerEvents = 'auto';
          }
          
          const blob = new Blob(recordingChunks.current, { type: 'video/webm' });
          const videoUrl = URL.createObjectURL(blob);
          
          const newRecording = {
            id: Date.now(),
            url: videoUrl,
            blob: blob,
            timestamp: new Date().toLocaleString(),
            duration: duration
          };
          
          setRecordings(prev => [...prev, newRecording]);
          setIsRecording(false);
          setRecordingStartTime(null);
        };
        
        setMediaRecorder(recorder);
        recorder.start(1000);
        setIsRecording(true);
        toast('High quality video recording started');
      } catch (fallbackError) {
        toast('Failed to start video recording');
        setRecordingStartTime(null);
      }
    }
  };
  
  const stopScreenRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      // Restore video controls
      if (videoRef.current) {
        videoRef.current.style.pointerEvents = 'auto';
      }
      toast('Recording stopped');
    }
  };
  
  const handleRecordingToggle = () => {
    if (isRecording) {
      stopScreenRecording();
    } else {
      startScreenRecording();
    }
  };
  
  // Updated delete recording function
  const deleteRecording = async (recording) => {
    try {
      if (recording.isExisting) {
        // Send delete request to backend for existing recordings
        console.log(`🗑️ Deleting existing recording ${recording.id} from meeting ${id}`);
        
        try {
          const response = await deleteRecordingRequest(id, recording.id);
          
          if (response.data.timeout) {
            toast.success("Recording deletion requested (processing in background)");
          } else {
            toast.success("Recording deleted successfully!");
          }
        } catch (error) {
          console.error('Error during API delete call:', error);
          // Even if API call fails, remove from UI for better user experience
          toast.info("Recording removed from view but backend deletion failed");
        }
      } else {
        // Local deletion for new recordings (not yet saved)
        console.log(`🗑️ Deleting local recording ${recording.id}`);
      }
      
      // Always remove from state regardless of API success
      setRecordings(prev => {
        const recordingToDelete = prev.find(r => r.id === recording.id);
        if (recordingToDelete && recordingToDelete.url) {
          URL.revokeObjectURL(recordingToDelete.url);
        }
        return prev.filter(r => r.id !== recording.id);
      });
      
      if (!recording.isExisting) {
        toast.success("Recording removed!");
      }
    } catch (error) {
      console.error('❌ Delete recording failed:', error);
      toast.error("Failed to delete recording", {
        description: error?.response?.data?.message || error.message
      });
    }
  };
  
  // Delete existing screenshot function
  const deleteExistingScreenshot = async (screenshot) => {
    try {
      console.log(`🗑️ Deleting existing screenshot ${screenshot.id} from meeting ${id}`);
      const response = await deleteScreenshotRequest(id, screenshot.id);
      
      if (response.data.timeout) {
        toast.success("Screenshot deletion requested (processing in background)");
      } else {
        toast.success("Screenshot deleted successfully!");
      }
      
      // Remove from existing screenshots state immediately
      setExistingScreenshots(prev => prev.filter(s => s.id !== screenshot.id));
    } catch (error) {
      console.error('❌ Delete screenshot failed:', error);
      toast.error("Failed to delete screenshot", {
        description: error?.response?.data?.message || error.message
      });
    }
  };
  
  // Local screenshot delete function (for new screenshots from useWebRTC)
  const deleteNewScreenshot = (screenshotIndex) => {
    try {
      // Use the deleteScreenshot function from useWebRTC hook
      deleteScreenshot(screenshotIndex);
      toast.success("Screenshot removed!");
    } catch (error) {
      console.error('Error deleting screenshot:', error);
      toast.error("Failed to delete screenshot");
    }
  };

  // Pencil tool functions - Memoize to prevent re-renders
  const handlePencilClick = useCallback((screenshotIndex) => {
    if (activePencilScreenshot === screenshotIndex) {
      setActivePencilScreenshot(null);
      setShowPencilDropdown(null);
    } else {
      setActivePencilScreenshot(screenshotIndex);
      setShowPencilDropdown(screenshotIndex);
    }
  }, [activePencilScreenshot]);

  const handleColorSelect = useCallback((color) => {
    setSelectedColor(color);
  }, [setSelectedColor]);

  const handleToolSelect = useCallback((tool) => {
    setSelectedTool(tool);
  }, [setSelectedTool]);

  // Clear canvas function - Memoize to prevent re-renders
  const clearCanvas = useCallback((screenshotIndex) => {
    const canvasId = screenshotIndex;
    clearDrawingCanvas(canvasId);
    toast.info("Canvas cleared");
  }, [clearDrawingCanvas]);

  // Add effect to close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPencilDropdown && 
          !event.target.closest('.pencil-dropdown-container')) {
        setShowPencilDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPencilDropdown]);

  // Add effect to fetch existing meeting data when component mounts
  useEffect(() => {
    if (!isClient || !id) return;
    
    const fetchExistingMeetingData = async () => {
      setIsLoadingMeetingData(true);
      try {
        console.log('🔍 Fetching existing meeting data for ID:', id);
        const response = await getMeetingByMeetingId(id);
        
        if (response.data.success && response.data.meeting) {
          const meetingData = response.data.meeting;
          console.log('✅ Found existing meeting data:', meetingData);
          
          // Pre-populate form fields with existing data
          setResidentName(meetingData.name || "");
          setResidentAddress(meetingData.address || "");
          setPostCode(meetingData.post_code || "");
          setRepairDetails(meetingData.repair_detail || "");
          setTargetTime(meetingData.target_time || "Emergency 24 Hours");
          
          // Store existing recordings
          if (meetingData.recordings && meetingData.recordings.length > 0) {
            const existingRecordings = meetingData.recordings.map(rec => ({
              id: rec._id || Date.now() + Math.random(),
              url: rec.url,
              blob: null,
              timestamp: new Date(rec.timestamp).toLocaleString(),
              duration: rec.duration || 0,
              isExisting: true
            }));
            setRecordings(existingRecordings);
          }
          
          // Store existing screenshots
          if (meetingData.screenshots && meetingData.screenshots.length > 0) {
            const existingScreenshotsData = meetingData.screenshots.map(screenshot => ({
              id: screenshot._id || Date.now() + Math.random(),
              url: screenshot.url,
              timestamp: new Date(screenshot.timestamp).toLocaleString(),
              isExisting: true
            }));
            setExistingScreenshots(existingScreenshotsData);
            console.log('📸 Loaded existing screenshots:', existingScreenshotsData.length);
          }
          
          setExistingMeetingData(meetingData);
          
          toast.success("Meeting data loaded successfully!", {
            description: `Found ${meetingData.recordings?.length || 0} recordings and ${meetingData.screenshots?.length || 0} screenshots`
          });
        }
      } catch (error) {
        // Handle different types of errors gracefully
        if (error.code === 'ERR_NETWORK') {
          console.log('ℹ️ Cannot connect to server - this is normal if server is starting up');
        } else if (error?.response?.status === 404) {
          console.log('ℹ️ No existing meeting data found for ID:', id, '(This is normal for new meetings)');
        } else if (error?.response?.status === 500) {
          console.log('ℹ️ Server error while fetching meeting data - this may be temporary');
        } else if (error.code === 'ECONNABORTED') {
          console.log('ℹ️ Request timeout while fetching meeting data');
        } else {
          console.log('ℹ️ Error fetching meeting data:', error.message);
        }
      } finally {
        setIsLoadingMeetingData(false);
      }
    };

    fetchExistingMeetingData();
  }, [id, isClient]);

  // Add individual save functions - Memoize these functions
  const saveIndividualRecording = useCallback(async (recording) => {
    if (recording.isExisting) {
      toast.info("Recording already saved");
      return;
    }

    try {
      console.log('💾 Saving individual recording...');
      
      const base64Data = await blobToBase64(recording.blob);
      const recordingsData = [{
        data: base64Data,
        timestamp: recording.timestamp,
        duration: recording.duration,
        size: recording.blob.size
      }];

      const formData = {
        meeting_id: id,
        name: residentName,
        address: residentAddress,
        post_code: postCode,
        repair_detail: repairDetails,
        target_time: targetTime,
        recordings: recordingsData,
        screenshots: [],
        update_mode: existingMeetingData ? 'update' : 'create'
      };

      const response = await createRequest(formData);
      
      // Update the recording to mark it as existing
      setRecordings(prev => prev.map(r => 
        r.id === recording.id
          ? { ...r, isExisting: true }
          : r
      ));

      toast.success("Recording saved successfully!");
      
    } catch (error) {
      console.error('❌ Save recording failed:', error);
      toast.error("Failed to save recording");
    }
  }, [id, residentName, residentAddress, postCode, repairDetails, targetTime, existingMeetingData]);

  const saveIndividualScreenshot = useCallback(async (screenshotData, index) => {
    try {
      console.log('💾 Saving individual screenshot...');
      
      let finalScreenshotData = screenshotData;
      const canvasId = `new-${index}`; // This matches the canvas ID used in the component
      
      // Check if this screenshot has drawings and merge them
      console.log('🎨 Checking for drawings on canvas:', canvasId);
      console.log('📊 Available drawing data:', Object.keys(drawingData));
      
      if (drawingData[canvasId]) {
        console.log('✏️ Found drawings, merging with background...');
        finalScreenshotData = await mergeWithBackground(screenshotData, canvasId);
        console.log('✅ Successfully merged drawing with background');
      } else {
        console.log('ℹ️ No drawings found for this screenshot');
      }
      
      const screenshotsData = [{
        data: finalScreenshotData,
        timestamp: new Date().toISOString(),
        size: finalScreenshotData.length
      }];

      const formData = {
        meeting_id: id,
        name: residentName,
        address: residentAddress,
        post_code: postCode,
        repair_detail: repairDetails,
        target_time: targetTime,
        recordings: [],
        screenshots: screenshotsData,
        update_mode: existingMeetingData ? 'update' : 'create'
      };

      const response = await createRequest(formData);
      
      toast.success("Screenshot saved successfully!");
      
      // Clear pencil mode
      setActivePencilScreenshot(null);
      setShowPencilDropdown(null);
      
      // Move the saved screenshot to existing screenshots
      const newSavedScreenshot = {
        id: `saved-${Date.now()}-${index}`,
        url: finalScreenshotData,
        timestamp: new Date().toLocaleString(),
        isExisting: true
      };
      
      setExistingScreenshots(prev => [...prev, newSavedScreenshot]);
      
      // Remove from new screenshots (this would need to be implemented in useWebRTC)
      deleteNewScreenshot(index);
      
    } catch (error) {
      console.error('❌ Save screenshot failed:', error);
      toast.error("Failed to save screenshot");
    }
  }, [id, residentName, residentAddress, postCode, repairDetails, targetTime, existingMeetingData, drawingData, mergeWithBackground, deleteNewScreenshot]);

  // Maximize handlers - Memoize these functions
  const maximizeVideo = useCallback((recording) => {
    setMaximizedItem({
      type: 'video',
      id: recording.id,
      data: recording
    });
  }, []);

  const maximizeScreenshot = useCallback((screenshot, index, isExisting = false) => {
    setMaximizedItem({
      type: 'screenshot',
      id: isExisting ? screenshot.id : `new-${index}`,
      data: screenshot,
      index: isExisting ? null : index,
      isExisting
    });
  }, []);

  const closeMaximized = useCallback(() => {
    setMaximizedItem(null);
  }, []);

  // Handle escape key to close maximized view
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && maximizedItem) {
        closeMaximized();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [maximizedItem]);

  // Helper function to get landlord name (prioritize token info)
  const getLandlordName = () => {
    if (tokenLandlordInfo?.landlordName) {
      return tokenLandlordInfo.landlordName;
    }
    return user?.landlordInfo?.landlordName || null;
  };
  

  // Helper function to get landlord logo (prioritize token info)
  const getLandlordLogo = () => {
    if (tokenLandlordInfo?.landlordLogo && isValidImageUrl(tokenLandlordInfo.landlordLogo)) {
      return tokenLandlordInfo.landlordLogo;
    }
    if (user?.landlordInfo?.landlordLogo && isValidImageUrl(user.landlordInfo.landlordLogo)) {
      return user.landlordInfo.landlordLogo;
    }
    return null;
  };

  // Helper function to get profile image (prioritize token info)
  const getProfileImage = () => {
    // Check token info first
    if (tokenLandlordInfo?.profileImage && isValidImageUrl(tokenLandlordInfo.profileImage)) {
      return tokenLandlordInfo.profileImage;
    }
    
    // Fallback to current user info
    if (user?.landlordInfo?.useLandlordLogoAsProfile && user?.landlordInfo?.landlordLogo) {
      if (isValidImageUrl(user.landlordInfo.landlordLogo)) {
        return user.landlordInfo.landlordLogo;
      }
    }
    
    if (user?.landlordInfo?.officerImage) {
      if (isValidImageUrl(user.landlordInfo.officerImage)) {
        return user.landlordInfo.officerImage;
      }
    }
    
    return null;
  };

  // Helper function to check if image URL is valid
  const isValidImageUrl = (url) => {
    if (!url) return false;
    return url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://');
  };

  // Helper function to get display name (prioritize token info)
  const getDisplayName = () => {
    // Use landlord name if available from token or user
    const landlordName = getLandlordName();
    if (landlordName) {
      return landlordName;
    }
    
    // Fallback to username from email
    if (user?.email) {
      return user.email.split('@')[0];
    }
    
    return 'User';
  };

  // Helper function to get initials
  const getInitials = (name) => {
    if (!name) return 'U';
    
    const words = name.trim().split(' ').filter(word => word.length > 0);
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    } else if (words.length >= 2) {
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  // Add useDialog hook to access the share link dialog
  const { setShareLinkOpen } = useDialog();

  // Add function to create and show share link for current meeting
  const handleCreateShareLink = () => {
    if (!id) {
      toast.error("No meeting ID available");
      return;
    }

    // Create a meeting object with current form data for sharing
    const meetingData = {
      meeting_id: id,
      name: residentName,
      address: residentAddress,
      post_code: postCode,
      repair_detail: repairDetails,
      target_time: targetTime,
      createdAt: new Date().toISOString(),
      recordings: recordings, // Using existing recordings array
      screenshots: [...existingScreenshots, ...screenshots.map((screenshot, index) => ({ id: `new-${index}`, url: screenshot }))]
    };

    // Open the share link dialog with meeting data
    setShareLinkOpen(true, meetingData);
  };

  // Add effect to handle client-side hydration right after state declarations
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Add loading guard to prevent hydration mismatch
  if (!isClient) {
    return (
      <div className="max-w-6xl mx-auto p-4 py-10 font-sans">
        <div className="flex items-center justify-center h-64">
        </div>
      </div>
    );
  }

  // Add function to handle time update and track progress
  const handleTimeUpdate = (recordingId, e) => {
    const video = e.target;
    if (video.duration) {
      const progress = (video.currentTime / video.duration) * 100;
      setVideoProgress(prev => ({
        ...prev,
        [recordingId]: progress
      }));
    }
  };
  
  // Add function to handle seeking when clicking on the progress bar
  const handleSeek = (recordingId, e) => {
    e.stopPropagation(); // Prevent video play/pause
    
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickPosition = e.clientX - rect.left;
    const percentage = clickPosition / rect.width;
    
    // Find the video element
    const videoContainer = document.querySelector(`[data-recording-id="${recordingId}"]`);
    if (videoContainer) {
      const video = videoContainer.querySelector('video');
      if (video && video.duration) {
        video.currentTime = video.duration * percentage;
      }
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto p-4 py-10 font-sans">
      {/* Maximized Item Modal */}
      {maximizedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={closeMaximized}
              className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Maximized Video */}
            {maximizedItem.type === 'video' && (
              <video
                src={maximizedItem.data.url}
                controls
                autoPlay
                className="max-w-full max-h-full w-auto h-auto object-contain"
                style={{
                  maxWidth: '95vw',
                  maxHeight: '95vh'
                }}
                onLoadedMetadata={(e) => {
                  // Video will automatically size based on its actual resolution
                  console.log('Video resolution:', e.target.videoWidth, 'x', e.target.videoHeight);
                }}
              />
            )}

            {/* Maximized Screenshot */}
            {maximizedItem.type === 'screenshot' && (
              <img
                src={maximizedItem.isExisting ? maximizedItem.data.url : maximizedItem.data}
                alt="Maximized screenshot"
                className="max-w-full max-h-full w-auto h-auto object-contain"
                style={{
                  maxWidth: '95vw',
                  maxHeight: '95vh'
                }}
                onLoad={(e) => {
                  console.log('Image resolution:', e.target.naturalWidth, 'x', e.target.naturalHeight);
                }}
              />
            )}
          </div>
        </div>
      )}

      <button onClick={startPeerConnection}>Start Peer Connection</button>
      <div className="gap-6" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr' }}>
        {/* Left Column */}
        <div className="space-y-6 flex gap-5">
          <div className="flex-1 relative">
            {/* Logo and User */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center">
                <a href="/" className="text-2xl font-bold text-gray-900 flex items-center">
                  <VideoIcon className="mr-2"/>
                  <span> Videodesk.co.uk</span>
                </a>
              </div>
            </div>

            {/* User Greeting */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full overflow-hidden">
                {getProfileImage() ? (
                  <img
                    src={getProfileImage()}
                    alt="Profile Image"
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-lg rounded-full">
                    {getInitials(getDisplayName())}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">Hello,</p>
                <p className="font-semibold">{getDisplayName()}</p>
              </div>
            </div>

            {/* Live Video */}
            <div className="relative w-[270px]">
              <div className="h-[480px] w-[270px] bg-gray-200 rounded-md overflow-hidden relative">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  controls={false}
                  className="w-full h-full object-contain absolute top-0 left-0" 
                  style={{
                    // Hide all video controls and UI elements during recording
                    ...(isRecording && {
                      pointerEvents: 'none',
                      outline: 'none',
                      border: 'none'
                    })
                  }}
                />
              </div>
              
              {/* Recording Timer Overlay - Shows during recording */}
              {isRecording && (
                <div className="absolute top-2 left-2 bg-red-600 text-white px-3 py-1 text-sm font-medium flex items-center gap-2 rounded-md">
                  <span className="w-3 h-3 rounded-full bg-white animate-pulse"></span>
                  <span>REC {formatRecordingTime(currentRecordingDuration)}</span>
                </div>
              )}
              
              <div 
                className="absolute top-2 left-2 bg-red-600 text-white px-3 py-1 text-sm font-medium"
                style={{ display: isRecording ? 'none' : 'block' }}
              >
                {isConnected ? "Live" : "Disconnected"}
              </div>
              <div 
                className="absolute bottom-2 left-[50%] -translate-x-[50%] text-white px-3 py-1 text-sm font-medium flex items-center gap-3"
                style={{ display: isRecording ? 'none' : 'flex' }}
              >
                <span className="w-4 h-4 rounded-full bg-red-600 block"></span>
                <span className="text-white text-lg">{isConnected ? formatTime(callDuration) : "0:00"}</span>
              </div>

              <div 
                className="absolute bottom-2 right-0 text-white px-3 py-1 text-sm font-medium flex items-center gap-3 flex-col"
                style={{ display: isRecording ? 'none' : 'flex' }}
              >
                <button className="p-1 rounded text-white cursor-pointer">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button className="p-1 rounded text-white cursor-pointer">
                  <ZoomOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="w-[270px] flex gap-2 mt-2">
              <button 
                onClick={handleRecordingToggle}
                disabled={!isConnected} 
                className={`disabled:opacity-50 flex items-center justify-center gap-2 font-medium py-4 rounded-md transition-colors flex-1 ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <span className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500' : 'bg-green-500'}`}></span>
                </span>
                {isRecording ? `Stop (${formatRecordingTime(currentRecordingDuration)})` : 'Recording'}
              </button>

              <button onClick={takeScreenshot} disabled={!isConnected} className="disabled:opacity-50 flex items-center justify-center gap-2 bg-orange-400 hover:bg-orange-500 text-white font-medium py-4 rounded-md transition-colors flex-1">
                <Maximize2 className="w-5 h-5" />
                Screenshot
              </button>
            </div>

          </div>

          <div className="flex-1 flex flex-col gap-10">
            {/* Resident Name Section */}
            <div className="">
              <label htmlFor="residentName" className="block text-lg font-medium mb-5">
                Resident Name :
              </label>
              <textarea
                id="residentName"
                value={residentName}
                onChange={(e) => setResidentName(e.target.value)}
                placeholder="Enter resident's name"
                rows={1}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            {/* Video Recording Section */}
            <div>
              <h2 className="text-lg font-medium mb-3">Video Recording :</h2>
              <div className="grid grid-cols-2 gap-3">
                {recordings.length === 0 && (
                  <h1>No recordings</h1>
                )}
                
                {recordings.map((recording) => (
                  <div key={recording.id} className="relative group">
                    <img src="/icons/ci_label.svg" className="mb-2" />
                    <div 
                      data-recording-id={recording.id}
                      className="aspect-square bg-gray-200 rounded-md overflow-hidden relative cursor-pointer"
                      onClick={(e) => {
                        const video = e.currentTarget.querySelector('video');
                        if (video.paused) {
                          video.play();
                        } else {
                          video.pause();
                        }
                      }}>
                      <video
                        src={recording.url}
                        controls={false}
                        muted
                        className="w-full h-full object-cover"
                        onPlay={() => setPlayingVideos(prev => new Set(prev).add(recording.id))}
                        onPause={() => setPlayingVideos(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(recording.id);
                          return newSet;
                        })}
                        onTimeUpdate={(e) => handleTimeUpdate(recording.id, e)}
                      />
                      
                      {/* Play icon - always visible on container */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <PlayIcon className="w-8 h-8 text-white/80 drop-shadow-md filter" />
                      </div>
                      
                      {/* Progress bar at the bottom */}
                      <div 
                        className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800 bg-opacity-50 cursor-pointer z-20"
                        onClick={(e) => handleSeek(recording.id, e)}
                      >
                        <div 
                          className="h-full bg-white" 
                          style={{ 
                            width: `${videoProgress[recording.id] || 0}%`,
                            transition: 'width 0.1s ease-out' // Add smooth animation
                          }}
                        ></div>
                      </div>

                      {/* Minimize/Maximize icons at top right corner, horizontal alignment */}
                      <div className="absolute top-2 right-2 flex flex-row gap-1 z-10">
                        <button 
                          className="p-1 hover:bg-black/20 rounded text-white"
                          title="Minimize"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Minimize2 className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1 hover:bg-black/20 rounded text-white"
                          title="Maximize"
                          onClick={(e) => {
                            e.stopPropagation();
                            maximizeVideo(recording);
                          }}
                        >
                          <Expand className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Action icons moved to bottom right corner, vertical alignment */}
                      <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-10">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            saveIndividualRecording(recording);
                          }}
                          className={`p-1 hover:bg-black/20 rounded text-white ${recording.isExisting ? 'opacity-50' : ''}`}
                          title={recording.isExisting ? "Already saved" : "Save recording"}
                          disabled={recording.isExisting}
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRecording(recording);
                          }}
                          className="p-1 hover:bg-black/20 rounded text-white"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Image Screenshot Section */}
            <div>
              <h2 className="text-lg font-medium mb-3">Image screenshot :</h2>
              <div className="grid grid-cols-2 gap-3">
                {
                  (existingScreenshots.length === 0 && screenshots.length === 0) && (
                    <h1>No screenshots</h1>
                  )
                }

                {/* Render existing screenshots first */}
                {existingScreenshots.map((screenshot, index) => (
                  <div key={`existing-${screenshot.id}`}>
                    <img src="/icons/ci_label.svg" className="mb-2" />
                    <div className="aspect-square bg-gray-200 rounded-md overflow-hidden flex items-center justify-center relative">
                      <div className="absolute top-2 right-2 flex flex-row gap-1 z-10">
                        <button className="p-1 hover:bg-black/20 rounded text-white">
                          <Minimize2 className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1 hover:bg-black/20 rounded text-white"
                          onClick={() => maximizeScreenshot(screenshot, index, true)}
                        >
                          <Expand className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Action icons for existing screenshots */}
                      <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-10">
                        <button className="p-1 hover:bg-black/20 rounded text-white opacity-50" disabled>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-black/20 rounded text-white opacity-50" disabled title="Already saved">
                          <Save className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteExistingScreenshot(screenshot)}
                          className="p-1 hover:bg-black/20 rounded text-white"
                          title="Delete screenshot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Existing Screenshot Image */}
                      <img
                        src={screenshot.url}
                        alt="existing screenshot"
                        className="w-full h-full object-cover absolute top-0 left-0 z-0 rounded-md"
                      />
                    </div>
                  </div>
                ))}

                {/* Render new screenshots from useWebRTC */}
                {screenshots.map((screenshot, index) => (
                  <div key={`new-${index}`} className="relative pencil-dropdown-container">
                    <img src="/icons/ci_label.svg" className="mb-2" />
                    <div className="aspect-square bg-gray-200 rounded-md overflow-hidden flex items-center justify-center relative">
                      {/* Minimize/Maximize icons - ALWAYS visible now */}
                      <div className="absolute top-2 right-2 flex flex-row gap-1 z-20">
                        <button className="p-1 hover:bg-black/20 rounded text-white">
                          <Minimize2 className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1 hover:bg-black/20 rounded text-white"
                          onClick={() => maximizeScreenshot(screenshot, index, false)}
                        >
                          <Expand className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Action icons for new screenshots - Always visible, never hide */}
                      <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-20">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePencilClick(`new-${index}`);
                          }}
                          className={`p-1 hover:bg-black/20 rounded text-white ${activePencilScreenshot === `new-${index}` ? 'bg-blue-500' : ''}`}
                          title="Drawing tools"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        
                        <button 
                          onClick={() => saveIndividualScreenshot(screenshot, index)}
                          className="p-1 hover:bg-black/20 rounded text-white"
                          title="Save screenshot"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteNewScreenshot(index)}
                          className="p-1 hover:bg-black/20 rounded text-white"
                          title="Delete screenshot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* New Screenshot Image */}
                      <img
                        src={screenshot}
                        alt="new screenshot"
                        className="w-full h-full object-cover absolute top-0 left-0 z-0 rounded-md"
                      />
                      
                      {/* Canvas overlay for drawing */}
                      {activePencilScreenshot === `new-${index}` && (
                        <canvas
                          ref={(canvas) => {
                            if (canvas && activePencilScreenshot === `new-${index}`) {
                              canvas.setAttribute('data-background', screenshot);
                              // Force save canvas state when initializing
                              setTimeout(() => {
                                initializeCanvas(canvas, screenshot, `new-${index}`);
                              }, 100);
                            }
                          }}
                          className="absolute top-0 left-0 w-full h-full z-10 cursor-crosshair"
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                        />
                      )}
                    </div>
                    
                    {/* Enhanced Pencil Tools Dropdown */}
                    {showPencilDropdown === `new-${index}` && (
                      <div className="absolute left-full top-0 ml-2 bg-white border border-gray-200 rounded-md shadow-lg p-3 min-w-[220px] z-30">
                        <div className="space-y-3">
                          {/* Line Width */}
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-2">Brush Size:</p>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={lineWidth}
                              onChange={(e) => setLineWidth(parseInt(e.target.value))}
                              className="w-full"
                            />
                            <div className="text-xs text-gray-500 text-center">{lineWidth}px</div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2 pb-2 border-b border-gray-200">
                            <button
                              onClick={() => clearCanvas(`new-${index}`)}
                              className="px-3 py-1 text-xs bg-red-100 text-red-600 rounded border hover:bg-red-200"
                              title="Clear all drawings"
                            >
                              🗑️ Clear
                            </button>
                          </div>
                          
                          {/* Colors Section */}
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-2">Colors:</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {colors.map((color) => (
                                <button
                                  key={color}
                                  onClick={() => setSelectedColor(color)}
                                  className={`w-6 h-6 rounded-full transition-transform border-2 hover:scale-110 ${
                                    selectedColor === color ? 'border-gray-800 scale-110' : 'border-gray-300'
                                  }`}
                                  style={{ backgroundColor: color }}
                                  title={`Select ${color}`}
                                />
                              ))}
                            </div>
                          </div>
                          
                          {/* Tools Section */}
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-2">Tools:</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {tools.map((tool) => (
                                <button
                                  key={tool.name}
                                  onClick={() => setSelectedTool(tool.name)}
                                  className={`w-8 h-8 flex items-center justify-center text-sm border rounded transition-transform hover:scale-105 ${
                                    selectedTool === tool.name 
                                      ? 'bg-blue-100 text-blue-700 border-blue-300' 
                                      : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                                  }`}
                                  title={tool.title}
                                >
                                  {tool.icon}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>


        {/* Right Column */}
        <div className="space-y-6">
          {/* Resident Information */}
          <div>
            <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-6">

              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">

                  <label htmlFor="residentAddress" className="block text-lg font-medium mb-2">
                    Resident Address :
                  </label>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className={"bg-amber-500 text-white rounded-3xl flex items-center gap-2 text-xl"}>Actions <img src="/icons/arrow-down.svg" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className={'bg-white border-none shadow-sm'}>
                      <DropdownMenuItem>
                        <button className='bg-none border-none cursor-pointer' onClick={handleLogout}>Logout</button>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <button className='bg-none border-none cursor-pointer' onClick={handleDashboard}>Dashboard</button>
                      </DropdownMenuItem>
                      <DropdownMenuItem>

                        <button className='bg-none border-none cursor-pointer' onClick={() => setTickerOpen(true)}>Raise Support Ticket</button>
                      </DropdownMenuItem>
                      <DropdownMenuItem><button className='bg-none border-none cursor-pointer' onClick={() => setResetOpen(true)}>Reset Password</button></DropdownMenuItem>
                      <DropdownMenuItem > <button className='bg-none border-none cursor-pointer' onClick={() => setInviteOpen(true)}>Invite Coworkers</button></DropdownMenuItem>
                      <DropdownMenuItem><button className='bg-none border-none cursor-pointer' onClick={() => setMessageOpen(true)}>Amend Message</button></DropdownMenuItem>
                      <DropdownMenuItem> <button className='bg-none border-none cursor-pointer text-left' onClick={() => setLandlordDialogOpen(true)}>Add Landlord Name/Logo/ <br />Profile Image </button></DropdownMenuItem>

                      <DropdownMenuItem > <button className='bg-none border-none cursor-pointer' onClick={() => setFaqOpen(true)}>FAQ's</button></DropdownMenuItem>
                      <DropdownMenuItem > <button className='bg-none border-none cursor-pointer' onClick={() => setFeedbackOpen(true)}>Give Feedback</button></DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                </div>
                <textarea
                  id="residentAddress"
                  value={residentAddress}
                  onChange={(e) => setResidentAddress(e.target.value)}
                  placeholder="Enter resident's address"
                  rows={1}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
            </div>
            <div className="mb-6">
              <textarea
                placeholder="Post code:"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300"
                rows={1}
              />
            </div>
            <div className="mb-6">
              <textarea
                id="postCode"
                value={postCode}
                onChange={(e) => setPostCode(e.target.value)}
                placeholder="Ref:"
                rows={1}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
          </div>

          {/* Repair Details */}
          <div>
            <label htmlFor="repairDetails" className="block text-lg font-medium mb-2">
              Repair details :
            </label>
            <textarea
              id="repairDetails"
              value={repairDetails}
              onChange={(e) => setRepairDetails(e.target.value)}
              placeholder="Description of repair"
              rows={5}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          {/* Target Time */}
          <div className="relative">
            <label htmlFor="targetTime" className="block text-lg font-medium mb-2">
              Target time :
            </label>
            <div className="flex items-start gap-2">
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full flex items-center justify-between p-3 bg-orange-100 rounded-md text-left"
                >
                  <span>{targetTime}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${showDropdown ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>


                {showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                    <ul>
                      <li
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setTargetTime("Emergency 24 Hours")
                          setShowDropdown(false)
                        }}
                      >
                        Emergency 24 Hours
                      </li>
                      <li
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setTargetTime("Urgent (7 Days)")
                          setShowDropdown(false)
                        }}
                      >
                        Urgent (7 Days)
                      </li>
                      <li
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setTargetTime("Routine (28 Days)")
                          setShowDropdown(false)
                        }}
                      >
                        Routine (28 Days)
                      </li>
                      <li
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setTargetTime("Follow Up Work")
                          setShowDropdown(false)
                        }}
                      >
                        Follow Up Work
                      </li>
                      <li
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setTargetTime("Other")
                          setShowDropdown(false)
                        }}
                      >
                        Other
                      </li>
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 items-end">
                
                <button
                  type="button"
                  onClick={(e) => handleSave(e)}
                  disabled={!isConnected && recordings.length === 0 && screenshots.length === 0}
                  className="w-full flex items-center justify-center p-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
                >
                  Save repair
                </button>
                <button className="p-2 bg-gray-100 rounded-md hover:bg-gray-200">
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Generate Link Button */}
          <button 
            onClick={handleCreateShareLink}
            className="w-full bg-orange-400 hover:bg-orange-500 text-white font-medium py-4 rounded-md transition-colors mt-8 mb-2 flex flex-col gap-1 items-center justify-center"
          >
            <span>Create Share Link</span>
            <span className="text-xs font-normal">to send to Contractor/Supplier or Co-workers</span>
          </button>
          <p className="text-center text-gray-600 mt-0 text-sm">(Copy and paste link to your job ticket or any system)</p>

          <div className="w-full flex items-center gap-4">
            <button onClick={handleDisconnect} disabled={!isConnected} className="bg-red-500 disabled:opacity-50 hover:bg-red-600 text-white font-medium py-4 rounded-md transition-colors flex-1 whitespace-pre">
              End Video <br /> (Without Saving)
            </button>
            <button 
              onClick={(e) => handleEndVideoAndSave(e)} 
              disabled={!isConnected && recordings.length === 0 && screenshots.length === 0} 
              className="bg-green-500 disabled:opacity-50 hover:bg-green-600 text-white font-medium py-4 rounded-md transition-colors flex-1 whitespace-pre"
            >
              End Video and <br />
              Save Images
            </button>
          </div>
        </div>
      </div>

      {/* Footer with token info indicator */}
      <div className="flex items-center justify-between mt-5">
        <p className="text-xs">
          User : {getDisplayName()} {isClient ? new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}, {isClient ? new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase() : ''}
        </p>
        {tokenLandlordInfo && (
          <p className="text-xs text-green-600">✓ Using profile info from video link</p>
        )}
      </div>
    </div>
  )
}