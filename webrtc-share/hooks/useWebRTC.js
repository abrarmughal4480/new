import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";


const peerConfig = {
    iceTransportPolicy: "relay",
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun.l.google.com:5349" },
        { urls: "stun:stun1.l.google.com:3478" },
        { urls: "stun:stun1.l.google.com:5349" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:5349" },
        { urls: "stun:stun3.l.google.com:3478" },
        { urls: "stun:stun3.l.google.com:5349" },
        { urls: "stun:stun4.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:5349" },
        {
          urls: "turn:relay1.expressturn.com:3480",
          username: "174776437859052610",
          credential: "ZKziYTYdi6V/oRdHNuUn/INQkq4=",
        },
        {
          urls: "turn:relay1.expressturn.com:3480?transport=tcp",
          username: "174776437859052610",
          credential: "ZKziYTYdi6V/oRdHNuUn/INQkq4=",
        }
    ]
}

const useWebRTC = (isAdmin, roomId, videoRef) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [socket, setSocket] = useState(null);
    const socketConnection = useRef(null);
    const peerConnectionRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [screenshots, setScreenshots] = useState([]);
    const [recordings, setRecordings] = useState([]);
    const [recordingActive, setRecordingActive] = useState(false);
    const mediaRecorderRef = useRef(null);
    const mediaRecordingChunks = useRef([]);
    const localStreamRef = useRef(null);
    const [showVideoPlayError, setShowVideoPlayError] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const socketUrl = backendUrl.replace('/api/v1', '');
        
        socketConnection.current = io(socketUrl, {
            reconnectionAttempts: 5,
            timeout: 10000,
            transports: ['websocket'],
        });

        socketConnection.current.on('connect', () => {
           socketConnection.current.emit('join-room', roomId);

           if(isAdmin) {
            startPeerConnection();
           }
        });
    }, [roomId, isAdmin]);

    const getUserMedia = async () => {
        try {
            //choose back camera
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment",
                    width: {
                        ideal: 1280
                    },
                    height: {
                        ideal: 720
                    }
                },
                audio: false,

            });
            setLocalStream(stream);
            localStreamRef.current = stream;
            videoRef.current.srcObject = stream;
            videoRef.current.play();
        } catch (error) {
            console.error('Error getting user media:', error);
        }
    }


    const createDummyVideoTrack = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
    
        const context = canvas.getContext("2d");
        context.fillStyle = "black";
        context.fillRect(0, 0, canvas.width, canvas.height);
    
        const stream = canvas.captureStream(30); // 30 FPS
        return stream;
    };
    

    // useEffect(() => {
    //     if(!isAdmin) {
    //         getUserMedia();
    //     }
    // },[]);


    const createRTCPeerConnection = () => {
        if(peerConnectionRef.current) {
            try {
                peerConnectionRef.current.close();
            } catch (error) {
                console.error('Error closing peer connection:', error);
            }
        }

        const peerConnection = new RTCPeerConnection(peerConfig);

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socketConnection.current.emit('ice-candidate', event.candidate, roomId);
            }
        }

        if(!isAdmin) {
            localStreamRef.current.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStreamRef.current);
            });
        }else{
            const stream = createDummyVideoTrack();
            stream.getTracks().forEach(track => {
                peerConnection.addTrack(track, stream);
            });
        }
        
        peerConnection.ontrack = (event) => {
            if(!isAdmin) return;
            setRemoteStream(event.streams[0]);
            videoRef.current.srcObject = event.streams[0];
            videoRef.current.play().then(() => {
                setIsConnected(true);
            }).catch((error) => {
                setIsConnected(true);
                setShowVideoPlayError(true);
            });
        }

        peerConnection.onnegotiationneeded = async () => {
            try {
                
            } catch (error) {
                console.error('Error creating offer:', error);
            }
        }

        peerConnection.onicecandidateerror = (error) => {
            // Only log if there's meaningful error information
            if (error && (error.errorCode || error.errorText || error.url)) {
                console.error('ICE candidate error:', {
                    errorCode: error.errorCode,
                    errorText: error.errorText,
                    url: error.url
                });
            }
            // ICE candidate errors are often normal during connection establishment
            // so we don't need to take any action here
        }

        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state changed:', peerConnection.iceConnectionState);
            if(peerConnection.iceConnectionState == "disconnected"){
                setIsConnected(false);
                if(!isAdmin) {
                    router.push('/');
                }
            }
        }
        
        peerConnection.onicegatheringstatechange = () => {
            console.log('ICE gathering state changed:', peerConnection.iceGatheringState);
        }

        return peerConnection;
        
    }

    const handleVideoPlay = () => {
        videoRef.current.play();
        setIsConnected(true);
        setShowVideoPlayError(false);
    }

    const startPeerConnection = async () => {
        try {
            if(!isAdmin) {
                await getUserMedia();
            }
            const peerConnection = createRTCPeerConnection();
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socketConnection.current.emit('offer', offer, roomId);
            console.log('Offer sent');

            peerConnectionRef.current = peerConnection;
        } catch (error) {
            console.error('Error starting peer connection:', error);
        }
    }

  


    const handleOffer = async (offer) => {
        console.log('handleOffer');
        try {
            const peerConnection = createRTCPeerConnection();
            peerConnectionRef.current = peerConnection;
            await peerConnectionRef.current.setRemoteDescription(offer);
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            socketConnection.current.emit('answer', answer, roomId);
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }


   

    const handleAnswer = async (answer) => {
        console.log('handleAnswer');
        try {
            await peerConnectionRef.current.setRemoteDescription(answer);
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }
    
    const handleIceCandidate = async (candidate) => {
        console.log('handleIceCandidate');
        try {
            await peerConnectionRef.current.addIceCandidate(candidate);
        } catch (error) {
            console.error('Error handling ice candidate:', error);
        }
    }

    const handleDisconnect = () => {
        try {
            socketConnection.current.emit('user-disconnected', roomId);
            setIsConnected(false);
            peerConnectionRef.current.close();
            localStream?.getTracks().forEach(track => track.stop());
            if(remoteStream) {
                remoteStream.getTracks().forEach(track => track.stop());
            }
            if(!isAdmin) {
                router.push('/?show-feedback=true');
            }
        } catch (error) {
            console.error('Error disconnecting:', error);
        }
    }

    const handleUserDisconnected = () => {
        setIsConnected(false);
        if(!isAdmin) {
            router.push('/?show-feedback=true');
        }
    }

    //setup listeners for incoming offers
    useEffect(() => {
        socketConnection.current.on('offer', handleOffer);
        socketConnection.current.on('answer', handleAnswer);
        socketConnection.current.on('ice-candidate', handleIceCandidate);
        socketConnection.current.on('user-disconnected', handleUserDisconnected);

        return () => {
            socketConnection.current.off('offer', handleOffer);
            socketConnection.current.off('answer', handleAnswer);
            socketConnection.current.off('ice-candidate', handleIceCandidate);
            socketConnection.current.off('user-disconnected', handleUserDisconnected);
        }
    }, [isAdmin,roomId]);

    const takeScreenshot = () => {
        if (!remoteStream) return;
        
        try {
            // Get source video dimensions from the track settings
            const videoTrack = remoteStream.getVideoTracks()[0];
            const settings = videoTrack ? videoTrack.getSettings() : { width: 1280, height: 720 };
            
            // Use higher resolution - either from stream or default to 4K
            const width = settings.width || 3840;
            const height = settings.height || 2160;
            
            // Create a video element to capture the frame
            const video = document.createElement('video');
            video.srcObject = remoteStream;
            video.muted = true; // Prevent audio feedback
            
            // Create a ultra high-resolution canvas (4x resolution for extreme quality)
            const canvas = document.createElement('canvas');
            canvas.width = width * 4;  // Increased from 2x to 4x resolution
            canvas.height = height * 4;
            const ctx = canvas.getContext('2d');
            
            // Apply advanced image quality settings
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.filter = 'contrast(1.05) saturate(1.05)'; // Slightly enhance contrast and color
            
            video.onloadedmetadata = () => {
                video.play();
                
                // Add a slight delay to ensure the frame is fully rendered
                setTimeout(() => {
                    // Draw with proper scaling to maintain aspect ratio
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    
                    // Generate maximum quality PNG
                    const screenshot = canvas.toDataURL('image/png', 1.0);
                    setScreenshots((prev) => [screenshot, ...prev]);
                    
                    // Clean up
                    video.pause();
                    video.srcObject = null;
                }, 200); // Increased delay for better frame capture
            };
        } catch (error) {
            console.error('Error taking high-quality screenshot:', error);
        }
    };
      
    const takeRecording = () => {
        if (!remoteStream) return;
        
        if (!recordingActive) {
            // Define ultra-high quality options for MediaRecorder
            const options = {
                mimeType: 'video/webm;codecs=vp9,opus', // VP9 provides best quality/size ratio
                videoBitsPerSecond: 8000000, // Increased to 8 Mbps for higher quality
                audioBitsPerSecond: 192000   // Increased to 192 kbps for better audio
            };
            
            // Try to use the highest quality video constraints possible
            try {
                const videoTrack = remoteStream.getVideoTracks()[0];
                if (videoTrack) {
                    const capabilities = videoTrack.getCapabilities();
                    // Apply highest possible constraints if supported by browser
                    if (capabilities) {
                        const constraints = {};
                        
                        // Set highest possible resolution
                        if (capabilities.width && capabilities.width.max) {
                            constraints.width = capabilities.width.max;
                        }
                        
                        if (capabilities.height && capabilities.height.max) {
                            constraints.height = capabilities.height.max;
                        }
                        
                        // Set higher framerate for smoother video (30fps)
                        if (capabilities.frameRate && capabilities.frameRate.max) {
                            constraints.frameRate = Math.min(capabilities.frameRate.max, 30);
                        }
                        
                        videoTrack.applyConstraints(constraints)
                            .then(() => console.log('Applied higher quality constraints:', constraints))
                            .catch(err => console.log('Could not apply quality constraints:', err));
                    }
                }
            } catch (err) {
                console.log('Error setting track constraints:', err);
            }
            
            // Fall back to other codecs if VP9 is not supported
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm;codecs=vp8,opus';
                // Still use high bitrate for VP8
                options.videoBitsPerSecond = 6000000; 
                
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options.mimeType = 'video/webm';
                    options.videoBitsPerSecond = 4000000; // Fallback but still good quality
                    
                    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                        // Final fallback - use default
                        options.mimeType = '';
                    }
                }
            }
            
            setRecordingActive(true);
            mediaRecordingChunks.current = [];
            
            try {
                const mediaRecorder = new MediaRecorder(remoteStream, options);
                
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        mediaRecordingChunks.current.push(event.data);
                    }
                };
                
                // Request data more frequently for better recovery if connection drops
                mediaRecorder.start(500); // Reduced from 1000ms to 500ms for more frequent chunks
                mediaRecorderRef.current = mediaRecorder;
                
                console.log('Recording started with high quality options:', options);
            } catch (error) {
                console.error('Error starting high-quality recording:', error);
                setRecordingActive(false);
                
                // Try again with default options but still aim for decent quality
                try {
                    const mediaRecorder = new MediaRecorder(remoteStream, {
                        videoBitsPerSecond: 2500000 // Still provide some bitrate guidance
                    });
                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data && event.data.size > 0) {
                            mediaRecordingChunks.current.push(event.data);
                        }
                    };
                    
                    mediaRecorder.start(500);
                    mediaRecorderRef.current = mediaRecorder;
                    setRecordingActive(true);
                    console.log('Recording started with fallback quality options');
                } catch (innerError) {
                    console.error('Failed to start recording even with fallback options:', innerError);
                    toast?.error?.('Failed to start recording');
                }
            }
        } else {
            // Stop recording
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
                
                mediaRecorderRef.current.onstop = () => {
                    if (mediaRecordingChunks.current.length > 0) {
                        const recordingBlob = new Blob(mediaRecordingChunks.current, { 
                            type: mediaRecorderRef.current.mimeType || 'video/webm' 
                        });
                        
                        const recordingUrl = URL.createObjectURL(recordingBlob);
                        setRecordings(prev => [recordingUrl, ...prev]);
                        mediaRecordingChunks.current = [];
                    }
                    setRecordingActive(false);
                };
            } else {
                setRecordingActive(false);
            }
        }
    };

    // Add function to delete a screenshot at specific index
    const deleteScreenshot = (index) => {
        setScreenshots(prev => {
            const newScreenshots = [...prev];
            newScreenshots.splice(index, 1);
            return newScreenshots;
        });
    };

    return {
        localStream,
        remoteStream,
        socket,
        socketConnection,
        handleDisconnect,
        startPeerConnection,
        isConnected,
        screenshots,
        recordings,
        recordingActive,
        takeScreenshot,
        takeRecording,
        handleVideoPlay,
        showVideoPlayError,
        deleteScreenshot  // Export the new function
    }
}

export default useWebRTC;