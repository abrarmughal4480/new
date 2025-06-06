"use client"
import { Header } from '@/components/layouts/HeaderComponent'
import { HeroSection } from '@/components/section/HeroSectionComponent'
import { AboutSection } from '@/components/section/AboutSectionComponents'
import { FeaturesSection } from '@/components/section/FeatureSectionComponent'
import { HowItWorksSection } from '@/components/section/HowItsWorkSectionComponent'
import { LaunchLinkSection } from '@/components/section/LunchLinkSectionComponent'
import { Footer } from '@/components/layouts/FooterComponent'
import React, { useState, useEffect, Suspense } from 'react'
import { DialogComponent } from '@/components/dialogs/DialogCompnent'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { StarIcon } from 'lucide-react'
import PriceAndPlan from '@/components/section/PriceAndPlanSectionComponent'
import SendFriendSectionComponent from '@/components/section/SendFriendSectionComponent'

const FeedbackDialog = () => {
  const [showFeedback, setShowFeedback] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const feedbackParam = searchParams.get("show-feedback");
    setShowFeedback(!!feedbackParam);
  }, [searchParams]);

  return (
    <DialogComponent open={showFeedback} setOpen={() => router.push("/")} isCloseable={true}>
      <div className="h-[33rem] p-4 flex flex-col items-center justify-center">
        <Image src="/paper-plane.svg" alt="video-link-dialog-bg" className='object-contain' width={150} height={150} />
        <h2 className="text-xl font-bold mt-10 text-center">
          Thank you for joining the video session. 
          The link has now ended.
        </h2>
        <h2 className="text-xl font-bold text-center mt-5">
          How was it?
        </h2>
        
        <div className='flex items-center justify-center mt-8 gap-2'>
          <StarIcon className='w-10 h-10 text-yellow-500' />
          <StarIcon className='w-10 h-10 text-yellow-500' />
          <StarIcon className='w-10 h-10 text-yellow-500' />
          <StarIcon className='w-10 h-10 text-yellow-500' />
          <StarIcon className='w-10 h-10 text-yellow-500' />
        </div>
        <Image src="/device-icons.png" alt="Videodesk" className="mt-10" width={200} height={50} />
      </div>
    </DialogComponent>
  );
};

const Page = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header/>
      <HeroSection />
      <AboutSection />
      <FeaturesSection />
      <HowItWorksSection />
      <LaunchLinkSection />
      <PriceAndPlan/>
      <SendFriendSectionComponent/>
      <Footer />

      <Suspense fallback={null}>
        <FeedbackDialog />
      </Suspense>
    </div>
  )
}

export default Page