"use client"
import React from 'react';
import { MessageCircle, Search, Languages, DollarSign, Users, CircleOffIcon, LanguagesIcon, SearchIcon, Video, VideoIcon, SearchCheck } from 'lucide-react';
import { TypeAnimation } from 'react-type-animation';


const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className="flex flex-col items-center text-center p-6">
      <div className="w-16 h-16 rounded-full bg-purple flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-bold mb-2 text-lg whitespace-pre">{title.split("").map((cha, index) => (
        <React.Fragment key={index}>
          {
            cha == "|" ? <br /> : `${cha}`
          }
        </React.Fragment>
      ))}</h3>
      <p className="text-gray-600 whitespace-pre">{description.split("").map((cha, index) => (
        <React.Fragment key={index}>
          {
            cha == "|" ? <br /> : `${cha}`
          }
        </React.Fragment>
      ))}</p>
    </div>
  );
};

export const FeaturesSection = () => {
  const features = [
    {
      icon: <img src="/icons/video-icons.png" />,
      title: "Make conversations | faster and easier",
      description: "See what your | customers see"
    },
    {
      icon: <img src="/icons/majesticons_search.png" />,
      title: "Diagnose faults | 3x faster",
      description: "Get visual | confirmation of issues"
    },
    {
      icon: <img src="/icons/tabler_clock-filled.png" />,
      title: "Reduce service calls and | improve first-time resolution",
      description: "Save time and money with | accurate diagnostics"
    },
    {
      icon: <img src="/icons/fa-solid_user-friends.png" />,
      title: "Guide your customers | with live video",
      description: "Communicate with | clarity and precision"
    },
    {
      icon: <img src="/icons/fluent_record-12-regular.png" />,
      title: "Record videos and | images your way",
      description: "Record whats on your | screen instantly"
    },
    {
      icon: <img src="/icons/diagnose-icon.png" />,
      title: "Capture and share crucial | information visually",
      description: "Collaborate and solve | problems faster"
    },
    {
      icon: <img src="/icons/lang-icon.png" />,
      title: "Support vulnerable | customers ",
      description: "Visual communication | bridges language barriers"
    },
    {
      icon: <img src="/icons/video-icons.png" />,
      title: "Goodbye long | messages",
      description: "Say hello to videos | and screenshots"
    }
  ];

  return (
    <section className="py-16 bg-white relative overflow-hidden min-h-screen" id="benefit" >
      <div className='w-[12rem] h-[12rem] bg-purple text-white flex items-end justify-center p-2 rotate-[-40deg] absolute -top-[7rem] -left-[6rem] -z-0'>
        <h1 className='text-xl'>Benefits</h1>
      </div>
      <div className="container mx-auto px-4">
        <div className="min-h-[6rem] flex items-center justify-center mb-12">
          <h2 className="text-3xl font-bold text-center max-w-6xl mx-auto">
            <TypeAnimation
              sequence={[
                'Connect, engage and support your customers \nwith instant video links',
                25000,
                "",
                500
              ]}
              wrapper="span"
              speed={300}
              style={{ fontSize: '30px', display: 'inline-block', whiteSpace: 'pre-line' }}
              repeat={Infinity}
            />
          </h2>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
        <div className="flex justify-center items-center flex-col mt-8">
          <img src="/devices.svg" alt="Videodesk" className="w-60 mb-2" />
          <h2 className="text-3xl font-bold mb-12 text-center text-black">Connect. Engage. Support.</h2>
        </div>
      </div>
    </section>
  );
};