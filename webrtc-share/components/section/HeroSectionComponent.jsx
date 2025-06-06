'use client'
import React, { useState, useEffect } from 'react';

export const HeroSection = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      id: 1,
      backgroundImage: "url('/hero-section-bg.png')",
      content: (
        <div className="mx-auto relative z-10 min-h-[85vh] px-10 flex flex-col justify-center items-start">
          <div className="max-w-2xl ml-14 mt-35">
            <div className='mb-4'>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Videodesk.co.uk</h1>
              <p className="text-lg font-normal">
                Connect inbound or outbound customer service calls with <br />
                instant video links and see what your customers see <br />
                in real time
              </p>
            </div>
            
            <div className='flex gap-2 items-center mt-10'>
              <a
                href="#how-it-works"
                className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-medium py-3 px-8 rounded-full text-lg transition-all transform hover:scale-105"
              >
                How it works
              </a>
              <a
                href="#signup"
                className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-medium py-3 px-8 rounded-full text-lg transition-all transform hover:scale-105"
              >
                Sign up in 3 easy steps!
              </a>
            </div>
          </div>
          <span id="about" className='absolute bottom-20'></span>
        </div>
      )
    },
    {
      id: 2,
      backgroundImage: "url('/slide-2-bg.png')",
      content: (
        <div className="mx-auto relative z-10 px-10 flex flex-col justify-start pt-5">
          
        </div>
      )
    },
    {
      id: 3,
      backgroundImage: "url('/slide-3-bg.png')",
      content: (
        <div className="mx-auto relative z-10 h-[85vh] flex flex-row ">
          
        </div>
      )
    }
  ];

  useEffect(() => {
    const autoPlay = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 7000);

    return () => clearInterval(autoPlay);
  }, [slides.length]);

  return (
    <>
      <section className="relative bg-gray-800 text-white min-h-[85vh] overflow-hidden">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out bg-cover bg-center ${
              index === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            style={{
              backgroundImage: slide.backgroundImage.startsWith('url') ? slide.backgroundImage : '',
              backgroundSize: slide.id === 2 ? "100% auto" : "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: slide.id === 2 ? "bottom" : "center"
            }}
          >
            {slide.content}
          </div>
        ))}

        <div className="flex space-x-2 mt-12 absolute bottom-10 left-[50%] -translate-x-[50%] z-20">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveSlide(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                activeSlide === index ? 'bg-amber-500' : 'bg-gray-300 bg-opacity-50'
              }`}
            />
          ))}
        </div>
      </section>
    </>
  );
};