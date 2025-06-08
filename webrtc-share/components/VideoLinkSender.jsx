"use client"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, XIcon } from "lucide-react"
import { toast } from "sonner"
import axios from "axios"
import Link from "next/link"
import Image from "next/image"
import { io } from "socket.io-client"
import { useUser } from "@/provider/UserProvider"
import CustomDialog from "@/components/dialogs/CustomDialog"

export default function VideoLinkSender({ isOpen, onClose, onSuccess }) {
  const { user, isAuth } = useUser();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contactMethod, setContactMethod] = useState('email');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lastTypingTime, setLastTypingTime] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isManualSelection, setIsManualSelection] = useState(false);
  const [linkAccepted, setLinkAccepted] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const phoneInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const socketRef = useRef(null);

  // Socket connection for real-time updates
  useEffect(() => {
    if (dialogOpen && token) {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const socketUrl = backendUrl.replace('/api/v1', '');
      
      socketRef.current = io(socketUrl, {
        reconnectionAttempts: 5,
        timeout: 10000,
        transports: ['websocket'],
      });

      socketRef.current.on('connect', () => {
        console.log('📡 VideoLinkSender connected to socket');
        setSocketConnected(true);
        socketRef.current.emit('admin-waiting', token);
      });

      socketRef.current.on('user-joined-room', (roomToken) => {
        console.log('✅ User opened the link:', roomToken);
        if (roomToken === token) {
          setLinkAccepted(true);
          toast.success("User has opened the video link!");
        }
      });

      socketRef.current.on('disconnect', () => {
        console.log('📡 VideoLinkSender disconnected from socket');
        setSocketConnected(false);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [dialogOpen, token]);

  // Cleanup socket on component unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Auto-focus switching logic
  useEffect(() => {
    let focusTimer;

    if (isOpen && !isManualSelection) {
      focusTimer = setInterval(() => {
        const currentTime = Date.now();
        if (!isTyping && currentTime - lastTypingTime > 3000) {
          if (contactMethod === 'phone') {
            emailInputRef.current?.focus();
            setContactMethod('email');
          } else {
            phoneInputRef.current?.focus();
            setContactMethod('phone');
          }
        }
      }, 3000);
    }

    return () => {
      clearInterval(focusTimer);
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, [isOpen, isTyping, lastTypingTime, contactMethod, isManualSelection]);

  const handleInputChange = (value, type) => {
    setIsTyping(true);
    setLastTypingTime(Date.now());
    
    if (type === 'phone') {
      setPhone(value);
      setContactMethod('phone');
    } else {
      setEmail(value);
      setContactMethod('email');
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  // Helper functions for user data
  const isValidImageUrl = (url) => {
    if (!url) return false;
    return url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://');
  };

  const getProfileImage = () => {
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

  const getLandlordLogo = () => {
    if (user?.landlordInfo?.landlordLogo && isValidImageUrl(user.landlordInfo.landlordLogo)) {
      return user.landlordInfo.landlordLogo;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isAuth == false) {
      toast("Please Login First");
      return
    }

    setIsLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      const profileData = {
        number: phone,
        email: email
      };
      
      if (user?.landlordInfo?.landlordName) {
        profileData.landlordName = user.landlordInfo.landlordName;
      }
      
      const landlordLogoUrl = getLandlordLogo();
      if (landlordLogoUrl) {
        profileData.landlordLogo = landlordLogoUrl;
      }
      
      const profileImageUrl = getProfileImage();
      if (profileImageUrl) {
        profileData.profileImage = profileImageUrl;
      }
      
      // Add redirect URL logic
      let redirectUrl = ''; // Empty means use current frontend URL
      if (user?.landlordInfo?.redirectUrlTailored && user?.landlordInfo?.redirectUrlTailored.trim() !== 'www.') {
        redirectUrl = user.landlordInfo.redirectUrlTailored;
        console.log('🔗 Using tailored redirect URL:', redirectUrl);
      } else if (user?.landlordInfo?.redirectUrlDefault && user?.landlordInfo?.redirectUrlDefault.trim() !== '') {
        redirectUrl = user.landlordInfo.redirectUrlDefault;
        console.log('🔗 Using custom default redirect URL:', redirectUrl);
      } else {
        // Use current frontend URL as default
        redirectUrl = window.location.origin;
        console.log('🔗 Using current frontend URL as default:', redirectUrl);
      }
      
      profileData.tokenLandlordInfo = {
        landlordName: user?.landlordInfo?.landlordName || null,
        landlordLogo: landlordLogoUrl,
        profileImage: profileImageUrl,
        useLandlordLogoAsProfile: user?.landlordInfo?.useLandlordLogoAsProfile || false,
        profileShape: user?.landlordInfo?.profileShape || 'circle',
        redirectUrl: redirectUrl
      };
      
      const queryParams = new URLSearchParams();
      
      if (profileData.number) queryParams.append('number', profileData.number);
      if (profileData.email) queryParams.append('email', profileData.email);
      if (profileData.landlordName) queryParams.append('landlordName', profileData.landlordName);
      if (profileData.landlordLogo) queryParams.append('landlordLogo', profileData.landlordLogo);
      if (profileData.profileImage) queryParams.append('profileImage', profileData.profileImage);
      if (redirectUrl) queryParams.append('redirectUrl', redirectUrl);
      if (profileData.tokenLandlordInfo) {
        queryParams.append('tokenLandlordInfo', JSON.stringify(profileData.tokenLandlordInfo));
      }
      
      console.log('🚀 Sending video link with redirect URL:', redirectUrl);
      
      const res = await axios.get(`${backendUrl}/send-token?${queryParams.toString()}`);
      
      setToken(res.data.token);
      setDialogOpen(true);
      setLinkAccepted(false);
      
      toast.success("Video link sent with your profile information!");
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(res.data.token);
      }
    } catch (error) {
      console.error('Error sending token:', error);
      toast.error("Failed to send video link. Please try again.");
    } finally {
      setIsLoading(false);
      setIsManualSelection(false);
    }
  };

  const handleClose = () => {
    setPhone('');
    setEmail('');
    setIsManualSelection(false);
    onClose();
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setToken('');
    setLinkAccepted(false);
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Form Modal */}
      <div className="h-screen w-screen bg-black/10 absolute top-0 left-0 right-0 bottom-0 px-16 flex items-center justify-center z-50">
        <div className="mx-auto bg-white rounded-xl shadow-md p-8 relative overflow-hidden">
          <h3 className="text-xl font-semibold mb-6 text-center">
            Enter your customer's mobile number or email address below to send an instant video link
          </h3>

          <button
            onClick={handleClose}
            aria-label="Close"
            className="text-gray-500 hover:text-gray-800 absolute top-3 right-3 cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>

          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <input
                ref={phoneInputRef}
                type="text"
                placeholder="Enter customer mobile number"
                className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 ${contactMethod === 'phone' ? 'bg-white' : 'bg-gray-100'}`}
                value={phone}
                onChange={(e) => handleInputChange(e.target.value, 'phone')}
                onClick={() => {
                  setContactMethod('phone');
                  setIsManualSelection(true);
                }}
              />
            </div>

            <div className="self-center">
              <span className="text-gray-500">or</span>
            </div>

            <div className="flex-1 w-full">
              <input
                ref={emailInputRef}
                type="email"
                placeholder="Enter customer email address"
                className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 ${contactMethod === 'email' ? 'bg-white' : 'bg-gray-100'}`}
                value={email}
                onChange={(e) => handleInputChange(e.target.value, 'email')}
                onClick={() => {
                  setContactMethod('email');
                  setIsManualSelection(true);
                }}
              />
            </div>

            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {isLoading ? <Loader2 className='w-4 h-4 animate-spin' /> : <>Send<br />video link</>}
            </button>
          </form>
        </div>
      </div>

      {/* Success Dialog */}
      <CustomDialog open={dialogOpen} setOpen={handleDialogClose} heading={"Link sent successfully"}>
        <div className="h-[33rem] p-16 flex flex-col items-center justify-center">
          <Image src="/paper-plane.svg" alt="video-link-dialog-bg" className='object-contain' width={200} height={200} />
          <div className='mt-5'>
            <div className='flex items-start gap-2'>
              <img className='w-8 h-8' src='/icons/single-check.svg' />
              <div className='flex flex-col gap-0 mb-1'>
                <h2 className="text-2xl font-bold text-left">
                  Link sent successfully
                </h2>
                <p>Please wait a second for user to open and accept link...</p>
              </div>
            </div>
            
            <div className={`flex items-start gap-2 mt-5 transition-opacity duration-500 ${linkAccepted ? 'opacity-100' : 'opacity-30'}`}>
              <img 
                className={`w-8 h-8 transition-all duration-500 ${linkAccepted ? 'filter-none' : 'grayscale'}`} 
                src='/icons/double-check.svg' 
              />
              <div className='flex flex-col gap-0 mb-1'>
                <h2 className={`text-2xl font-bold text-left transition-colors duration-500 ${linkAccepted ? 'text-green-600' : 'text-gray-400'}`}>
                  {linkAccepted ? 'Link accepted by user' : 'Waiting for user to open link...'}
                </h2>
              </div>
            </div>

            <Link 
              href={`/room/admin/${token}`} 
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 cursor-pointer h-12 rounded-3xl mt-10 text-2xl block w-full text-center transition-all duration-300"
            >
              Join Video Session
            </Link>

            <div className='flex items-start mt-4 justify-center'>
              <p className='text-center'>
                <strong className='text-red-400 whitespace-pre'>Tip - </strong> 
                Ask the user to check their spam folder for the email link, if they can't see it!
              </p>
            </div>
          </div>
        </div>
      </CustomDialog>
    </>
  );
}
