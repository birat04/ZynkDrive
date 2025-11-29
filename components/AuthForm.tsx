"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useState } from "react"

const formSchema = z.object({
  username: z.string().min(5, "Username must be at least 5 characters").max(50, "Username must be less than 50 characters"),
  fullName: z.string().min(5, "Full name must be at least 5 characters").optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type FormType = "sign-in" | "sign-up"

const AuthForm = ({type}: {type: FormType}) => {
    const [isLoading, setIsLoading] = useState(false)  
    const [errorMessage, setErrorMessage] = useState("")
      
    const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      password: "",
    },
  })
 
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true)
      setErrorMessage("")
      // TODO: Implement authentication logic
    console.log(values)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  };

  return (
    <>
   <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="auth-form">
        <h1 className="form-title">
          {type === "sign-in" ? "Sign In" : "Sign Up"}
        </h1>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
                <div className="shad-form-item">
                <FormLabel className="shad-form-label">Username</FormLabel>
              <FormControl>
                  <Input placeholder="Enter your username" className="shad-input" {...field} />
              </FormControl>
                </div>
              <FormMessage className="shad-form-message"/>
            </FormItem>
          )}
        />
        {type === "sign-up" && (
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <div className="shad-form-item">
                  <FormLabel className="shad-form-label">Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your full name" className="shad-input" {...field} />
                  </FormControl>
                </div>
                <FormMessage className="shad-form-message"/>
              </FormItem>
            )}
          />
        )}
        {type === "sign-up" && (
          <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
                <div className="shad-form-item">
                <FormLabel className="shad-form-label">Email</FormLabel>
              <FormControl>
                    <Input type="email" placeholder="Enter your email" className="shad-input" {...field} />
              </FormControl>
                </div>
                <FormMessage className="shad-form-message"/>
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="shad-form-item">
                <FormLabel className="shad-form-label">Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Enter your password" className="shad-input" {...field} />
                </FormControl>
              </div>
              <FormMessage className="shad-form-message"/>
            </FormItem>
          )}
        />
        <Button className="form-submit-button" type="submit" disabled={isLoading}>
            {type === "sign-in" ? "Sign In" : "Sign Up"}
        {isLoading && (
            <Image src="/assets/icons/loader.svg" alt="loader" width={24} height={24} priority className="ml-2 animate-spin"/>
        )}
        </Button>
        {errorMessage && (
            <p className="error-message">*{errorMessage}</p>
        )}
      </form>
    </Form>
  </>
  )
  
}

export default AuthForm
