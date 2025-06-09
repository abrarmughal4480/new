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
  const [isDefaultRedirectUrl, setIsDefaultRedirectUrl] = useState(true);
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
      
      // Get redirect URL and default flag from tokenLandlordInfo
      let finalRedirectUrl = redirectUrlParam;
      let isDefault = true;
      
      if (parsedTokenInfo) {
        if (parsedTokenInfo.redirectUrl) {
          finalRedirectUrl = parsedTokenInfo.redirectUrl;
        }
        if (parsedTokenInfo.hasOwnProperty('isDefaultRedirectUrl')) {
          isDefault = parsedTokenInfo.isDefaultRedirectUrl;
        }
      }
      
      console.log('👤 Room [id] loaded with profile data:', {
        id: id,
        landlordName: landlordName,
        hasProfileImage: !!profileImage,
        hasLandlordLogo: !!landlordLogo,
        redirectUrl: finalRedirectUrl,
        isDefaultRedirectUrl: isDefault
      });
      
      setProfileData({
        landlordName: landlordName,
        profileImage: profileImage,
        landlordLogo: landlordLogo
      });
      
      setIsDefaultRedirectUrl(isDefault);
      
      if (!isDefault && finalRedirectUrl) {
        // Tailored URL - prepare for redirect
        let formattedUrl = finalRedirectUrl;
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
          formattedUrl = `https://${formattedUrl}`;
        }
        setRedirectUrl(formattedUrl);
        console.log('🔗 Using tailored redirect URL (will redirect):', formattedUrl);
      } else {
        // Default URL - no redirect
        setRedirectUrl('');
        console.log('🔗 Default URL - no redirect needed');
      }
    } catch (error) {
      console.error('Error extracting profile data:', error);
      setProfileData({
        landlordName: null,
        profileImage: null,
        landlordLogo: null
      });
      setRedirectUrl('');
      setIsDefaultRedirectUrl(true);
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
      
      if (!isDefaultRedirectUrl && redirectUrl) {
        // Tailored URL - redirect to feedback page with redirect URL
        console.log('🔗 Will redirect to feedback page with tailored URL after 22 seconds:', redirectUrl);
        setTimeout(() => {
          window.location.href = `/?show-feedback=true&redirectUrl=${encodeURIComponent(redirectUrl)}`;
        }, 22000);
      } else {
        // Default URL - redirect to feedback page after 22 seconds
        console.log('🔗 Default URL - redirecting to feedback page after 22 seconds');
        setTimeout(() => {
          window.location.href = '/?show-feedback=true';
        }, 22000);
      }
    } catch (error) {
      console.error('Error ending video call:', error);
      // Fallback - go to home page after 22 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 22000);
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
          {!isDefaultRedirectUrl && redirectUrl && (
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