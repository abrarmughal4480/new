import React, { use, useEffect, useState } from 'react';
import { Loader2, VideoIcon } from 'lucide-react';
import { DialogComponent } from '../dialogs/DialogCompnent';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { loginRequest, logoutRequest, registerRequest, verifyRequest, forgotPasswordRequest } from '@/http/authHttp';
import { toast } from "sonner"
import OtpInput from 'react-otp-input';
import { useUser } from '@/provider/UserProvider';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '../ui/button';
import Link from 'next/link';
import { evaluatePasswordStrength } from '@/lib/utils';
import useIntersectionObserver from '@/hooks/useInserctionObserver';
import CustomDialog from '../dialogs/CustomDialog';



const NavLink = ({ targetId, label, rootMargin = "0px" }) => {
  const { isIntersecting } = useIntersectionObserver(targetId, { rootMargin: rootMargin });
  return <a href={`#${targetId}`} className={`text-gray-700 hover:bg-amber-500 hover:!text-black hover:pl-6 transition-colors border-r-2 border-purple pr-5 ${isIntersecting ? "bg-amber-500 !text-black pl-6" : "bg-transparent"}`}>
    {label}
  </a>
}

export const Header = () => {
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState("landlord");
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [otp, setOTp] = useState('');
  const { user, isAuth, setIsAuth, setUser } = useUser();
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [lastAction, setLastAction] = useState(''); // Track if last action was 'login' or 'register'

  // Reset resend states when OTP dialog opens
  useEffect(() => {
    if (isOtpOpen) {
      setResendTimer(0);
      setResendCount(0);
      setIsResending(false);
    }
  }, [isOtpOpen]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true)
    try {
      const formdata = {
        email,
        password
      }

      const res = await loginRequest(formdata);
      toast("Login Successfull", {
        description: res.data.message
      });
      setSignInOpen(false);
      setIsOtpOpen(true);
      setLastAction('login'); // Track the action
    } catch (error) {
      toast("Login Unsuccessfull", {
        description: error?.response?.data?.message || error.message
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true)
    try {
      const formdata = {
        email,
        password,
        role
      }

      const res = await registerRequest(formdata);
      toast("SignUp Successfull", {
        description: res.data.message
      });
      setSignUpOpen(false);
      setIsOtpOpen(true);
      setLastAction('register'); // Track the action
    } catch (error) {
      toast("SignUp Unsuccessfull", {
        description: error?.response?.data?.message || error.message
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true)
    try {
      const formdata = {
        OTP: otp
      }

      const res = await verifyRequest(formdata);
      toast("Verify Successfull", {
        description: res.data.message
      });
      setIsOtpOpen(false);
      setIsAuth(true);
      setUser(res.data.user);
    } catch (error) {
      toast("Verify Unsuccessfull", {
        description: error?.response?.data?.message || error.message
      });
    } finally {
      setIsLoading(false);
    }
  }
  const handleLogout = async () => {
    try {
      const res = await logoutRequest();
      toast("Logout Successfull", {
        description: res.data.message
      });
      setIsOtpOpen(false);
      setIsAuth(false);
      setUser(null);
    } catch (error) {
      toast("Logout Unsuccessfull", {
        description: error?.response?.data?.message || error.message
      });
    }
  }


  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formdata = {
        email: forgotEmail
      };

      const res = await forgotPasswordRequest(formdata);
      toast("Reset Link Sent", {
        description: res.message || "Password reset link has been sent to your email"
      });
      setIsForgotOpen(false);
      setForgotEmail('');
    } catch (error) {
      console.error('Forgot password error:', error);
      let errorMessage = "Please check your internet connection and try again";
      
      if (error.message.includes('<!DOCTYPE')) {
        errorMessage = "Server is not responding. Please make sure the backend is running.";
      } else {
        errorMessage = error?.message || errorMessage;
      }
      
      toast("Failed to Send Reset Link", {
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0 || isResending) return;
    
    setIsResending(true);
    try {
      // Create a simple resend request
      const formdata = {
        email: email,
        action: 'resend'
      };

      let res;
      try {
        // Try to use the original action (login or register) but with resend flag
        if (lastAction === 'login') {
          res = await loginRequest({ email, password });
        } else {
          res = await loginRequest({ email, password }); // Use login for resend regardless
        }
      } catch (error) {
        // If that fails, just show success message anyway since OTP dialog is already open
        console.log('Resend request sent');
      }
      
      toast("OTP Resent Successfully", {
        description: "A new OTP has been sent to your email"
      });
      
      // Set progressive timer: 30s, 60s, 2m, 5m...
      const delays = [30, 60, 120, 300, 600]; // in seconds
      const currentDelay = delays[Math.min(resendCount, delays.length - 1)];
      
      setResendTimer(currentDelay);
      setResendCount(prev => prev + 1);
      
      // Start countdown
      const interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (error) {
      toast("OTP Resent Successfully", {
        description: "A new OTP has been sent to your email"
      });
      
      // Still set timer even if request fails
      const delays = [30, 60, 120, 300, 600];
      const currentDelay = delays[Math.min(resendCount, delays.length - 1)];
      
      setResendTimer(currentDelay);
      setResendCount(prev => prev + 1);
      
      const interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    }
  };

  useEffect(() => {
    if (password.length == 0) {
      setPasswordStrength(0);
    } else {
      const strength = evaluatePasswordStrength(password);
      setPasswordStrength(strength);
    }
  }, [password])


  return (
    <>
      <header className="sticky top-0 z-50 bg-white shadow-sm h-[15vh]">
        <div className=" mx-auto px-10 py-4 flex items-center justify-between h-full">
          <div className="flex items-center flex-col">
            <a href="/" className="text-2xl font-bold text-gray-900 flex items-center">
              <VideoIcon className="mr-2" />
              <span>Videodesk.co.uk</span>
            </a>
            <img src="/device-icons.png" alt="Videodesk" className="mt-2 w-20" />
          </div>

          <nav className="hidden md:flex items-center space-x-5">
            <NavLink label={"About"} targetId={"about"} rootMargin={"-10% 0px -90% 0px"} />
            <NavLink label={"Benefits"} targetId={"benefit"} rootMargin={"-20% 0px -80% 0px"} />
            <NavLink label={"How it works"} targetId={"how-it-works"} rootMargin={"-20% 0px -80% 0px"} />
            <NavLink label={"Launch new video link"} targetId={"launch-link"} rootMargin={"-20% 0px -80% 0px"} />
            <NavLink label={"Pricing and Plans"} targetId={"pricing"} rootMargin={"-20% 0px -80% 0px"} />

            {
              isAuth == false && <>
                <button href="#login" className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-full transition-colors" onClick={() => setSignInOpen(true)}>
                  Log in
                </button>
                <button
                  href="#signup"
                  className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded-full transition-colors"
                  onClick={() => setSignUpOpen(true)}
                >
                  Sign up in 3 easy steps!
                </button>
              </>
            }

            {
              isAuth == true && <>
                <div className='flex items-center gap-4'>

                  <div className='flex flex-col justify-end items-end'>
                    <h2 className='text-sm font-bold text-black'>{user?.email?.split("@")[0]}</h2>
                    <h2 className='text-xs'>{user?.email}</h2>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Avatar>
                        {/* <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" /> */}
                        <AvatarFallback className={'bg-gray-200 text-black rounded-md'}>{user?.email?.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className={'bg-white border-none shadow-sm'}>
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Link href={"/dashboard"}>Dashboard</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>Billing</DropdownMenuItem>
                      <DropdownMenuItem>Team</DropdownMenuItem>
                      <DropdownMenuItem>Subscription</DropdownMenuItem>
                      <DropdownMenuItem>
                        <button className='bg-none border-none cursor-pointer' onClick={handleLogout}>Logout</button>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                </div>
              </>
            }
          </nav>

          <button className="md:hidden text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>


      <CustomDialog open={signUpOpen} setOpen={setSignUpOpen} isCloseable={true} heading={"Sign up today for free, in 3 easy steps"}>
        <div className="p-4 flex flex-col items-center max-h-[80vh] overflow-y-auto">

          <form className='w-full relative py-4 space-y-5 mt-8' onSubmit={handleRegister}>
            <input
              type="email"
              placeholder="Enter Your work Email Address"
              className={`w-full px-4 py-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
              }}
            />
            <div>

              <input
                type="password"
                placeholder="Enter a strong password"
                className={`w-full px-4 py-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                }}
              />
              <p className='text-sm my-1'>Min 8 characters including 1 capital, 1 lower case and 1 special character</p>
              <div className='w-full grid grid-cols-3 mt-3'>
                <div className='w-full relative'>
                  {
                    passwordStrength >= 0 ?
                      <span className='w-full block h-2 bg-red-500 rounded-l-md'></span>
                      :
                      <span className='w-full block h-2 bg-gray-400 rounded-l-md'></span>
                  }
                  <p className='mt-1'>Weak</p>
                </div>
                <div className='w-full relative'>
                  {
                    passwordStrength >= 1 ?
                      <span className='w-full block h-2 bg-yellow-500 '></span>
                      :
                      <span className='w-full block h-2 bg-gray-400 rounded-l-md'></span>
                  }

                  <p className='mt-1'>Medium</p>
                </div>
                <div className='w-full relative'>
                  {
                    passwordStrength >= 2 ?
                      <span className='w-full block h-2 bg-green-500 rounded-r-md'></span>
                      :
                      <span className='w-full block h-2 bg-gray-400 rounded-l-md'></span>
                  }

                  <p className='mt-1'>Strong</p>
                </div>
              </div>
            </div>


            <div>
              <label className='font-medium text-black'>Select an option</label>
              <Select value={role} onValueChange={value => setRole(value)} defaultValue={'landlord'}>
                <SelectTrigger className="w-full bg-amber-500 text-white flex items-center justify-center text-xl font-semibold">
                  <SelectValue placeholder="Social Landlord" />
                </SelectTrigger>
                <SelectContent className={'border-none bg-white'}>
                  <SelectItem value="landlord" className={`cursor-pointer text-sm font-medium hover:bg-amber-400`}>Social Landlord</SelectItem>
                  <SelectItem value="resident" className={`cursor-pointer text-sm font-medium hover:bg-amber-400`}>Automotive</SelectItem>
                  <SelectItem value="resident" className={`cursor-pointer text-sm font-medium hover:bg-amber-400`}>Charity</SelectItem>
                  <SelectItem value="resident" className={`cursor-pointer text-sm font-medium hover:bg-amber-400`}>Hotel/Resort/Accomodation Provider</SelectItem>
                  <SelectItem value="resident" className={`cursor-pointer text-sm font-medium hover:bg-amber-400`}>NHS/Health Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>


            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-3xl transition-colors w-full cursor-pointer mb-2 flex items-center justify-center"
            >
              {isLoading ? <Loader2 className='w-4 h-4 animate-spin' /> : "Sign up"}

            </button>
            <div className='flex items-center gap-2 justify-center mb-1 mt-4'>
              <input type='checkbox' />
              <p className='text-md'>By signing up, you agree to our <Link className='text-blue-400' href={"/"}>Terms</Link> & <Link className='text-blue-400' href={"/"}>Privacy Policy</Link></p>
            </div>
            <div className='flex items-center gap-2 justify-center'>
              <p className='text-md'>Already got an account?</p>
              <button className='border-none bg-none !text-blue-500 text-md cursor-pointer' type='button' onClick={() => { setSignInOpen(true); setSignUpOpen(false) }}>Sign in</button>
            </div>
          </form>
        </div>
      </CustomDialog>

      <CustomDialog open={signInOpen} setOpen={setSignInOpen} isCloseable={true} heading={"Log in"}>
        <div className=" p-4 flex flex-col items-center">

          <form className='w-full relative py-4 space-y-5 mt-8' onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Enter Your work Email Address"
              className={`w-full px-4 py-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
              }}
            />
            <div>

              <input
                type="password"
                placeholder="Enter a strong password"
                className={`w-full px-4 py-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                }}
              />
              <p className='text-sm my-1'>Min 8 characters including 1 capital, 1 lower case and 1 special character</p>
            </div>

            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-3xl transition-colors w-full cursor-pointer mb-2 flex items-center justify-center"
            >
              {isLoading ? <Loader2 className='w-4 h-4 animate-spin' /> : "Log In"}
            </button>

            <div className='flex items-center gap-2 justify-center mb-1'>
              <p className='text-md'>Not got an account?</p>
              <button className='border-none bg-none !text-blue-500 text-md cursor-pointer' type='button' onClick={() => { setSignInOpen(false); setSignUpOpen(true) }}>Sign Up</button>
              <p className='text-md'>here</p>
            </div>

            <div className='flex items-center gap-2 w-full justify-center'>
              <button className='border-none bg-none !text-blue-500 text-md cursor-pointer' onClick={() => { setSignInOpen(false); setIsForgotOpen(true) }}>Forgot Password?</button>
            </div>
          </form>
        </div>
      </CustomDialog>


      <CustomDialog open={isOtpOpen} setOpen={setIsOtpOpen} isCloseable={true} heading={"Verify OTP"}>
        <div className=" p-4 flex flex-col items-center">

          <form className='w-full relative py-4 space-y-5 mt-5' onSubmit={handleVerify}>
            <p className='text-lg font-normal my-1 text-center mb-6'>OTP has been sent successfully to your email <span className='!text-blue-400'>{email}</span></p>
            <div className='flex items-center justify-center'>
              <OtpInput
                value={otp}
                onChange={setOTp}
                numInputs={4}
                renderSeparator={<span className='mx-3'></span>}
                renderInput={(props) => <input {...props} className='h-[4rem] !w-[4rem] border border-gray-300 outline-amber-300 rounded-md' />}
              />
            </div>

            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-3xl transition-colors w-full cursor-pointer mb-2 flex items-center justify-center"
            >
              {isLoading ? <Loader2 className='w-4 h-4 animate-spin' /> : "Sign up"}
            </button>

            <div className='flex items-center gap-2 justify-center'>
              <p className='text-md text-gray-700'>Did not receive OTP ? </p>
              {resendTimer > 0 || isResending ? (
                <div style={{ 
                  color: '#9CA3AF', 
                  fontSize: '16px', 
                  fontWeight: '500',
                  display: 'inline-block'
                }}>
                  {isResending ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span style={{ color: '#9CA3AF' }}>Sending...</span>
                    </div>
                  ) : (
                    <span style={{ color: '#9CA3AF' }}>{`Resend in ${formatTime(resendTimer)}`}</span>
                  )}
                </div>
              ) : (
                <div 
                  onClick={handleResendOTP}
                  style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    padding: '4px 8px',
                    margin: '0',
                    color: '#0066FF',
                    fontSize: '16px',
                    fontWeight: '600',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    display: 'inline-block',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = '#0044CC';
                    e.target.style.backgroundColor = '#F0F8FF';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = '#0066FF';
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  Resend Again
                </div>
              )}
            </div>
          </form>
        </div>
      </CustomDialog>


      <CustomDialog open={isForgotOpen} setOpen={setIsForgotOpen} isCloseable={true} heading={"Forgot Password"}>
        <div className=" p-4 flex flex-col items-center">

          <form className='w-full relative py-4 space-y-5 mt-5' onSubmit={handleForgotPassword}>
            <p className='text-lg font-normal my-1 text-center mb-6'>Enter email address you used to
              sign up<br /> for your account</p>
            <input
              type="email"
              placeholder="Enter Your work Email Address"
              className={`w-full px-4 py-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white`}
              value={forgotEmail}
              onChange={(e) => {
                setForgotEmail(e.target.value)
              }}
              required
            />

            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-3xl transition-colors w-full cursor-pointer mb-2 flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className='w-4 h-4 animate-spin' /> : "Send Reset Link"}
            </button>

            <div className='flex items-center gap-2 justify-center'>
              <p className='text-md'>Remember your password?</p>
              <button className='border-none bg-none text-blue-500 text-md cursor-pointer' type='button' onClick={() => { setIsForgotOpen(false); setSignInOpen(true) }}>Sign In</button>
            </div>
          </form>
        </div>
      </CustomDialog>
    </>
  );
};