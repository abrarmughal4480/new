"use client"
import { Button } from '@/components/ui/button'
import React, { useState, use, useRef, useEffect } from 'react'
import { PhoneCall, Monitor, Video, Loader2 } from 'lucide-react'
import { DialogComponent } from '@/components/dialogs/DialogCompnent'
import Image from 'next/image'
import useWebRTC from '@/hooks/useWebRTC'
import { io } from "socket.io-client"
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'

const page = ({params}) => {
  const {id} = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [profileData, setProfileData] = useState({});
  const [redirectUrl, setRedirectUrl] = useState('');
  const [isTailoredUrl, setIsTailoredUrl] = useState(false);
  const [showRedirectDialog, setShowRedirectDialog] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const videoRef = useRef(null);
  const notificationSocketRef = useRef(null);
  const {localStream, remoteStream, socket, socketConnection, handleDisconnect, startPeerConnection} = useWebRTC(false, id, videoRef);
  
  // Extract profile data and redirect URL from URL parameters
  useEffect(() => {
    try {
      const landlordName = searchParams.get('landlordName');
      const profileImage = searchParams.get('profileImage');
      const landlordLogo = searchParams.get('landlordLogo');
      const redirectUrlParam = searchParams.get('redirectUrl');
      const tokenLandlordInfo = searchParams.get('tokenLandlordInfo');
      
      // Parse tokenLandlordInfo if available
      let parsedTokenInfo = null;
      if (tokenLandlordInfo) {
        try {
          parsedTokenInfo = JSON.parse(tokenLandlordInfo);
        } catch (e) {
          console.warn('Failed to parse tokenLandlordInfo:', e);
        }
      }
      
      // Get redirect URL from URL params or tokenLandlordInfo
      let finalRedirectUrl = redirectUrlParam;
      if (!finalRedirectUrl && parsedTokenInfo?.redirectUrl) {
        finalRedirectUrl = parsedTokenInfo.redirectUrl;
      }
      
      console.log('👤 Room [id] loaded with profile data:', {
        id: id,
        landlordName: landlordName,
        hasProfileImage: !!profileImage,
        hasLandlordLogo: !!landlordLogo,
        redirectUrl: finalRedirectUrl
      });
      
      setProfileData({
        landlordName: landlordName,
        profileImage: profileImage,
        landlordLogo: landlordLogo
      });
      
      // Get current domain for comparison
      const currentDomain = window.location.hostname;
      console.log('🌐 Current domain:', currentDomain);
      
      // Auto-detect default URL based on current frontend URL
      const frontendUrl = window.location.origin;
      const defaultRedirectUrl = frontendUrl; // Use current frontend URL as default
      
      // Check if URL is tailored or default
      const isCurrentDomain = finalRedirectUrl && (
        finalRedirectUrl.includes(currentDomain) ||
        finalRedirectUrl === 'www.videodesk.co.uk' || 
        finalRedirectUrl === 'videodesk.co.uk' ||
        finalRedirectUrl === frontendUrl ||
        finalRedirectUrl.trim() === 'www.' ||
        finalRedirectUrl.trim() === ''
      );
      
      const isDefault = !finalRedirectUrl || isCurrentDomain;
      
      setIsTailoredUrl(!isDefault);
      
      if (isDefault || isCurrentDomain) {
        // Default URL or same domain - don't redirect, just stay on current site
        setRedirectUrl('');
        console.log('🔗 Same domain or default - no redirect needed');
      } else {
        // Tailored URL - direct redirect
        let formattedUrl = finalRedirectUrl;
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
          formattedUrl = `https://${formattedUrl}`;
        }
        setRedirectUrl(formattedUrl);
        console.log('🔗 Using tailored redirect URL (will redirect):', formattedUrl);
      }
    } catch (error) {
      console.error('Error extracting profile data:', error);
      setProfileData({
        landlordName: null,
        profileImage: null,
        landlordLogo: null
      });
      setRedirectUrl('');
      setIsTailoredUrl(false);
    }
  }, [searchParams, id]);
  
  // Notify admin when user opens the link
  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const socketUrl = backendUrl.replace('/api/v1', '');
    
    // Create separate socket for notifications
    notificationSocketRef.current = io(socketUrl, {
      reconnectionAttempts: 3,
      timeout: 5000,
      transports: ['websocket'],
    });

    notificationSocketRef.current.on('connect', () => {
      console.log('📡 Room notification socket connected');
      // Notify that user has opened this room
      notificationSocketRef.current.emit('user-opened-link', id);
    });

    return () => {
      if (notificationSocketRef.current) {
        notificationSocketRef.current.disconnect();
      }
    };
  }, [id]);
  
  const handleStrt = () => {
    try {
      setOpen(false);
      startPeerConnection();
      
      // Notify admin that user has accepted and started the session
      if (notificationSocketRef.current) {
        notificationSocketRef.current.emit('user-started-session', id);
      }
    } catch (error) {
      console.error('Error starting peer connection:', error);
    }
  }

  const handleVideoCallEnd = () => {
    try {
      console.log('🔚 Video call ending...');
      handleDisconnect();
      
      if (isTailoredUrl && redirectUrl) {
        // Tailored URL - redirect immediately without loader
        console.log('🔗 Direct redirect to tailored URL:', redirectUrl);
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 500);
      } else {
        // Default URL or same domain - just close the video call, no redirect
        console.log('🔗 No redirect needed - staying on current domain');
        // Optional: You could show a "Thank you" message instead
        setTimeout(() => {
          // Just refresh the page or go to home
          window.location.href = '/';
        }, 1000);
      }
    } catch (error) {
      console.error('Error ending video call:', error);
      // Fallback - go to home page
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    }
  }

  return (
    <>
      <div className='w-[100vw] h-[100vh] relative overflow-hidden'>
        <video ref={videoRef} autoPlay className="w-full h-full object-cover absolute top-0 left-0" />

        {
          !open && (
            <Button onClick={handleVideoCallEnd} className='absolute bottom-40 right-[50%] translate-x-[50%] text-white bg-red-400 rounded-md hover:bg-red-600 cursor-pointer text-xl'>
              End Video Call
            </Button>
          )
        }
      </div>

      <DialogComponent open={open} setOpen={setOpen}>
        <div className="max-h-[90vh] w-[350px] p-3 flex flex-col items-center justify-center gap-3 overflow-y-auto pb-6">
          
          {/* Paper Plane Image - Always show */}
          <Image src="/paper-plane.svg" alt="video-link-dialog-bg" className='object-contain pb-4 pt-2' width={150} height={150} />

          {/* Landlord Logo - Show below paper plane if available */}
          {profileData.landlordLogo && (
            <div className="flex justify-center -mt-2 pt-3">
              <img 
                src={profileData.landlordLogo} 
                alt="Landlord Logo" 
                className="max-h-12 max-w-[150px] object-contain" 
                onError={(e) => {
                  console.error('Failed to load landlord logo:', profileData.landlordLogo);
                  e.target.style.display = 'none';
                }}
                onLoad={() => {
                  console.log('✅ Landlord logo loaded successfully in room [id]');
                }}
              />
            </div>
          )}

          {/* Landlord Name or Videodesk Default */}
          <h2 className="text-xl font-bold mt-2 text-center pb-3">
            {profileData.landlordName ? (
              <span className="text-xl font-bold">{profileData.landlordName}</span>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Video className="w-6 h-6 text-gray-700" />
                <span className="text-xl font-bold">Videodesk</span>
              </div>
            )}
          </h2>

          <button className='bg-green-600 hover:bg-green-700 text-white font-medium py-3 cursor-pointer rounded-full mt-4 text-lg w-[90%] outline-none transition-colors' onClick={handleStrt}>
            Tap to allow video <br/> session now
          </button>

          {/* Device Icons - moved up */}
          <img src="/device-icons.png" alt="Videodesk" className="w-30 mt-2" />

          {/* Videodesk Heading - moved down */}
          <h3 className="text-2xl font-bold text-black pt-6 pb-6">Videodesk</h3>
          
          {/* Show redirect info if available and tailored */}
          {isTailoredUrl && redirectUrl && (
            <p className="text-xs text-gray-500 text-center mt-2">
              After the call, you'll be redirected to {redirectUrl.replace('https://', '').replace('http://', '')}
            </p>
          )}
        </div>
      </DialogComponent>
    </>
  )
}

export default page