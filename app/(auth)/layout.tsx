import React from 'react'
import Image from 'next/image'

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className='flex min-h-screen'>
      <section className='bg-brand p-10 flex-[1.3] flex flex-col justify-between'>
        <div>
          <div className="flex items-center space-x-4 mb-10 mt-16">
            <Image 
              src="/assets/icons/logo-full.svg"
              alt="logo" 
              width={224} 
              height={82} 
              className='h-auto'
            />
            <span className="text-white font-bold text-[65px] leading-[65px]">
              ZynkDrive
            </span>
          </div>
          <div className='space-y-5 text-white mb-8'>
            <h1 className='h1'>Manage your files with ease</h1>
            <p className='body-1'>
              ZynkDrive is a free and open-source file manager that allows you to manage your files and folders in a simple and intuitive way.
            </p>
          </div>
        </div>
        <div className="flex justify-center">
          <Image
            src="/assets/images/files.png"
            alt="files"
            width={342}
            height={342}
            className='transition-all hover:rotate-2 hover:scale-105'
          />
        </div>
      </section>
      <section className='flex flex-1 flex-col items-center bg-white p-4 py-10 lg:justify-center lg:p-10 lg:py-0'>
        <div className='mb-16 lg:hidden'>
          <Image  
            src="/assets/icons/logo-full-brand.svg"
            alt="logo"
            width={224}
            height={82}
            className='h-auto w-[200px] lg:w-[250px]'
          />
        </div>
        {children}
      </section>
    </div>
  )
}

export default Layout