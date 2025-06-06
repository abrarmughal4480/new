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
        // Create a hidden video element
        const video = document.createElement('video');
        video.srcObject = remoteStream;
        video.width = remoteStream.getVideoTracks()[0].getSettings().width || 640;
        video.height = remoteStream.getVideoTracks()[0].getSettings().height || 480;
      
        // Ensure the video is ready before taking the screenshot
        video.onloadedmetadata = () => {
          video.play(); // Start the video to render the frame
          
          // Create a canvas and draw the video frame
          const canvas = document.createElement('canvas');
          canvas.width = video.width;
          canvas.height = video.height;
          
          // Draw the current frame to the canvas
          canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Generate the image URL and save it to the state
          const screenshot = canvas.toDataURL('image/png');
          setScreenshots((prev) => [screenshot,...prev]);
          
          // Clean up the video element after the screenshot
          video.pause();
          video.srcObject = null;
        };
    };
      

    const takeRecording = () => {
        if(!recordingActive) {
            
            setRecordingActive(true);
            const mediaRecorder = new MediaRecorder(remoteStream);
            mediaRecorder.ondataavailable = (event) => {
                if(event.data.size > 0) {
                    mediaRecordingChunks.current.push(event.data);
                }
            }
            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;
        } else {
            setRecordingActive(false);
            mediaRecorderRef.current.stop();
            const recordingBlob = new Blob(mediaRecordingChunks.current, { type: 'video/webm' });
            const recordingUrl = URL.createObjectURL(recordingBlob);
            setRecordings(prev => [recordingUrl, ...prev]);
            mediaRecordingChunks.current = [];
        }
    }

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
        showVideoPlayError
    }
}

export default useWebRTC;
